import "server-only";

import { and, asc, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  echipeSlujire,
  grupe,
  lideri,
  lideriGrupe,
  membri,
  membriEchipe,
  programariSlujire,
} from "@/lib/db/schema";
import { dataAzi } from "@/lib/util/date";

/**
 * Slujirile.
 *
 * Sunt două lucruri diferite, legate între ele:
 *  - ECHIPELE de slujire (Laudă, Media, Protocol...) - cine e implicat pe
 *    termen lung, indiferent de grupa mică din care face parte;
 *  - PROGRAMĂRILE - calendarul: „pe 12 octombrie slujește grupa X" sau
 *    „pe 19 octombrie e de serviciu echipa de protocol".
 */

export type EchipaCuNumere = {
  id: number;
  nume: string;
  descriere: string | null;
  activa: boolean;
  responsabilId: number | null;
  responsabilNume: string | null;
  cati: number;
};

/** Toate echipele de slujire, cu câți adolescenți sunt în fiecare. */
export async function listaEchipe(doarActive = false): Promise<EchipaCuNumere[]> {
  const lista = await db
    .select({
      id: echipeSlujire.id,
      nume: echipeSlujire.nume,
      descriere: echipeSlujire.descriere,
      activa: echipeSlujire.activa,
      responsabilId: echipeSlujire.responsabilId,
      responsabilNume: lideri.nume,
    })
    .from(echipeSlujire)
    .leftJoin(lideri, eq(lideri.id, echipeSlujire.responsabilId))
    .where(doarActive ? eq(echipeSlujire.activa, true) : undefined)
    .orderBy(asc(echipeSlujire.nume));

  if (lista.length === 0) return [];

  const numere = await db
    .select({
      echipaId: membriEchipe.echipaId,
      cati: sql<number>`count(*)`,
    })
    .from(membriEchipe)
    .innerJoin(membri, eq(membri.id, membriEchipe.membruId))
    .where(eq(membri.activ, true))
    .groupBy(membriEchipe.echipaId);

  const peEchipa = new Map(numere.map((n) => [n.echipaId, Number(n.cati)]));

  return lista
    .map((e) => ({ ...e, cati: peEchipa.get(e.id) ?? 0 }))
    .sort(
      (a, b) =>
        Number(b.activa) - Number(a.activa) || a.nume.localeCompare(b.nume, "ro"),
    );
}

/** O echipă și adolescenții din ea. */
export async function echipa(echipaId: number) {
  const [e] = await db
    .select({
      id: echipeSlujire.id,
      nume: echipeSlujire.nume,
      descriere: echipeSlujire.descriere,
      activa: echipeSlujire.activa,
      responsabilId: echipeSlujire.responsabilId,
      responsabilNume: lideri.nume,
    })
    .from(echipeSlujire)
    .leftJoin(lideri, eq(lideri.id, echipeSlujire.responsabilId))
    .where(eq(echipeSlujire.id, echipaId));
  if (!e) return null;

  const implicati = await db
    .select({
      membruId: membri.id,
      nume: membri.nume,
      telefon: membri.telefon,
      activ: membri.activ,
      status: membri.status,
      rol: membriEchipe.rol,
      grupaId: grupe.id,
      grupaNume: grupe.nume,
    })
    .from(membriEchipe)
    .innerJoin(membri, eq(membri.id, membriEchipe.membruId))
    .innerJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(eq(membriEchipe.echipaId, echipaId));

  return {
    echipa: e,
    membri: implicati.sort(
      (a, b) =>
        Number(b.activ) - Number(a.activ) || a.nume.localeCompare(b.nume, "ro"),
    ),
  };
}

/** În ce echipe de slujire e implicat un adolescent. */
export async function echipeleMembrului(membruId: number) {
  return db
    .select({
      echipaId: echipeSlujire.id,
      nume: echipeSlujire.nume,
      activa: echipeSlujire.activa,
      rol: membriEchipe.rol,
    })
    .from(membriEchipe)
    .innerJoin(echipeSlujire, eq(echipeSlujire.id, membriEchipe.echipaId))
    .where(eq(membriEchipe.membruId, membruId))
    .orderBy(asc(echipeSlujire.nume));
}

