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
 * iar a doua listă ar spune același lucru mai prost. Excepția e întâlnirea
 * care are deja bife și a fost mutată apoi pe grupe mici: ce s-a bifat nu
 * dispare din vedere doar pentru că s-a schimbat o bifă în calendar.
 */
export function arePrezentaPeIntalnire(
  eveniment: Pick<Eveniment, "peGrupeMici">,
  venitiDeja: number,
): boolean {
  return !eveniment.peGrupeMici || venitiDeja > 0;
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
    .where(and(eq(evenimente.data, data), eq(evenimente.peGrupeMici, false)))
    .orderBy(evenimente.ora);

  const veniti = await venitiLaIntalniri(aleZilei.map((e) => e.id));
  return aleZilei.map((e) => ({ ...e, veniti: veniti.get(e.id) ?? 0 }));
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
