import "server-only";

import { and, asc, eq, gte, inArray, lte, or } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  echipeSlujire,
  evenimente,
  grupe,
  programariGrupe,
  programariSlujire,
} from "@/lib/db/schema";
import { venitiLaIntalniri } from "@/lib/interogari/prezenta-eveniment";
import {
  echipeleGrupelor,
  echipeleLiderului,
  programariAleGrupelor,
} from "@/lib/interogari/slujiri";

/**
 * Calendarul: ce are lucrarea de făcut într-o lună.
 *
 * Sunt două feluri de lucruri, puse laolaltă pe aceleași zile:
 *  - ÎNTÂLNIRILE, scrise de coordonator (Puls de vineri, gamenight, o seară
 *    de rugăciune, o ședință a liderilor). Le vede toată lumea, la fel;
 *  - SLUJIRILE deja programate, dar numai cele care îl privesc pe cel care
 *    se uită: ale grupelor lui și ale echipelor în care are pulsiști.
 *    Adminul le vede pe toate.
 *
 * Ies amestecate într-o singură listă, sortată pe zile, ca pagina să nu fie
 * nevoită să le împerecheze singură.
 */

export type ElementCalendar = {
  /** Unic în toată luna - „ev-12" sau „sl-7". Merge ca `key` în React. */
  cheie: string;
  fel: "eveniment" | "slujire";
  id: number;
  data: string;
  titlu: string;
  ora: string | null;
  locatie: string | null;
  detalii: string | null;
  /** Doar la întâlniri: în ziua aia se stă pe grupe mici. */
  peGrupeMici: boolean;
  /** Doar la întâlniri: e a liderilor, fără pulsiști și fără prezență. */
  doarLideri: boolean;
  /** Doar la slujiri: cine slujește („Grup Ralu + Laudă"). */
  cine: string | null;
  /** Doar la slujiri: prezența e deja completată. */
  prezentaFacuta: boolean;
  /** Doar la întâlniri: câți au fost bifați la prezența pe întâlnire. */
  veniti: number;
};

/** Întâlnirile dintr-un interval de zile (inclusiv capetele). */
async function intalniriIntre(
  deLa: string,
  panaLa: string,
): Promise<ElementCalendar[]> {
  const randuri = await db
    .select()
    .from(evenimente)
    .where(and(gte(evenimente.data, deLa), lte(evenimente.data, panaLa)))
    .orderBy(asc(evenimente.data), asc(evenimente.ora));

  const veniti = await venitiLaIntalniri(randuri.map((e) => e.id));

  return randuri.map((e) => ({
    cheie: `ev-${e.id}`,
    fel: "eveniment" as const,
    id: e.id,
    data: e.data,
    titlu: e.titlu,
    ora: e.ora,
    locatie: e.locatie,
    detalii: e.detalii,
    peGrupeMici: e.peGrupeMici,
    doarLideri: e.doarLideri,
    cine: null,
    prezentaFacuta: false,
    veniti: veniti.get(e.id) ?? 0,
  }));
}

/**
 * Slujirile dintr-un interval, filtrate după cine se uită.
 *
 * Liderul vede ce îl privește: slujirile grupelor lui și cele ale echipelor
 * în care are pulsiști. Într-un calendar al lucrării întregi n-ar mai găsi
 * ce e al lui.
 */
async function slujiriIntre(optiuni: {
  esteAdmin: boolean;
  liderId: number;
  grupaIds: number[];
  deLa: string;
  panaLa: string;
}): Promise<ElementCalendar[]> {
  const inInterval = and(
    gte(programariSlujire.data, optiuni.deLa),
    lte(programariSlujire.data, optiuni.panaLa),
  );

  let unde = inInterval;

  if (!optiuni.esteAdmin) {
    const [prinPulsisti, aleLui] = await Promise.all([
      echipeleGrupelor(optiuni.grupaIds),
      echipeleLiderului(optiuni.liderId),
    ]);
    const echipaIds = [...new Set([...prinPulsisti, ...aleLui])];
    const conditii = [];
    if (optiuni.grupaIds.length > 0) {
      conditii.push(programariAleGrupelor(optiuni.grupaIds));
    }
    if (echipaIds.length > 0) {
      conditii.push(inArray(programariSlujire.echipaId, echipaIds));
    }
    if (conditii.length === 0) return [];
    unde = and(inInterval, or(...conditii));
  }

  const randuri = await db
    .select({
      id: programariSlujire.id,
      data: programariSlujire.data,
      titlu: programariSlujire.titlu,
      ora: programariSlujire.ora,
      locatie: programariSlujire.locatie,
      detalii: programariSlujire.detalii,
      echipaNume: echipeSlujire.nume,
      prezentaMarcataLa: programariSlujire.prezentaMarcataLa,
    })
    .from(programariSlujire)
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .where(unde)
    .orderBy(asc(programariSlujire.data), asc(programariSlujire.ora));

  if (randuri.length === 0) return [];

  const legaturi = await db
    .select({
      programareId: programariGrupe.programareId,
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

  const numeGrupe = new Map<number, string[]>();
  for (const l of legaturi) {
    const lista = numeGrupe.get(l.programareId) ?? [];
    lista.push(l.nume);
    numeGrupe.set(l.programareId, lista);
  }

  return randuri.map((p) => ({
    cheie: `sl-${p.id}`,
    fel: "slujire" as const,
    id: p.id,
    data: p.data,
    titlu: p.titlu,
    ora: p.ora,
    locatie: p.locatie,
    detalii: p.detalii,
    peGrupeMici: false,
    doarLideri: false,
    cine:
      [...(numeGrupe.get(p.id) ?? []).sort((a, b) => a.localeCompare(b, "ro")), p.echipaNume]
        .filter(Boolean)
        .join(" + ") || null,
    prezentaFacuta: p.prezentaMarcataLa !== null,
    veniti: 0,
  }));
}

/** Tot ce se vede pe calendar într-un interval, într-o singură listă. */
export async function calendarul(optiuni: {
  esteAdmin: boolean;
  liderId: number;
  grupaIds: number[];
  deLa: string;
  panaLa: string;
}): Promise<ElementCalendar[]> {
  const [intalniri, slujiri] = await Promise.all([
    intalniriIntre(optiuni.deLa, optiuni.panaLa),
    slujiriIntre(optiuni),
  ]);

  /*
    Ordinea în care apar într-o zi: întâi întâlnirea lucrării, apoi slujirile.
    Cele cu oră scrisă trec înaintea celor fără - o oră necunoscută n-are ce
    căuta între două ore știute.
  */
  return [...intalniri, ...slujiri].sort(
    (a, b) =>
      a.data.localeCompare(b.data) ||
      Number(a.fel === "slujire") - Number(b.fel === "slujire") ||
      (a.ora ?? "99").localeCompare(b.ora ?? "99"),
  );
}