export type ProgramareAfisata = {
  id: number;
  data: string;
  titlu: string;
  detalii: string | null;
  ora: string | null;
  locatie: string | null;
  grupaId: number | null;
  grupaNume: string | null;
  echipaId: number | null;
  echipaNume: string | null;
};

const campuriProgramare = {
  id: programariSlujire.id,
  data: programariSlujire.data,
  titlu: programariSlujire.titlu,
  detalii: programariSlujire.detalii,
  ora: programariSlujire.ora,
  locatie: programariSlujire.locatie,
  grupaId: programariSlujire.grupaId,
  grupaNume: grupe.nume,
  echipaId: programariSlujire.echipaId,
  echipaNume: echipeSlujire.nume,
};

/** Programările care urmează (implicit de azi înainte). */
export async function programariViitoare(
  limita = 30,
  deLa = dataAzi(),
): Promise<ProgramareAfisata[]> {
  return db
    .select(campuriProgramare)
    .from(programariSlujire)
    .leftJoin(grupe, eq(grupe.id, programariSlujire.grupaId))
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(gte(programariSlujire.data, deLa))
    .orderBy(asc(programariSlujire.data))
    .limit(limita);
}

/** Programările care au trecut deja, cele mai recente întâi. */
export async function programariTrecute(limita = 20): Promise<ProgramareAfisata[]> {
  return db
    .select(campuriProgramare)
    .from(programariSlujire)
    .leftJoin(grupe, eq(grupe.id, programariSlujire.grupaId))
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(lt(programariSlujire.data, dataAzi()))
    .orderBy(desc(programariSlujire.data))
    .limit(limita);
}

/** Echipele în care e implicat cel puțin un adolescent din grupele date. */
export async function echipeleGrupelor(grupaIds: number[]): Promise<number[]> {
  if (grupaIds.length === 0) return [];
  const randuri = await db
    .selectDistinct({ echipaId: membriEchipe.echipaId })
    .from(membriEchipe)
    .innerJoin(membri, eq(membri.id, membriEchipe.membruId))
    .where(and(inArray(membri.grupaId, grupaIds), eq(membri.activ, true)));
  return randuri.map((r) => r.echipaId);
}

/**
 * Ce urmează pentru un lider anume: programările grupelor lui, plus cele ale
 * echipelor în care are adolescenți. Adminul le vede pe toate.
 */
export async function programariPentruLider(optiuni: {
  esteAdmin: boolean;
  grupaIds: number[];
  limita?: number;
}): Promise<ProgramareAfisata[]> {
  const limita = optiuni.limita ?? 20;
  if (optiuni.esteAdmin) return programariViitoare(limita);

  const echipaIds = await echipeleGrupelor(optiuni.grupaIds);
  if (optiuni.grupaIds.length === 0 && echipaIds.length === 0) return [];

  const conditii = [];
  if (optiuni.grupaIds.length > 0) {
    conditii.push(inArray(programariSlujire.grupaId, optiuni.grupaIds));
  }
  if (echipaIds.length > 0) {
    conditii.push(inArray(programariSlujire.echipaId, echipaIds));
  }

  return db
    .select(campuriProgramare)
    .from(programariSlujire)
    .leftJoin(grupe, eq(grupe.id, programariSlujire.grupaId))
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(and(gte(programariSlujire.data, dataAzi()), or(...conditii)))
    .orderBy(asc(programariSlujire.data))
    .limit(limita);
}

/** Programările unei grupe care urmează - se arată pe pagina grupei. */
export async function programariGrupei(
  grupaId: number,
  limita = 5,
): Promise<ProgramareAfisata[]> {
  const echipaIds = await echipeleGrupelor([grupaId]);
  const conditii = [eq(programariSlujire.grupaId, grupaId)];
  if (echipaIds.length > 0) {
    conditii.push(inArray(programariSlujire.echipaId, echipaIds));
  }

  return db
    .select(campuriProgramare)
    .from(programariSlujire)
    .leftJoin(grupe, eq(grupe.id, programariSlujire.grupaId))
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(and(gte(programariSlujire.data, dataAzi()), or(...conditii)))
    .orderBy(asc(programariSlujire.data))
    .limit(limita);
}

