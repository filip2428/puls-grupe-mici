import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  grupe,
  intalniri,
  lideri,
  membri,
  noteMembru,
  prezente,
  type StarePrezenta,
} from "@/lib/db/schema";

/** Datele unei grupe (sau null dacă nu există). */
export async function grupa(grupaId: number) {
  const [g] = await db.select().from(grupe).where(eq(grupe.id, grupaId));
  return g ?? null;
}

/** Membrii unei grupe. Implicit doar cei activi. */
export async function membriGrupei(grupaId: number, includeInactivi = false) {
  const conditii = includeInactivi
    ? eq(membri.grupaId, grupaId)
    : and(eq(membri.grupaId, grupaId), eq(membri.activ, true));

  return db
    .select()
    .from(membri)
    .where(conditii)
    .orderBy(asc(membri.activ), asc(membri.nume))
    .then((lista) =>
      lista.sort(
        (a, b) =>
          Number(b.activ) - Number(a.activ) || a.nume.localeCompare(b.nume, "ro"),
      ),
    );
}

export type IntalnireCuNumere = {
  id: number;
  data: string;
  subiect: string | null;
  nota: string | null;
  numarInvitati: number;
  prinInlocuire: boolean;
  marcatDe: string | null;
  prezenti: number;
  motivati: number;
  absenti: number;
};

/** Ultimele întâlniri ale grupei, cu numărul de prezenți. */
export async function intalniriGrupei(
  grupaId: number,
  limita = 12,
): Promise<IntalnireCuNumere[]> {
  const lista = await db
    .select({
      id: intalniri.id,
      data: intalniri.data,
      subiect: intalniri.subiect,
      nota: intalniri.nota,
      numarInvitati: intalniri.numarInvitati,
      prinInlocuire: intalniri.prinInlocuire,
      marcatDe: lideri.nume,
    })
    .from(intalniri)
    .leftJoin(lideri, eq(lideri.id, intalniri.marcatDeId))
    .where(eq(intalniri.grupaId, grupaId))
    .orderBy(desc(intalniri.data))
    .limit(limita);

  if (lista.length === 0) return [];

  const toateStarile = await db
    .select({
      intalnireId: prezente.intalnireId,
      stare: prezente.stare,
    })
    .from(prezente)
    .where(
      inArray(
        prezente.intalnireId,
        lista.map((i) => i.id),
      ),
    );

  const numere = new Map<number, { prezenti: number; motivati: number; absenti: number }>();
  for (const i of lista) numere.set(i.id, { prezenti: 0, motivati: 0, absenti: 0 });
  for (const p of toateStarile) {
    const n = numere.get(p.intalnireId);
    if (!n) continue;
    if (p.stare === "prezent") n.prezenti++;
    else if (p.stare === "motivat") n.motivati++;
    else n.absenti++;
  }

  return lista.map((i) => ({ ...i, ...numere.get(i.id)! }));
}

/** Grupele (dintre cele date) care au deja prezența făcută la data cerută. */
export async function grupeCuPrezentaLa(
  grupaIds: number[],
  data: string,
): Promise<Set<number>> {
  if (grupaIds.length === 0) return new Set();
  const randuri = await db
    .select({ grupaId: intalniri.grupaId })
    .from(intalniri)
    .where(and(inArray(intalniri.grupaId, grupaIds), eq(intalniri.data, data)));
  return new Set(randuri.map((r) => r.grupaId));
}

/** Un membru împreună cu grupa lui. */
export async function membru(membruId: number) {
  const [rezultat] = await db
    .select({ membru: membri, grupa: grupe })
    .from(membri)
    .innerJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(eq(membri.id, membruId));
  return rezultat ?? null;
}

export type IstoricPrezenta = {
  data: string;
  stare: StarePrezenta;
  subiect: string | null;
};

/** Istoricul prezenței unui membru, de la cea mai recentă întâlnire. */
export async function istoricMembru(
  membruId: number,
  limita = 30,
): Promise<IstoricPrezenta[]> {
  return db
    .select({
      data: intalniri.data,
      stare: prezente.stare,
      subiect: intalniri.subiect,
    })
    .from(prezente)
    .innerJoin(intalniri, eq(intalniri.id, prezente.intalnireId))
    .where(eq(prezente.membruId, membruId))
    .orderBy(desc(intalniri.data))
    .limit(limita);
}

/** Notele scrise despre un membru. */
export async function noteleMembrului(membruId: number) {
  return db
    .select({
      id: noteMembru.id,
      text: noteMembru.text,
      creatLa: noteMembru.creatLa,
      autorId: noteMembru.autorId,
      autorNume: lideri.nume,
    })
    .from(noteMembru)
    .leftJoin(lideri, eq(lideri.id, noteMembru.autorId))
    .where(eq(noteMembru.membruId, membruId))
    .orderBy(desc(noteMembru.creatLa));
}
