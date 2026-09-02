import "server-only";

import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { grupe, intalniri, lideri, membri, prezente } from "@/lib/db/schema";

export type FiltruExport = {
  grupaIds?: number[];
  deLa?: string;
  panaLa?: string;
};

export type RandPrezenta = {
  grupa: string;
  data: string;
  adolescent: string;
  stare: string;
  subiect: string | null;
  marcatDe: string | null;
  prinInlocuire: boolean;
};

const NUME_STARE: Record<string, string> = {
  prezent: "prezent",
  motivat: "a anunțat",
  absent: "absent",
};

/** Toate prezențele, gata de pus în Excel. */
export async function randuriPrezente(
  filtru: FiltruExport,
): Promise<RandPrezenta[]> {
  const conditii = [];
  if (filtru.grupaIds?.length) {
    conditii.push(inArray(intalniri.grupaId, filtru.grupaIds));
  }
  if (filtru.deLa) conditii.push(gte(intalniri.data, filtru.deLa));
  if (filtru.panaLa) conditii.push(lte(intalniri.data, filtru.panaLa));

  const randuri = await db
    .select({
      grupa: grupe.nume,
      data: intalniri.data,
      adolescent: membri.nume,
      stare: prezente.stare,
      subiect: intalniri.subiect,
      marcatDe: lideri.nume,
      prinInlocuire: intalniri.prinInlocuire,
    })
    .from(prezente)
    .innerJoin(intalniri, eq(intalniri.id, prezente.intalnireId))
    .innerJoin(grupe, eq(grupe.id, intalniri.grupaId))
    .innerJoin(membri, eq(membri.id, prezente.membruId))
    .leftJoin(lideri, eq(lideri.id, intalniri.marcatDeId))
    .where(conditii.length ? and(...conditii) : undefined)
    .orderBy(asc(grupe.nume), asc(intalniri.data), asc(membri.nume));

  return randuri.map((r) => ({ ...r, stare: NUME_STARE[r.stare] ?? r.stare }));
}

export type RandAdolescent = {
  grupa: string;
  nume: string;
  telefon: string | null;
  dataNasterii: string | null;
  activ: string;
  prezente: number;
  anuntate: number;
  absente: number;
  procent: number | null;
};

/** Câte o linie pentru fiecare adolescent, cu totalurile lui. */
export async function randuriAdolescenti(
  filtru: FiltruExport,
): Promise<RandAdolescent[]> {
  const conditiiMembri = filtru.grupaIds?.length
    ? inArray(membri.grupaId, filtru.grupaIds)
    : undefined;

  const lista = await db
    .select({
      id: membri.id,
      nume: membri.nume,
      telefon: membri.telefon,
      dataNasterii: membri.dataNasterii,
      activ: membri.activ,
      grupa: grupe.nume,
    })
    .from(membri)
    .innerJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(conditiiMembri)
    .orderBy(asc(grupe.nume), asc(membri.nume));

  if (lista.length === 0) return [];

  const conditiiPrezente = [
    inArray(
      prezente.membruId,
      lista.map((m) => m.id),
    ),
  ];
  if (filtru.deLa) conditiiPrezente.push(gte(intalniri.data, filtru.deLa));
  if (filtru.panaLa) conditiiPrezente.push(lte(intalniri.data, filtru.panaLa));

  const stari = await db
    .select({ membruId: prezente.membruId, stare: prezente.stare })
    .from(prezente)
    .innerJoin(intalniri, eq(intalniri.id, prezente.intalnireId))
    .where(and(...conditiiPrezente));

  const totaluri = new Map<
    number,
    { prezente: number; anuntate: number; absente: number }
  >();
  for (const m of lista) {
    totaluri.set(m.id, { prezente: 0, anuntate: 0, absente: 0 });
  }
  for (const s of stari) {
    const t = totaluri.get(s.membruId);
    if (!t) continue;
    if (s.stare === "prezent") t.prezente++;
    else if (s.stare === "motivat") t.anuntate++;
    else t.absente++;
  }

  return lista.map((m) => {
    const t = totaluri.get(m.id)!;
    const total = t.prezente + t.anuntate + t.absente;
    return {
      grupa: m.grupa,
      nume: m.nume,
      telefon: m.telefon,
      dataNasterii: m.dataNasterii,
      activ: m.activ ? "da" : "nu",
      prezente: t.prezente,
      anuntate: t.anuntate,
      absente: t.absente,
      procent: total ? Math.round((t.prezente / total) * 100) : null,
    };
  });
}

export type RandIntalnire = {
  grupa: string;
  data: string;
  subiect: string | null;
  prezenti: number;
  anuntati: number;
  absenti: number;
  invitati: number;
  marcatDe: string | null;
  prinInlocuire: string;
  nota: string | null;
};

/** Câte o linie pentru fiecare întâlnire. */
export async function randuriIntalniri(
  filtru: FiltruExport,
): Promise<RandIntalnire[]> {
  const conditii = [];
  if (filtru.grupaIds?.length) {
    conditii.push(inArray(intalniri.grupaId, filtru.grupaIds));
  }
  if (filtru.deLa) conditii.push(gte(intalniri.data, filtru.deLa));
  if (filtru.panaLa) conditii.push(lte(intalniri.data, filtru.panaLa));

  const lista = await db
    .select({
      id: intalniri.id,
      grupa: grupe.nume,
      data: intalniri.data,
      subiect: intalniri.subiect,
      nota: intalniri.nota,
      invitati: intalniri.numarInvitati,
      marcatDe: lideri.nume,
      prinInlocuire: intalniri.prinInlocuire,
    })
    .from(intalniri)
    .innerJoin(grupe, eq(grupe.id, intalniri.grupaId))
    .leftJoin(lideri, eq(lideri.id, intalniri.marcatDeId))
    .where(conditii.length ? and(...conditii) : undefined)
    .orderBy(asc(grupe.nume), asc(intalniri.data));

  if (lista.length === 0) return [];

  const stari = await db
    .select({ intalnireId: prezente.intalnireId, stare: prezente.stare })
    .from(prezente)
    .where(
      inArray(
        prezente.intalnireId,
        lista.map((i) => i.id),
      ),
    );

  const numere = new Map<
    number,
    { prezenti: number; anuntati: number; absenti: number }
  >();
  for (const i of lista) {
    numere.set(i.id, { prezenti: 0, anuntati: 0, absenti: 0 });
  }
  for (const s of stari) {
    const n = numere.get(s.intalnireId);
    if (!n) continue;
    if (s.stare === "prezent") n.prezenti++;
    else if (s.stare === "motivat") n.anuntati++;
    else n.absenti++;
  }

  return lista.map((i) => ({
    grupa: i.grupa,
    data: i.data,
    subiect: i.subiect,
    ...numere.get(i.id)!,
    invitati: i.invitati,
    marcatDe: i.marcatDe,
    prinInlocuire: i.prinInlocuire ? "da" : "",
    nota: i.nota,
  }));
}
