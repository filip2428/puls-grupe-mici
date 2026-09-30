import "server-only";

import { and, asc, count, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  biserici,
  evenimente,
  grupe,
  intalniri,
  lideri,
  membri,
  prezente,
  prezenteEveniment,
} from "@/lib/db/schema";
import { prieteniiMaiMultora } from "@/lib/interogari/prietenii";
import {
  FARA_GRUPA,
  bisericaPeLarg,
  etichetaBotez,
  etichetaClasa,
  etichetaSex,
} from "@/lib/util/etichete";

export type FiltruExport = {
  grupaIds?: number[];
  deLa?: string;
  panaLa?: string;
};

export type RandPrezenta = {
  grupa: string;
  data: string;
  pulsist: string;
  statut: string;
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
      pulsist: membri.nume,
      statut: membri.status,
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

  return randuri.map((r) => ({
    ...r,
    statut: r.statut === "musafir" ? "musafir" : "membru",
    stare: NUME_STARE[r.stare] ?? r.stare,
  }));
}

export type RandPulsist = {
  grupa: string;
  nume: string;
  statut: string;
  sex: string;
  clasa: string;
  biserica: string;
  botez: string;
  botezatLa: string | null;
  telefon: string | null;
  email: string | null;
  dataNasterii: string | null;
  parinte1Nume: string | null;
  parinte1Telefon: string | null;
  parinte1Email: string | null;
  parinte2Nume: string | null;
  parinte2Telefon: string | null;
  parinte2Email: string | null;
  activ: string;
  prezente: number;
  anuntate: number;
  absente: number;
  procent: number | null;
  /** La câte întâlniri cu toți a fost bifat, în perioadă. */
  laIntalniriCuToti: number;
  /** Prietenii apropiați, scriși unul după altul. */
  prieteni: string;
};

/** Câte o linie pentru fiecare pulsist, cu totalurile lui. */
export async function randuriPulsisti(
  filtru: FiltruExport,
): Promise<RandPulsist[]> {
  const conditiiMembri = filtru.grupaIds?.length
    ? inArray(membri.grupaId, filtru.grupaIds)
    : undefined;

  const lista = await db
    .select({
      id: membri.id,
      nume: membri.nume,
      telefon: membri.telefon,
      email: membri.email,
      dataNasterii: membri.dataNasterii,
      sex: membri.sex,
      clasa: membri.clasa,
      status: membri.status,
      biserica: membri.biserica,
      bisericaNume: biserici.nume,
      botez: membri.botez,
      botezatLa: membri.botezatLa,
      parinte1Nume: membri.parinte1Nume,
      parinte1Telefon: membri.parinte1Telefon,
      parinte1Email: membri.parinte1Email,
      parinte2Nume: membri.parinte2Nume,
      parinte2Telefon: membri.parinte2Telefon,
      parinte2Email: membri.parinte2Email,
      activ: membri.activ,
      grupa: grupe.nume,
    })
    .from(membri)
    .leftJoin(grupe, eq(grupe.id, membri.grupaId))
    .leftJoin(biserici, eq(biserici.id, membri.bisericaId))
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

  const conditiiCuToti = [
    inArray(
      prezenteEveniment.membruId,
      lista.map((m) => m.id),
    ),
  ];
  if (filtru.deLa) conditiiCuToti.push(gte(evenimente.data, filtru.deLa));
  if (filtru.panaLa) conditiiCuToti.push(lte(evenimente.data, filtru.panaLa));

  const cuToti = await db
    .select({ membruId: prezenteEveniment.membruId, cate: count() })
    .from(prezenteEveniment)
    .innerJoin(evenimente, eq(evenimente.id, prezenteEveniment.evenimentId))
    .where(and(...conditiiCuToti))
    .groupBy(prezenteEveniment.membruId);
  const laCuToti = new Map(cuToti.map((r) => [r.membruId, Number(r.cate)]));

  const prieteni = await prieteniiMaiMultora(lista.map((m) => m.id));

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
      grupa: m.grupa ?? FARA_GRUPA,
      nume: m.nume,
      statut: m.status === "musafir" ? "musafir" : "membru",
      sex: etichetaSex(m.sex),
      clasa: etichetaClasa(m.clasa),
      biserica: bisericaPeLarg(m.biserica, m.bisericaNume),
      botez: m.botez ? etichetaBotez(m.botez) : "",
      botezatLa: m.botezatLa,
      telefon: m.telefon,
      email: m.email,
      dataNasterii: m.dataNasterii,
      parinte1Nume: m.parinte1Nume,
      parinte1Telefon: m.parinte1Telefon,
      parinte1Email: m.parinte1Email,
      parinte2Nume: m.parinte2Nume,
      parinte2Telefon: m.parinte2Telefon,
      parinte2Email: m.parinte2Email,
      activ: m.activ ? "da" : "nu",
      prezente: t.prezente,
      anuntate: t.anuntate,
      absente: t.absente,
      procent: total ? Math.round((t.prezente / total) * 100) : null,
      laIntalniriCuToti: laCuToti.get(m.id) ?? 0,
      prieteni: (prieteni.get(m.id) ?? []).join(", "),
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
  musafiri: number;
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
    .select({
      intalnireId: prezente.intalnireId,
      stare: prezente.stare,
      status: membri.status,
    })
    .from(prezente)
    .innerJoin(membri, eq(membri.id, prezente.membruId))
    .where(
      inArray(
        prezente.intalnireId,
        lista.map((i) => i.id),
      ),
    );

  const numere = new Map<
    number,
    { prezenti: number; anuntati: number; absenti: number; musafiri: number }
  >();
  for (const i of lista) {
    numere.set(i.id, { prezenti: 0, anuntati: 0, absenti: 0, musafiri: 0 });
  }
  for (const s of stari) {
    const n = numere.get(s.intalnireId);
    if (!n) continue;
    if (s.status === "musafir") {
      if (s.stare === "prezent") n.musafiri++;
      continue;
    }
    if (s.stare === "prezent") n.prezenti++;
    else if (s.stare === "motivat") n.anuntati++;
    else n.absenti++;
  }

  return lista.map((i) => ({
    grupa: i.grupa,
    data: i.data,
    subiect: i.subiect,
    ...numere.get(i.id)!,
    marcatDe: i.marcatDe,
    prinInlocuire: i.prinInlocuire ? "da" : "",
    nota: i.nota,
  }));
}