/** Programările care urmează pentru un adolescent (prin echipele lui). */
export async function programariMembrului(
  membruId: number,
  limita = 5,
): Promise<ProgramareAfisata[]> {
  const echipe = await echipeleMembrului(membruId);
  if (echipe.length === 0) return [];

  return db
    .select(campuriProgramare)
    .from(programariSlujire)
    .leftJoin(grupe, eq(grupe.id, programariSlujire.grupaId))
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(
      and(
        gte(programariSlujire.data, dataAzi()),
        inArray(
          programariSlujire.echipaId,
          echipe.map((e) => e.echipaId),
        ),
      ),
    )
    .orderBy(asc(programariSlujire.data))
    .limit(limita);
}

/**
 * Locurile de slujire în care adolescentul încă nu e implicat.
 * Astea umplu lista de pe fișa lui („unde slujește").
 */
export async function slujiriDisponibilePentru(membruId: number) {
  const alelui = await db
    .select({ id: membriEchipe.echipaId })
    .from(membriEchipe)
    .where(eq(membriEchipe.membruId, membruId));
  const exclus = new Set(alelui.map((a) => a.id));

  const active = await db
    .select({ id: echipeSlujire.id, nume: echipeSlujire.nume })
    .from(echipeSlujire)
    .where(eq(echipeSlujire.activa, true))
    .orderBy(asc(echipeSlujire.nume));

  return active.filter((e) => !exclus.has(e.id));
}

/** Adolescenții care încă nu sunt în echipa dată (pentru lista de adăugare). */
export async function adolescentiInAfaraEchipei(echipaId: number) {
  const inEchipa = await db
    .select({ id: membriEchipe.membruId })
    .from(membriEchipe)
    .where(eq(membriEchipe.echipaId, echipaId));
  const exclusi = new Set(inEchipa.map((m) => m.id));

  const toti = await db
    .select({
      id: membri.id,
      nume: membri.nume,
      grupaNume: grupe.nume,
    })
    .from(membri)
    .innerJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(and(eq(membri.activ, true), eq(membri.status, "membru")))
    .orderBy(asc(membri.nume));

  return toti.filter((m) => !exclusi.has(m.id));
}

/**
 * Liderii care trebuie anunțați de o programare: liderii grupei programate,
 * liderii grupelor din care fac parte adolescenții echipei, plus responsabilul.
 */
export async function liderilDeAnuntat(programareId: number): Promise<number[]> {
  const [p] = await db
    .select()
    .from(programariSlujire)
    .where(eq(programariSlujire.id, programareId));
  if (!p) return [];

  const grupaIds = new Set<number>();
  if (p.grupaId) grupaIds.add(p.grupaId);

  const deAnuntat = new Set<number>();

  if (p.echipaId) {
    const [e] = await db
      .select({ responsabilId: echipeSlujire.responsabilId })
      .from(echipeSlujire)
      .where(eq(echipeSlujire.id, p.echipaId));
    if (e?.responsabilId) deAnuntat.add(e.responsabilId);

    const dinEchipa = await db
      .select({ grupaId: membri.grupaId })
      .from(membriEchipe)
      .innerJoin(membri, eq(membri.id, membriEchipe.membruId))
      .where(and(eq(membriEchipe.echipaId, p.echipaId), eq(membri.activ, true)));
    for (const m of dinEchipa) grupaIds.add(m.grupaId);
  }

  if (grupaIds.size > 0) {
    const ai = await db
      .select({ liderId: lideriGrupe.liderId })
      .from(lideriGrupe)
      .innerJoin(lideri, eq(lideri.id, lideriGrupe.liderId))
      .where(and(inArray(lideriGrupe.grupaId, [...grupaIds]), eq(lideri.activ, true)));
    for (const l of ai) deAnuntat.add(l.liderId);
  }

  return [...deAnuntat];
}

/** Grupele fără nicio programare viitoare - adminul vede cine mai are nevoie. */
export async function grupeFaraProgramare() {
  const azi = dataAzi();
  const cuProgramare = await db
    .selectDistinct({ grupaId: programariSlujire.grupaId })
    .from(programariSlujire)
    .where(gte(programariSlujire.data, azi));

  const ids = new Set(
    cuProgramare.map((c) => c.grupaId).filter((id): id is number => id !== null),
  );

  const active = await db
    .select({ id: grupe.id, nume: grupe.nume })
    .from(grupe)
    .where(eq(grupe.activa, true))
    .orderBy(asc(grupe.nume));

  return active.filter((g) => !ids.has(g.id));
}
