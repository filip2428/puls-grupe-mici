import "server-only";

import { and, asc, count, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { biserici, membri } from "@/lib/db/schema";

/**
 * Bisericile din care vin pulsiștii noștri.
 *
 * Lista se ține din „Administrare · Biserici", dar se poate adăuga una nouă și
 * de pe fișa unui pulsist, ca să nu fii nevoit să pleci din ea și să te
 * întorci. Odată scrisă, biserica rămâne - nu se șterge singură când pleacă
 * ultimul pulsist din ea, pentru că poate fi scrisă tocmai înainte să vină
 * cineva de acolo.
 */

/** Fără diacritice, fără spații în plus, litere mici - pentru comparat. */
function normalizeaza(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Taie spațiile în plus și lungimea; gol înseamnă „nescris". */
function curata(text: string | null | undefined, maxim: number): string | null {
  const curatat = (text ?? "").trim().replace(/\s+/g, " ").slice(0, maxim);
  return curatat.length > 0 ? curatat : null;
}

export type DateBiserica = {
  nume: string;
  localitate?: string | null;
  denominatiune?: string | null;
};

export type BisericaCunoscuta = {
  id: number;
  nume: string;
  localitate: string | null;
  denominatiune: string | null;
  /** Câți pulsiști sunt scriși acum din biserica asta. */
  cati: number;
};

/** Toate bisericile, cu câți pulsiști are fiecare. Ordonate alfabetic. */
export async function bisericileCunoscute(): Promise<BisericaCunoscuta[]> {
  const randuri = await db
    .select({
      id: biserici.id,
      nume: biserici.nume,
      localitate: biserici.localitate,
      denominatiune: biserici.denominatiune,
      cati: count(membri.id),
    })
    .from(biserici)
    .leftJoin(membri, eq(membri.bisericaId, biserici.id))
    .groupBy(biserici.id)
    .orderBy(asc(biserici.nume));

  return randuri.map((b) => ({ ...b, cati: Number(b.cati) }));
}

/** O biserică anume, fără numărători. */
export async function iaBiserica(id: number) {
  const [b] = await db.select().from(biserici).where(eq(biserici.id, id));
  return b ?? null;
}

/**
 * Caută o biserică după nume, indiferent cum a fost scrisă.
 *
 * „betel arad" scris în grabă trebuie să nimerească aceeași biserică cu
 * „Betel Arad", altfel statisticile se rup în bucăți. `inafaraDe` sare peste
 * un rând anume - la editare, o biserică n-are cum să fie duplicatul ei.
 */
async function cautaDupaNume(nume: string, inafaraDe?: number) {
  const toate = await db
    .select({ id: biserici.id, nume: biserici.nume })
    .from(biserici)
    .where(inafaraDe ? ne(biserici.id, inafaraDe) : undefined);

  const cautat = normalizeaza(nume);
  return toate.find((b) => normalizeaza(b.nume) === cautat) ?? null;
}

export type RezultatBiserica = { id: number } | { eroare: string };

/**
 * Creează o biserică. Dacă una cu același nume există deja, o folosim pe aceea
 * - nu e o greșeală de semnalat, e exact ce voia omul.
 */
export async function creeazaBiserica(
  date: DateBiserica,
): Promise<RezultatBiserica> {
  const nume = curata(date.nume, 80);
  if (!nume || nume.length < 2) return { eroare: "Scrie numele bisericii." };

  const existenta = await cautaDupaNume(nume);
  if (existenta) return { id: existenta.id };

  const [creata] = await db
    .insert(biserici)
    .values({
      nume,
      localitate: curata(date.localitate, 60),
      denominatiune: curata(date.denominatiune, 60),
    })
    .returning({ id: biserici.id });
  return { id: creata.id };
}

/** Schimbă datele unei biserici. Pulsiștii legați de ea se mută cu tot cu ea. */
export async function salveazaBiserica(
  id: number,
  date: DateBiserica,
): Promise<RezultatBiserica> {
  const nume = curata(date.nume, 80);
  if (!nume || nume.length < 2) return { eroare: "Scrie numele bisericii." };

  const alta = await cautaDupaNume(nume, id);
  if (alta) return { eroare: `„${nume}" există deja în listă.` };

  await db
    .update(biserici)
    .set({
      nume,
      localitate: curata(date.localitate, 60),
      denominatiune: curata(date.denominatiune, 60),
    })
    .where(eq(biserici.id, id));
  return { id };
}

/**
 * Șterge o biserică.
 *
 * Pulsiștii care erau din ea rămân neatinși - doar că nu mai știm de unde vin
 * (`biserica_id` devine gol, prin cheia străină). De-aia spunem dinainte câți
 * sunt, ca ștergerea să nu fie o surpriză.
 */
export async function stergeBiserica(id: number) {
  await db.delete(biserici).where(eq(biserici.id, id));
}

/**
 * Câți pulsiști sunt de la altă biserică, fără să știm care.
 *
 * E un îndemn, nu o eroare: se poate ști că vine de altundeva înainte să se
 * afle de unde. Dar cât timp sunt mulți așa, statisticile pe biserici spun
 * mai puțin decât ar putea.
 */
export async function catiFaraBisericaScrisa(): Promise<number> {
  const [rand] = await db
    .select({ cati: count() })
    .from(membri)
    .where(and(eq(membri.biserica, "alta"), isNull(membri.bisericaId)));
  return Number(rand?.cati ?? 0);
}

/**
 * Id-ul bisericii cu numele ăsta; o creează dacă nu există.
 *
 * Folosit la importul din Excel, unde vin nume scrise de mână, în fel și chip.
 */
export async function gasesteSauCreeaza(nume: string): Promise<number | null> {
  const rezultat = await creeazaBiserica({ nume });
  return "id" in rezultat ? rezultat.id : null;
}