export type RandPrezentaCuToti = {
  /** Nu intră în Excel - ține doar întâlnirile despărțite la numărat. */
  evenimentId: number;
  data: string;
  intalnire: string;
  pulsist: string;
  grupa: string;
  statut: string;
  marcatDe: string | null;
};

/**
 * Cine a venit la întâlnirile cu toți: câte un rând pentru fiecare bifă.
 *
 * Întâlnirea nu e a niciunei grupe, deci exportul pe grupe ia doar pulsiștii
 * grupelor cerute - liderul își vede copiii lui la gamenight, nu toată sala.
 */
export async function randuriPrezenteCuToti(
  filtru: FiltruExport,
): Promise<RandPrezentaCuToti[]> {
  const conditii = [];
  if (filtru.grupaIds?.length) {
    conditii.push(inArray(membri.grupaId, filtru.grupaIds));
  }
  if (filtru.deLa) conditii.push(gte(evenimente.data, filtru.deLa));
  if (filtru.panaLa) conditii.push(lte(evenimente.data, filtru.panaLa));

  const randuri = await db
    .select({
      evenimentId: evenimente.id,
      data: evenimente.data,
      intalnire: evenimente.titlu,
      pulsist: membri.nume,
      grupa: grupe.nume,
      statut: membri.status,
      marcatDe: lideri.nume,
    })
    .from(prezenteEveniment)
    .innerJoin(evenimente, eq(evenimente.id, prezenteEveniment.evenimentId))
    .innerJoin(membri, eq(membri.id, prezenteEveniment.membruId))
    .leftJoin(grupe, eq(grupe.id, membri.grupaId))
    .leftJoin(lideri, eq(lideri.id, prezenteEveniment.marcatDeId))
    .where(conditii.length ? and(...conditii) : undefined)
    .orderBy(asc(evenimente.data), asc(evenimente.titlu), asc(membri.nume));

  return randuri.map((r) => ({
    ...r,
    grupa: r.grupa ?? FARA_GRUPA,
    statut: r.statut === "musafir" ? "musafir" : "membru",
  }));
}

export type RandIntalnireCuToti = {
  data: string;
  intalnire: string;
  veniti: number;
  musafiri: number;
};

/** Câți au venit la fiecare întâlnire cu toți, strânși din rândurile de mai sus. */
export function intalniriCuTotiDin(
  randuri: RandPrezentaCuToti[],
): RandIntalnireCuToti[] {
  const pe = new Map<number, RandIntalnireCuToti>();
  for (const r of randuri) {
    const i = pe.get(r.evenimentId) ?? {
      data: r.data,
      intalnire: r.intalnire,
      veniti: 0,
      musafiri: 0,
    };
    i.veniti++;
    if (r.statut === "musafir") i.musafiri++;
    pe.set(r.evenimentId, i);
  }
  return [...pe.values()];
}
