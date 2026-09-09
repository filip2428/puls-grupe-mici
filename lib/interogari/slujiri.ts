import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  echipeSlujire,
  grupe,
  lideri,
  lideriEchipe,
  lideriGrupe,
  membri,
  membriEchipe,
  programariGrupe,
  programariSlujire,
} from "@/lib/db/schema";
import { adaugaZile, dataAzi } from "@/lib/util/date";

/**
 * Slujirile.
 *
 * Sunt două lucruri diferite, legate între ele:
 *  - ECHIPELE de slujire (Laudă, Media, Protocol...) - cine e implicat pe
 *    termen lung, indiferent de grupa mică din care face parte;
 *  - PROGRAMĂRILE - calendarul: „pe 12 octombrie slujesc grupele X și Y" sau
 *    „pe 19 octombrie e de serviciu echipa de protocol".
 *
 * Și una și alta se țin cu mai mulți: o slujire are liderii ei, iar la o
 * programare pot fi trecute oricâte grupe.
 */

export type LiderScurt = { id: number; nume: string };
export type GrupaScurta = { id: number; nume: string };

export type EchipaCuNumere = {
  id: number;
  nume: string;
  descriere: string | null;
  activa: boolean;
  /** Liderii care o coordonează. Poate fi și goală - se vede și așa. */
  lideri: LiderScurt[];
  cati: number;
};

/** Liderii fiecărei echipe din listă, strânși într-un singur drum la bază. */
async function liderilEchipelor(
  echipaIds: number[],
): Promise<Map<number, LiderScurt[]>> {
  const peEchipa = new Map<number, LiderScurt[]>();
  if (echipaIds.length === 0) return peEchipa;

  const randuri = await db
    .select({
      echipaId: lideriEchipe.echipaId,
      id: lideri.id,
      nume: lideri.nume,
    })
    .from(lideriEchipe)
    .innerJoin(lideri, eq(lideri.id, lideriEchipe.liderId))
    .where(inArray(lideriEchipe.echipaId, echipaIds));

  for (const r of randuri) {
    const lista = peEchipa.get(r.echipaId) ?? [];
    lista.push({ id: r.id, nume: r.nume });
    peEchipa.set(r.echipaId, lista);
  }
  for (const lista of peEchipa.values()) {
    lista.sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
  }
  return peEchipa;
}

