import "server-only";

import { and, count, desc, eq, gte, inArray, lte, or } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  evenimente,
  grupe,
  membri,
  prezenteEveniment,
  type Eveniment,
} from "@/lib/db/schema";
import { dataDinMoment } from "@/lib/util/date";
import { FARA_GRUPA } from "@/lib/util/etichete";

/**
 * Prezența la întâlnirile cu toți.
 *
 * E a treia prezență din aplicație și nu se amestecă cu celelalte două. La
 * grupa mică se numără cine a venit la grupa lui, la slujire cine a venit să
 * slujească; aici, cine a fost la o întâlnire a lucrării întregi, unde nu se
 * stă pe grupe - gamenight, o seară de rugăciune.
 *
 * Nu e a niciunei grupe, deci pe listă sunt toți pulsiștii, iar o poate face
 * orice lider. Se bifează doar cine a venit: lipsa bifei înseamnă că n-a venit.
 */

/**
 * Dacă la o întâlnire se face prezența pe întâlnire.
 *
 * Doar la cele „toți împreună". În serile pe grupe mici prezența e pe grupe,
 * iar a doua listă ar spune același lucru mai prost; la cele doar ale
 * liderilor nu vin pulsiști, deci n-are cine fi bifat. Excepția e întâlnirea
 * care are deja bife și a fost mutată apoi: ce s-a bifat nu dispare din
 * vedere doar pentru că s-a schimbat o alegere în calendar.
 */
export function arePrezentaPeIntalnire(
  eveniment: Pick<Eveniment, "peGrupeMici" | "doarLideri">,
  venitiDeja: number,
): boolean {
  return (!eveniment.peGrupeMici && !eveniment.doarLideri) || venitiDeja > 0;
}

/** O întâlnire din calendar, sau null dacă nu (mai) există. */
export async function evenimentul(evenimentId: number) {
  const [e] = await db
    .select()
    .from(evenimente)
    .where(eq(evenimente.id, evenimentId));
  return e ?? null;
}

export type PersoanaLaIntalnire = {
  id: number;
  nume: string;
  grupaId: number | null;
  grupaNume: string | null;
  musafir: boolean;
};

export type FoaieIntalnire = {
  persoane: PersoanaLaIntalnire[];
  /** Cine e bifat deja. */
  venit: number[];
};

/**
 * Lista de la ușă: toți pulsiștii activi, oricare le-ar fi grupa, plus cei
 * fără grupă și musafirii.
 *
 * Intră și cei care între timp au devenit inactivi, dacă au fost bifați la
 * întâlnirea asta: au fost acolo, iar a-i scoate de pe listă ar face bifa lor
 * de neatins.
 */
export async function foaiaIntalnirii(
  evenimentId: number,
): Promise<FoaieIntalnire> {
  const venit = await cineAVenit(evenimentId);

  const conditie =
    venit.length > 0
      ? or(eq(membri.activ, true), inArray(membri.id, venit))
      : eq(membri.activ, true);

  const randuri = await db
    .select({
      id: membri.id,
      nume: membri.nume,
      grupaId: membri.grupaId,
      grupaNume: grupe.nume,
      status: membri.status,
    })
    .from(membri)
    .leftJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(conditie);

  const persoane = randuri
    .map(({ status, ...p }) => ({ ...p, musafir: status === "musafir" }))
    .sort((a, b) => a.nume.localeCompare(b.nume, "ro"));

  return { persoane, venit };
}

/** Id-urile celor bifați la o întâlnire. */
export async function cineAVenit(evenimentId: number): Promise<number[]> {
  const randuri = await db
    .select({ membruId: prezenteEveniment.membruId })
    .from(prezenteEveniment)
    .where(eq(prezenteEveniment.evenimentId, evenimentId));
  return randuri.map((r) => r.membruId);
}

/**
 * Pune sau scoate o bifă.
 *
 * Fiecare atingere e un rând scris sau șters, niciodată o foaie întreagă
 * rescrisă. Așa doi lideri care bifează în același timp nu-și șterg unul
 * altuia bifele. Întoarce lista la zi, cu tot ce au bifat și ceilalți.
 */
