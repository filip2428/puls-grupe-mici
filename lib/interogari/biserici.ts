import "server-only";

import { asc, count, eq, isNull, notInArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { biserici, membri } from "@/lib/db/schema";

/**
 * Bisericile din care vin pulsiștii noștri.
 *
 * Lista nu se administrează de nicăieri: crește singură când cineva scrie o
 * biserică nouă pe o fișă și se curăță singură când ultimul pulsist dintr-o
 * biserică pleacă sau își schimbă răspunsul. Așa nu mai e încă un ecran de
 * întreținut, dar în statistici bisericile rămân grupate cum trebuie.
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

export type BisericaCunoscuta = { id: number; nume: string; cati: number };

/** Toate bisericile, cu câți pulsiști are fiecare. Ordonate alfabetic. */
export async function bisericileCunoscute(): Promise<BisericaCunoscuta[]> {
  const randuri = await db
    .select({
      id: biserici.id,
      nume: biserici.nume,
      cati: count(membri.id),
    })
    .from(biserici)
    .leftJoin(membri, eq(membri.bisericaId, biserici.id))
    .groupBy(biserici.id)
    .orderBy(asc(biserici.nume));

  return randuri.map((b) => ({ ...b, cati: Number(b.cati) }));
}

/**
 * Id-ul bisericii cu numele ăsta; o creează dacă nu există.
 *
 * Căutarea se face pe numele normalizat, ca „betel arad" scris în grabă să
 * nimerească aceeași biserică cu „Betel Arad". Numele păstrat e cel scris
 * prima dată - cine vrea altă scriere îl schimbă de pe fișă, și se schimbă
 * peste tot.
 */
export async function gasesteSauCreeaza(nume: string): Promise<number | null> {
  const curat = nume.trim().replace(/\s+/g, " ").slice(0, 80);
  if (curat.length < 2) return null;

  const toate = await db.select({ id: biserici.id, nume: biserici.nume }).from(biserici);
  const cautat = normalizeaza(curat);
  const gasita = toate.find((b) => normalizeaza(b.nume) === cautat);
  if (gasita) return gasita.id;

  const [creata] = await db
    .insert(biserici)
    .values({ nume: curat })
    .returning({ id: biserici.id });
  return creata.id;
}

/**
 * Șterge bisericile din care n-a mai rămas nimeni.
 *
 * Se cheamă după fiecare schimbare de fișă. Fără ea, o scăpare de tastatură
 * („Beteel") ar rămâne pentru totdeauna în lista de sugestii.
 */
export async function curataBisericileGoale() {
  const folosite = await db
    .selectDistinct({ id: membri.bisericaId })
    .from(membri)
    .where(sql`${membri.bisericaId} is not null`);

  const ids = folosite.map((f) => f.id).filter((id): id is number => id !== null);

  await db
    .delete(biserici)
    .where(ids.length > 0 ? notInArray(biserici.id, ids) : undefined);
}

/** Câți pulsiști n-au încă biserica scrisă - pentru un îndemn discret. */
export async function catiFaraBiserica(): Promise<number> {
  const [rand] = await db
    .select({ cati: count() })
    .from(membri)
    .where(isNull(membri.biserica));
  return Number(rand?.cati ?? 0);
}