/** Toate echipele de slujire, cu câți pulsiști sunt în fiecare. */
export async function listaEchipe(doarActive = false): Promise<EchipaCuNumere[]> {
  const lista = await db
    .select({
      id: echipeSlujire.id,
      nume: echipeSlujire.nume,
      descriere: echipeSlujire.descriere,
      activa: echipeSlujire.activa,
    })
    .from(echipeSlujire)
    .where(doarActive ? eq(echipeSlujire.activa, true) : undefined)
    .orderBy(asc(echipeSlujire.nume));

  if (lista.length === 0) return [];

  const [numere, aiLor] = await Promise.all([
    db
      .select({
        echipaId: membriEchipe.echipaId,
        cati: sql<number>`count(*)`,
      })
      .from(membriEchipe)
      .innerJoin(membri, eq(membri.id, membriEchipe.membruId))
      .where(eq(membri.activ, true))
      .groupBy(membriEchipe.echipaId),
    liderilEchipelor(lista.map((e) => e.id)),
  ]);

  const peEchipa = new Map(numere.map((n) => [n.echipaId, Number(n.cati)]));

  return lista
    .map((e) => ({
      ...e,
      lideri: aiLor.get(e.id) ?? [],
      cati: peEchipa.get(e.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        Number(b.activa) - Number(a.activa) || a.nume.localeCompare(b.nume, "ro"),
    );
}

/** O echipă și pulsiștii din ea. */
export async function echipa(echipaId: number) {
  const [e] = await db
    .select({
      id: echipeSlujire.id,
      nume: echipeSlujire.nume,
      descriere: echipeSlujire.descriere,
      activa: echipeSlujire.activa,
    })
    .from(echipeSlujire)
    .where(eq(echipeSlujire.id, echipaId));
  if (!e) return null;

  const [implicati, aiLor] = await Promise.all([
    db
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
      .leftJoin(grupe, eq(grupe.id, membri.grupaId))
      .where(eq(membriEchipe.echipaId, echipaId)),
    liderilEchipelor([echipaId]),
  ]);

  return {
    echipa: { ...e, lideri: aiLor.get(echipaId) ?? [] },
    membri: implicati.sort(
      (a, b) =>
        Number(b.activ) - Number(a.activ) || a.nume.localeCompare(b.nume, "ro"),
    ),
  };
}

/** În ce echipe de slujire e implicat un pulsist. */
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

/** Slujirile pe care le coordonează un lider. */
export async function echipeleLiderului(liderId: number): Promise<number[]> {
  const randuri = await db
    .select({ echipaId: lideriEchipe.echipaId })
    .from(lideriEchipe)
    .where(eq(lideriEchipe.liderId, liderId));
  return randuri.map((r) => r.echipaId);
}

/** Coordonează liderul slujirea asta? */
export async function esteLiderulEchipei(
  liderId: number,
  echipaId: number,
): Promise<boolean> {
  const [r] = await db
    .select({ liderId: lideriEchipe.liderId })
    .from(lideriEchipe)
    .where(
      and(eq(lideriEchipe.echipaId, echipaId), eq(lideriEchipe.liderId, liderId)),
    );
  return r !== undefined;
}

export type ProgramareAfisata = {
  id: number;
  data: string;
  titlu: string;
  detalii: string | null;
  ora: string | null;
  locatie: string | null;
  /** Grupele programate. Pot fi mai multe, sau niciuna. */
  grupe: GrupaScurta[];
  echipaId: number | null;
  echipaNume: string | null;
  /** Null cât timp nu s-a făcut prezența la slujirea asta. */
  prezentaMarcataLa: Date | null;
};

const campuriProgramare = {
  id: programariSlujire.id,
  data: programariSlujire.data,
  titlu: programariSlujire.titlu,
  detalii: programariSlujire.detalii,
  ora: programariSlujire.ora,
  locatie: programariSlujire.locatie,
  echipaId: programariSlujire.echipaId,
  echipaNume: echipeSlujire.nume,
  prezentaMarcataLa: programariSlujire.prezentaMarcataLa,
};

/**
 * Lipește grupele pe programările deja citite.
 *
 * Le luăm într-un al doilea drum, nu printr-un join: cu join-ul, o programare
 * cu trei grupe ar veni pe trei rânduri, iar orice „primele 20" ar tăia
 * aiurea, în mijlocul aceleiași slujiri.
 */
async function cuGrupele<T extends { id: number }>(
  randuri: T[],
): Promise<(T & { grupe: GrupaScurta[] })[]> {
  if (randuri.length === 0) return [];

  const legaturi = await db
    .select({
      programareId: programariGrupe.programareId,
      id: grupe.id,
      nume: grupe.nume,
    })
    .from(programariGrupe)
    .innerJoin(grupe, eq(grupe.id, programariGrupe.grupaId))
    .where(
      inArray(
        programariGrupe.programareId,
        randuri.map((r) => r.id),
      ),
    );

  const peProgramare = new Map<number, GrupaScurta[]>();
  for (const l of legaturi) {
    const lista = peProgramare.get(l.programareId) ?? [];
    lista.push({ id: l.id, nume: l.nume });
    peProgramare.set(l.programareId, lista);
  }
  for (const lista of peProgramare.values()) {
    lista.sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
  }

  return randuri.map((r) => ({ ...r, grupe: peProgramare.get(r.id) ?? [] }));
}

/** Condiția „programarea are măcar una dintre grupele astea". */
export function programariAleGrupelor(grupaIds: number[]) {
  return inArray(
    programariSlujire.id,
    db
      .select({ id: programariGrupe.programareId })
      .from(programariGrupe)
      .where(inArray(programariGrupe.grupaId, grupaIds)),
  );
}

/** Programările care urmează (implicit de azi înainte). */
export async function programariViitoare(
  limita = 30,
  deLa = dataAzi(),
): Promise<ProgramareAfisata[]> {
  const randuri = await db
    .select(campuriProgramare)
    .from(programariSlujire)
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(gte(programariSlujire.data, deLa))
    .orderBy(asc(programariSlujire.data))
    .limit(limita);
  return cuGrupele(randuri);
}

/** Programările care au trecut deja, cele mai recente întâi. */
export async function programariTrecute(limita = 20): Promise<ProgramareAfisata[]> {
  const randuri = await db
    .select(campuriProgramare)
    .from(programariSlujire)
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(lt(programariSlujire.data, dataAzi()))
    .orderBy(desc(programariSlujire.data))
    .limit(limita);
  return cuGrupele(randuri);
}

/** Echipele în care e implicat cel puțin un pulsist din grupele date. */
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
 * Ce urmează pentru un lider anume: programările grupelor lui, ale slujirilor
 * pe care le coordonează și ale echipelor în care are pulsiști. Adminul le
 * vede pe toate.
 */
export async function programariPentruLider(optiuni: {
  esteAdmin: boolean;
  liderId: number;
  grupaIds: number[];
  limita?: number;
}): Promise<ProgramareAfisata[]> {
  const limita = optiuni.limita ?? 20;
  if (optiuni.esteAdmin) return programariViitoare(limita);

  const [prinPulsisti, aleLui] = await Promise.all([
    echipeleGrupelor(optiuni.grupaIds),
    echipeleLiderului(optiuni.liderId),
  ]);
  const echipaIds = [...new Set([...prinPulsisti, ...aleLui])];
  if (optiuni.grupaIds.length === 0 && echipaIds.length === 0) return [];

  const conditii = [];
  if (optiuni.grupaIds.length > 0) {
    conditii.push(programariAleGrupelor(optiuni.grupaIds));
  }
  if (echipaIds.length > 0) {
    conditii.push(inArray(programariSlujire.echipaId, echipaIds));
  }

  const randuri = await db
    .select(campuriProgramare)
    .from(programariSlujire)
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(and(gte(programariSlujire.data, dataAzi()), or(...conditii)))
    .orderBy(asc(programariSlujire.data))
    .limit(limita);
  return cuGrupele(randuri);
}

/** Programările unei grupe care urmează - se arată pe pagina grupei. */
export async function programariGrupei(
  grupaId: number,
  limita = 5,
  /**
   * Câte zile în urmă intră și ele în listă. Slujirile trecute rămân la vedere
   * o vreme, altfel o prezență completată dispare de pe pagina grupei și
   * liderul n-are pe unde să se întoarcă la ea dacă vrea s-o îndrepte.
   */
  zileInUrma = 21,
): Promise<ProgramareAfisata[]> {
  const echipaIds = await echipeleGrupelor([grupaId]);
  const conditii = [programariAleGrupelor([grupaId])];
  if (echipaIds.length > 0) {
    conditii.push(inArray(programariSlujire.echipaId, echipaIds));
  }

  const randuri = await db
    .select(campuriProgramare)
    .from(programariSlujire)
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(
      and(
        gte(programariSlujire.data, adaugaZile(dataAzi(), -zileInUrma)),
        or(...conditii),
      ),
    )
    .orderBy(asc(programariSlujire.data))
    .limit(limita);
  return cuGrupele(randuri);
}

/**
 * Slujirile grupei la care ar trebui făcută prezența: au avut loc deja (azi
 * sau în urmă cu cel mult câteva săptămâni) și nu le-a completat nimeni.
 *
 * Ne oprim la 21 de zile dinadins. O slujire de acum două luni nu mai are
 * cine să și-o amintească, iar o listă care crește la nesfârșit ajunge să fie
 * ignorată - și atunci nu mai observi nici ce e proaspăt.
 */
export async function slujiriDeCompletat(
  grupaId: number,
  zileInUrma = 21,
): Promise<ProgramareAfisata[]> {
  const echipaIds = await echipeleGrupelor([grupaId]);
  const conditii = [programariAleGrupelor([grupaId])];
  if (echipaIds.length > 0) {
    conditii.push(inArray(programariSlujire.echipaId, echipaIds));
  }

  const azi = dataAzi();
  const randuri = await db
    .select(campuriProgramare)
    .from(programariSlujire)
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(
      and(
        lte(programariSlujire.data, azi),
        gte(programariSlujire.data, adaugaZile(azi, -zileInUrma)),
        isNull(programariSlujire.prezentaMarcataLa),
        or(...conditii),
      ),
    )
    .orderBy(desc(programariSlujire.data));
  return cuGrupele(randuri);
}

/** Programările care urmează pentru un pulsist (prin echipele lui). */
export async function programariMembrului(
  membruId: number,
  limita = 5,
): Promise<ProgramareAfisata[]> {
  const echipe = await echipeleMembrului(membruId);
  if (echipe.length === 0) return [];

  const randuri = await db
    .select(campuriProgramare)
    .from(programariSlujire)
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
  return cuGrupele(randuri);
}

/**
 * Locurile de slujire în care pulsistul încă nu e implicat.
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

/** Pulsiștii care încă nu sunt în echipa dată (pentru lista de adăugare). */
export async function pulsistiInAfaraEchipei(echipaId: number) {
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
    .leftJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(and(eq(membri.activ, true), eq(membri.status, "membru")))
    .orderBy(asc(membri.nume));

  return toti.filter((m) => !exclusi.has(m.id));
}

/**
 * Liderii care trebuie anunțați de o programare: liderii grupelor programate,
 * liderii slujirii, plus liderii grupelor din care fac parte pulsiștii ei.
 */
export async function liderilDeAnuntat(programareId: number): Promise<number[]> {
  const [p] = await db
    .select()
    .from(programariSlujire)
    .where(eq(programariSlujire.id, programareId));
  if (!p) return [];

  const aleProgramarii = await db
    .select({ grupaId: programariGrupe.grupaId })
    .from(programariGrupe)
    .where(eq(programariGrupe.programareId, programareId));
  const grupaIds = new Set(aleProgramarii.map((g) => g.grupaId));

  const deAnuntat = new Set<number>();

  if (p.echipaId) {
    const aiEchipei = await db
      .select({ liderId: lideriEchipe.liderId })
      .from(lideriEchipe)
      .innerJoin(lideri, eq(lideri.id, lideriEchipe.liderId))
      .where(and(eq(lideriEchipe.echipaId, p.echipaId), eq(lideri.activ, true)));
    for (const l of aiEchipei) deAnuntat.add(l.liderId);

    const dinEchipa = await db
      .select({ grupaId: membri.grupaId })
      .from(membriEchipe)
      .innerJoin(membri, eq(membri.id, membriEchipe.membruId))
      .where(and(eq(membriEchipe.echipaId, p.echipaId), eq(membri.activ, true)));
    // Cine n-are grupă n-are nici lideri de anunțat.
    for (const m of dinEchipa) if (m.grupaId !== null) grupaIds.add(m.grupaId);
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
    .selectDistinct({ grupaId: programariGrupe.grupaId })
    .from(programariGrupe)
    .innerJoin(
      programariSlujire,
      eq(programariSlujire.id, programariGrupe.programareId),
    )
    .where(gte(programariSlujire.data, azi));

  const ids = new Set(cuProgramare.map((c) => c.grupaId));

  const active = await db
    .select({ id: grupe.id, nume: grupe.nume })
    .from(grupe)
    .where(eq(grupe.activa, true))
    .orderBy(asc(grupe.nume));

  return active.filter((g) => !ids.has(g.id));
}