export async function bifeazaLaIntalnire(optiuni: {
  evenimentId: number;
  membruId: number;
  aVenit: boolean;
  liderId: number;
}): Promise<number[]> {
  const { evenimentId, membruId, aVenit, liderId } = optiuni;

  if (aVenit) {
    await db
      .insert(prezenteEveniment)
      .values({ evenimentId, membruId, marcatDeId: liderId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(prezenteEveniment)
      .where(
        and(
          eq(prezenteEveniment.evenimentId, evenimentId),
          eq(prezenteEveniment.membruId, membruId),
        ),
      );
  }

  return cineAVenit(evenimentId);
}

/** Dacă liderul a mai pus vreo bifă la întâlnirea asta. */
export async function aBifatDeja(
  evenimentId: number,
  liderId: number,
): Promise<boolean> {
  const [rand] = await db
    .select({ membruId: prezenteEveniment.membruId })
    .from(prezenteEveniment)
    .where(
      and(
        eq(prezenteEveniment.evenimentId, evenimentId),
        eq(prezenteEveniment.marcatDeId, liderId),
      ),
    )
    .limit(1);
  return !!rand;
}

/** Câți au venit la fiecare dintre întâlnirile date. Cele fără bife lipsesc. */
export async function venitiLaIntalniri(
  evenimentIds: number[],
): Promise<Map<number, number>> {
  if (evenimentIds.length === 0) return new Map();

  const randuri = await db
    .select({ evenimentId: prezenteEveniment.evenimentId, cati: count() })
    .from(prezenteEveniment)
    .where(inArray(prezenteEveniment.evenimentId, evenimentIds))
    .groupBy(prezenteEveniment.evenimentId);

  return new Map(randuri.map((r) => [r.evenimentId, Number(r.cati)]));
}

export type IntalnireCuTotiAzi = {
  id: number;
  titlu: string;
  ora: string | null;
  veniti: number;
};

/** Întâlnirile cu toți dintr-o zi, cu câți au venit la fiecare până acum. */
export async function intalnirileCuTotiDin(
  data: string,
): Promise<IntalnireCuTotiAzi[]> {
  const aleZilei = await db
    .select({
      id: evenimente.id,
      titlu: evenimente.titlu,
      ora: evenimente.ora,
    })
    .from(evenimente)
    .where(
      and(
        eq(evenimente.data, data),
        eq(evenimente.peGrupeMici, false),
        eq(evenimente.doarLideri, false),
      ),
    )
    .orderBy(evenimente.ora);

  const veniti = await venitiLaIntalniri(aleZilei.map((e) => e.id));
  return aleZilei.map((e) => ({ ...e, veniti: veniti.get(e.id) ?? 0 }));
}

export type IntalnireCuTotiInPerioada = {
  id: number;
  data: string;
  titlu: string;
  /** Câți au venit - dintre cei pe care îi vede cel care se uită. */
  veniti: number;
  musafiri: number;
};

export type GrupaLaCuToti = {
  cheie: string;
  nume: string;
  /** Membrii grupei așteptați măcar la o întâlnire din perioadă. */
  membri: number;
  venitiInMedie: number | null;
  procent: number | null;
};

export type PulsistLaCuToti = {
  membruId: number;
  nume: string;
  grupa: string;
  aVenit: number;
  dinCate: number;
  procent: number;
};

export type StatisticiCuToti = {
  intalniri: IntalnireCuTotiInPerioada[];
  rezumat: {
    intalniri: number;
    /** Cu musafiri cu tot - câți au fost în sală, în medie. */
    venitiInMedie: number | null;
    /** Membri care au venit măcar o dată. */
    membri: number;
    /** Musafiri diferiți care au venit măcar o dată. */
    musafiri: number;
    /** Doar pe membri, ca peste tot în statistici. */
    procent: number | null;
  };
  peGrupe: GrupaLaCuToti[];
  /** Fiecare membru așteptat la măcar o întâlnire, cu cât a venit. */
  pePulsisti: PulsistLaCuToti[];
};

/**
 * Statisticile întâlnirilor cu toți pe o perioadă.
 *
 * Stau separat de cele ale grupelor și se socotesc altfel. La grupă fiecare
 * are o bifă la fiecare seară - prezent, a anunțat, absent. Aici se bifează
 * doar cine a venit, deci cine e „așteptat" și n-a venit se deduce: e membru
 * al lucrării și era deja în aplicație în ziua întâlnirii. Intră doar
 * întâlnirile la care chiar s-a făcut prezența.
 *
 * Aceeași regulă ca la grupe: procentele sunt doar pe membri, musafirii se
 * numără separat. Grupa e cea de acum a pulsistului - întâlnirea n-a fost a
 * niciunei grupe, deci n-are alta de unde s-o ia.
 */
export async function statisticiCuToti(filtru: {
  deLa: string;
  panaLa: string;
  /** Grupele pe care le vede cel care se uită. Lipsă = toată lucrarea. */
  grupaIds?: number[];
}): Promise<StatisticiCuToti> {
  const { deLa, panaLa, grupaIds } = filtru;
  const goale: StatisticiCuToti = {
    intalniri: [],
    rezumat: { intalniri: 0, venitiInMedie: null, membri: 0, musafiri: 0, procent: null },
    peGrupe: [],
    pePulsisti: [],
  };
  if (grupaIds && grupaIds.length === 0) return goale;

  const cuPrezenta = db
    .selectDistinct({ id: prezenteEveniment.evenimentId })
    .from(prezenteEveniment);
  const intalniri = await db
    .select({ id: evenimente.id, data: evenimente.data, titlu: evenimente.titlu })
    .from(evenimente)
    .where(
      and(
        gte(evenimente.data, deLa),
        lte(evenimente.data, panaLa),
        inArray(evenimente.id, cuPrezenta),
      ),
    )
    .orderBy(evenimente.data, evenimente.ora);
  if (intalniri.length === 0) return goale;

  const ids = intalniri.map((i) => i.id);
  const inScop = grupaIds ? inArray(membri.grupaId, grupaIds) : undefined;

  const bife = await db
    .select({
      evenimentId: prezenteEveniment.evenimentId,
      membruId: prezenteEveniment.membruId,
      status: membri.status,
    })
    .from(prezenteEveniment)
    .innerJoin(membri, eq(membri.id, prezenteEveniment.membruId))
    .where(and(inArray(prezenteEveniment.evenimentId, ids), inScop));

  /*
    Membrii de care se așteaptă să vină: cei activi, plus cei care între timp
    au plecat, dar au fost la vreuna - au fost acolo, deci au fost și așteptați.
  */
  const auVenit = [...new Set(bife.map((b) => b.membruId))];
  const candidati = await db
    .select({
      id: membri.id,
      nume: membri.nume,
      grupaId: membri.grupaId,
      grupaNume: grupe.nume,
      creatLa: membri.creatLa,
    })
    .from(membri)
    .leftJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(
      and(
        eq(membri.status, "membru"),
        inScop,
        auVenit.length > 0
          ? or(eq(membri.activ, true), inArray(membri.id, auVenit))
          : eq(membri.activ, true),
      ),
    );

  const venitLa = new Map<number, Set<number>>();
  for (const b of bife) {
    const s = venitLa.get(b.membruId) ?? new Set<number>();
    s.add(b.evenimentId);
    venitLa.set(b.membruId, s);
  }

  const pePulsisti: (PulsistLaCuToti & { cheieGrupa: string })[] = [];
  for (const m of candidati) {
    const dinZiua = dataDinMoment(m.creatLa);
    const aLui = venitLa.get(m.id) ?? new Set<number>();
    // Așteptat de când e în aplicație - și oriunde a venit, chiar dacă înainte.
    const dinCate = intalniri.filter((i) => i.data >= dinZiua || aLui.has(i.id)).length;
    if (dinCate === 0) continue;
    pePulsisti.push({
      membruId: m.id,
      nume: m.nume,
      grupa: m.grupaNume ?? FARA_GRUPA,
      cheieGrupa: m.grupaId === null ? "fara" : String(m.grupaId),
      aVenit: aLui.size,
      dinCate,
      procent: Math.round((aLui.size / dinCate) * 100),
    });
  }

  const intalnirile = intalniri.map((i) => {
    const aleEi = bife.filter((b) => b.evenimentId === i.id);
    return {
      ...i,
      veniti: aleEi.length,
      musafiri: aleEi.filter((b) => b.status === "musafir").length,
    };
  });

  const peGrupa = new Map<string, { nume: string; oameni: typeof pePulsisti }>();
  for (const p of pePulsisti) {
    const g = peGrupa.get(p.cheieGrupa) ?? { nume: p.grupa, oameni: [] };
    g.oameni.push(p);
    peGrupa.set(p.cheieGrupa, g);
  }

  const suma = (lista: typeof pePulsisti, camp: "aVenit" | "dinCate") =>
    lista.reduce((s, p) => s + p[camp], 0);
  const procentDin = (lista: typeof pePulsisti) => {
    const asteptari = suma(lista, "dinCate");
    return asteptari ? Math.round((suma(lista, "aVenit") / asteptari) * 100) : null;
  };
  const medie = (cati: number) =>
    Math.round((cati / intalniri.length) * 10) / 10;

  return {
    intalniri: intalnirile,
    rezumat: {
      intalniri: intalniri.length,
      venitiInMedie: medie(bife.length),
      membri: pePulsisti.filter((p) => p.aVenit > 0).length,
      musafiri: new Set(
        bife.filter((b) => b.status === "musafir").map((b) => b.membruId),
      ).size,
      procent: procentDin(pePulsisti),
    },
    peGrupe: [...peGrupa.entries()]
      .map(([cheie, g]) => ({
        cheie,
        nume: g.nume,
        membri: g.oameni.length,
        venitiInMedie: medie(suma(g.oameni, "aVenit")),
        procent: procentDin(g.oameni),
      }))
      .sort(
        (a, b) =>
          Number(a.cheie === "fara") - Number(b.cheie === "fara") ||
          a.nume.localeCompare(b.nume, "ro"),
      ),
    pePulsisti: pePulsisti
      .map(({ cheieGrupa: _c, ...p }) => p)
      .sort((a, b) => b.procent - a.procent || a.nume.localeCompare(b.nume, "ro")),
  };
}

export type IstoricIntalnireCuToti = {
  id: number;
  data: string;
  titlu: string;
  aVenit: boolean;
};

/**
 * Ultimele întâlniri cu toți, și dacă pulsistul a fost la ele.
 *
 * Se socotesc doar întâlnirile la care chiar s-a făcut prezența - o seară
 * fără nicio bifă nu spune că n-a venit nimeni, ci că n-a bifat nimeni.
 * Și doar de când e pulsistul în aplicație: pe cine s-a înscris în octombrie
 * nu-l trecem absent la gamenightul din septembrie. Unde a fost bifat însă
 * apare oricum - musafirul scris abia a doua zi a fost acolo.
 */
export async function istoricIntalniriCuToti(
  membruId: number,
  inAplicatieDin: Date,
  panaLa: string,
  limita = 12,
): Promise<IstoricIntalnireCuToti[]> {
  const aleLui = await db
    .select({ evenimentId: prezenteEveniment.evenimentId })
    .from(prezenteEveniment)
    .where(eq(prezenteEveniment.membruId, membruId));
  const aVenitLa = new Set(aleLui.map((r) => r.evenimentId));

  const cuPrezenta = db
    .selectDistinct({ id: prezenteEveniment.evenimentId })
    .from(prezenteEveniment);

  const deCand = gte(evenimente.data, dataDinMoment(inAplicatieDin));
  const intalniri = await db
    .select({ id: evenimente.id, data: evenimente.data, titlu: evenimente.titlu })
    .from(evenimente)
    .where(
      and(
        inArray(evenimente.id, cuPrezenta),
        lte(evenimente.data, panaLa),
        aVenitLa.size > 0
          ? or(deCand, inArray(evenimente.id, [...aVenitLa]))
          : deCand,
      ),
    )
    .orderBy(desc(evenimente.data))
    .limit(limita);

  return intalniri.map((i) => ({ ...i, aVenit: aVenitLa.has(i.id) }));
}
