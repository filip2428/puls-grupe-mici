import "server-only";

import { and, eq } from "drizzle-orm";
import webpush from "web-push";

import { db } from "@/lib/db";
import { abonamentePush } from "@/lib/db/schema";
import { adresaAplicatiei } from "@/lib/email";

/**
 * Notificările care ajung pe telefon (Web Push).
 *
 * Cum funcționează, pe scurt: browserul liderului cere o „adresă de livrare”
 * de la Google / Apple / Mozilla și ne-o dă nouă. Noi trimitem mesajul acolo,
 * criptat cu cheile browserului, iar serviciul respectiv îl duce pe telefon
 * chiar dacă aplicația e închisă.
 *
 * Se configurează din două variabile de mediu, generate cu `npm run chei:push`:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY - o vede și browserul, e publică
 *   VAPID_PRIVATE_KEY            - rămâne doar pe server
 *
 * Fără ele, aplicația merge normal - notificările se văd în aplicație și pe
 * email, doar că nu sună telefonul.
 *
 * De reținut pentru iPhone: notificările merg doar dacă aplicația a fost pusă
 * pe ecranul principal (iOS 16.4+). În Safari, ca pagină obișnuită, nu.
 */

export function pushConfigurat(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

/** Cheia publică, de dat browserului când se abonează. */
export function cheiePublica(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

/**
 * Cine trimite. Serviciile de livrare cer un mod de a ne contacta dacă ceva nu
 * e în regulă, iar biblioteca acceptă doar `mailto:` sau `https:` - de aia nu
 * putem folosi pur și simplu adresa aplicației, care local e `http://`.
 */
function expeditor(): string {
  const email =
    process.env.EMAIL_EXPEDITOR?.match(/<([^>]+)>/)?.[1] ??
    (process.env.EMAIL_EXPEDITOR?.includes("@")
      ? process.env.EMAIL_EXPEDITOR
      : undefined);
  if (email) return `mailto:${email.trim()}`;

  const adresa = adresaAplicatiei();
  if (adresa.startsWith("https://")) return adresa;

  // Rămâne cazul de pe calculatorul tău (http://localhost). Nu contează cui
  // scrie serviciul de livrare acolo, doar să fie o adresă validă.
  const gazda = adresa.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  return `mailto:puls@${gazda || "localhost"}`;
}

let pregatit = false;
function pregateste() {
  if (pregatit) return;
  webpush.setVapidDetails(
    expeditor(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  pregatit = true;
}

/** Ce trimite browserul când se abonează. */
export type AbonamentBrowser = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function abonamentValid(x: unknown): x is AbonamentBrowser {
  if (typeof x !== "object" || x === null) return false;
  const a = x as Record<string, unknown>;
  const chei = a.keys as Record<string, unknown> | undefined;
  return (
    typeof a.endpoint === "string" &&
    a.endpoint.startsWith("https://") &&
    a.endpoint.length < 1000 &&
    typeof chei?.p256dh === "string" &&
    typeof chei?.auth === "string"
  );
}

/**
 * Reține telefonul liderului.
 *
 * Aceeași adresă poate să reapară (browserul o refolosește după ce omul se
 * dezabonează și se abonează la loc), iar atunci doar o mutăm pe liderul care
 * e logat acum - contează cine folosește telefonul, nu cine l-a folosit ieri.
 */
export async function salveazaAbonament(
  liderId: number,
  abonament: AbonamentBrowser,
  descriere?: string | null,
): Promise<void> {
  await db
    .insert(abonamentePush)
    .values({
      liderId,
      endpoint: abonament.endpoint,
      cheieP256dh: abonament.keys.p256dh,
      cheieAuth: abonament.keys.auth,
      descriere: descriere?.slice(0, 120) ?? null,
    })
    .onConflictDoUpdate({
      target: abonamentePush.endpoint,
      set: {
        liderId,
        cheieP256dh: abonament.keys.p256dh,
        cheieAuth: abonament.keys.auth,
        descriere: descriere?.slice(0, 120) ?? null,
      },
    });
}

/** Liderul nu mai vrea notificări pe telefonul ăsta. */
export async function stergeAbonament(
  liderId: number,
  endpoint: string,
): Promise<void> {
  await db
    .delete(abonamentePush)
    .where(
      and(
        eq(abonamentePush.liderId, liderId),
        eq(abonamentePush.endpoint, endpoint),
      ),
    );
}

/** Câte telefoane are liderul abonate. */
export async function abonamenteleMele(liderId: number) {
  return db
    .select()
    .from(abonamentePush)
    .where(eq(abonamentePush.liderId, liderId));
}

export type MesajPush = {
  titlu: string;
  mesaj: string;
  link?: string | null;
  /** Ca două notificări despre același lucru să nu se adune pe ecran. */
  eticheta?: string;
};

export type RezultatPush = {
  trimise: number;
  /** Abonamente moarte (aplicație ștearsă, notificări refuzate) - le-am curățat. */
  sterse: number;
  esuate: number;
};

/**
 * Trimite un mesaj pe toate telefoanele unui lider.
 *
 * Dacă serviciul de livrare zice că adresa nu mai există (404 / 410), ștergem
 * abonamentul: n-are rost să încercăm zilnic la un telefon care nu mai ascultă.
 */
export async function trimitePush(
  liderId: number,
  mesaj: MesajPush,
): Promise<RezultatPush> {
  const rezultat: RezultatPush = { trimise: 0, sterse: 0, esuate: 0 };
  if (!pushConfigurat()) return rezultat;

  const abonamente = await abonamenteleMele(liderId);
  if (abonamente.length === 0) return rezultat;

  try {
    pregateste();
  } catch {
    // Chei greșite sau expeditor invalid: notificarea rămâne în aplicație.
    rezultat.esuate = abonamente.length;
    return rezultat;
  }

  const continut = JSON.stringify({
    titlu: mesaj.titlu,
    mesaj: mesaj.mesaj,
    link: mesaj.link ?? "/setari",
    eticheta: mesaj.eticheta ?? mesaj.titlu,
  });

  for (const a of abonamente) {
    try {
      await webpush.sendNotification(
        {
          endpoint: a.endpoint,
          keys: { p256dh: a.cheieP256dh, auth: a.cheieAuth },
        },
        continut,
        { TTL: 60 * 60 * 24 },
      );
      await db
        .update(abonamentePush)
        .set({ ultimaFolosire: new Date() })
        .where(eq(abonamentePush.id, a.id));
      rezultat.trimise++;
    } catch (eroare) {
      const cod = (eroare as { statusCode?: number }).statusCode;
      if (cod === 404 || cod === 410) {
        await db.delete(abonamentePush).where(eq(abonamentePush.id, a.id));
        rezultat.sterse++;
      } else {
        rezultat.esuate++;
      }
    }
  }

  return rezultat;
}
