"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { scrieAudit } from "@/lib/audit";
import { ceruteLider } from "@/lib/auth/sesiune";
import { db } from "@/lib/db";
import { lideri, notificari } from "@/lib/db/schema";
import { emailValid } from "@/lib/email";
import { marcheazaToateCitite } from "@/lib/notificari";
import {
  abonamentValid,
  pushConfigurat,
  salveazaAbonament,
  stergeAbonament,
  trimitePush,
} from "@/lib/push";

export type StareSetari = { eroare?: string; reusit?: boolean };

/**
 * Setările liderului: adresa de email și ce vrea să afle pe ea.
 * Fiecare lider își schimbă doar propriile setări.
 */
export async function salveazaSetari(
  _stare: StareSetari,
  formData: FormData,
): Promise<StareSetari> {
  const lider = await ceruteLider();

  const email = String(formData.get("email") ?? "").trim();
  if (email && !emailValid(email)) {
    return { eroare: "Adresa de email nu pare corectă." };
  }
  if (email.length > 120) return { eroare: "Adresa de email e prea lungă." };

  await db
    .update(lideri)
    .set({
      email: email || null,
      notifZileNastere: formData.get("notifZileNastere") === "da",
      notifSlujiri: formData.get("notifSlujiri") === "da",
      notifPrezenta: formData.get("notifPrezenta") === "da",
      notifRezumat: formData.get("notifRezumat") === "da",
    })
    .where(eq(lideri.id, lider.id));

  await scrieAudit(lider.id, "setari:salvate", { areEmail: Boolean(email) });
  revalidatePath("/setari");
  return { reusit: true };
}

/** Marchează toate notificările ca citite. */
export async function citesteTot() {
  const lider = await ceruteLider();
  await marcheazaToateCitite(lider.id);
  revalidatePath("/setari");
}

/** Șterge o notificare. Fiecare lider umblă doar la ale lui. */
export async function stergeNotificare(notificareId: number) {
  const lider = await ceruteLider();
  await db
    .delete(notificari)
    .where(
      and(eq(notificari.id, notificareId), eq(notificari.liderId, lider.id)),
    );
  revalidatePath("/setari");
}

/** Golește lista de notificări. */
export async function stergeToateNotificarile() {
  const lider = await ceruteLider();
  await db.delete(notificari).where(eq(notificari.liderId, lider.id));
  await scrieAudit(lider.id, "notificari:sterse", {});
  revalidatePath("/setari");
}

/* --------------------------- notificări pe telefon -------------------------- */

export type StarePush = { eroare?: string; reusit?: string };

/**
 * Reține telefonul de pe care s-a apăsat butonul.
 *
 * `abonament` vine de la browser, deci îl verificăm înainte să-l punem în bază.
 */
export async function aboneazaTelefon(
  abonament: unknown,
  descriere?: string,
): Promise<StarePush> {
  const lider = await ceruteLider();

  if (!pushConfigurat()) {
    return { eroare: "Notificările pe telefon nu sunt configurate pe server." };
  }
  if (!abonamentValid(abonament)) {
    return { eroare: "Telefonul n-a trimis datele corect. Mai încearcă o dată." };
  }

  await salveazaAbonament(lider.id, abonament, descriere);
  revalidatePath("/setari");
  return { reusit: "Gata, telefonul ăsta primește notificări." };
}

/** Liderul nu mai vrea notificări pe telefonul ăsta. */
export async function dezaboneazaTelefon(endpoint: string): Promise<StarePush> {
  const lider = await ceruteLider();
  await stergeAbonament(lider.id, endpoint);
  revalidatePath("/setari");
  return { reusit: "Am oprit notificările pe telefonul ăsta." };
}

/** O notificare de probă, ca liderul să vadă pe loc că merge. */
export async function notificareDeProba(): Promise<StarePush> {
  const lider = await ceruteLider();

  const rezultat = await trimitePush(lider.id, {
    titlu: "Merge!",
    mesaj: `Salut, ${lider.nume}! Așa o să arate notificările de la grupele mici.`,
    link: "/setari",
    eticheta: "proba",
  });

  if (rezultat.trimise > 0) {
    return {
      reusit:
        rezultat.trimise === 1
          ? "Am trimis-o. Ar trebui să apară în câteva secunde."
          : `Am trimis-o pe ${rezultat.trimise} telefoane.`,
    };
  }
  if (rezultat.sterse > 0) {
    return {
      eroare:
        "Telefonul nu mai era abonat, așa că l-am scos. Pornește notificările din nou.",
    };
  }
  return { eroare: "N-am reușit să trimit notificarea. Mai încearcă." };
}
