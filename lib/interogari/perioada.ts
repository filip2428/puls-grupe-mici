import "server-only";

import { and, eq, gte, inArray, lte, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  biserici,
  grupe,
  intalniri,
  membri,
  prezenteSlujire,
  prezente,
  programariSlujire,
} from "@/lib/db/schema";
import { etichetaClasa } from "@/lib/util/etichete";
import { lunaLizibila } from "@/lib/util/date";

/**
 * Statisticile lucrării pe o perioadă aleasă - de obicei un an bisericesc.
 *
 * Totul pleacă dintr-o singură citire: întâlnirile din perioadă și bifele de
 * pe ele. Din aceleași rânduri ies și tabelul pe grupe, și cel pe biserici, și
 * cel pe luni - altfel ar fi însemnat cinci drumuri la baza de date pentru
 * cinci feluri de a privi același lucru.
 *
 * O regulă ține peste tot, aceeași ca în restul aplicației: PROCENTELE SE
 * CALCULEAZĂ DOAR PE MEMBRI. Musafirii vin când pot, n-au promis nimănui
 * nimic, iar dacă i-am pune la medie ar trage-o în jos fără să spună nimic
 * adevărat. Sunt număraţi separat, unde chiar contează câți au trecut pragul.
 */

export type FiltruPerioada = {
  deLa: string;
  panaLa: string;
  /** Grupele pe care le poate vedea cel care se uită. Lipsă = toate. */
  grupaIds?: number[];
};

export type RandGrupa = {
  grupaId: number;
  nume: string;
  intalniri: number;
  membri: number;
  musafiri: number;
  prezentiInMedie: number | null;
  procent: number | null;
};

export type RandBiserica = {
  /** Unic per fel de răspuns: „harvest", „b:3", „alta", „fara", „nescris". */
  cheie: string;
  nume: string;
  pulsisti: number;
  procent: number | null;
};

/** Aceeași formă, dar cheia e chiar denominațiunea („baptistă", „nescrisă"). */
export type RandDenominatiune = RandBiserica;

/** Aceeași formă: cheia e „botezat", „nebotezat" sau „nescris". */
export type RandBotez = RandBiserica;

export type RandLuna = {
  luna: string;
  nume: string;
  intalniri: number;
  prezentiInMedie: number | null;
  procent: number | null;
};

export type RandClasa = {
  clasa: number | null;
  nume: string;
  pulsisti: number;
  procent: number | null;
};

export type RandPulsist = {
  membruId: number;
  nume: string;
  grupa: string;
  prezente: number;
  anuntate: number;
  absente: number;
  dinCate: number;
  procent: number;
};

export type StatisticiPerioada = {
  deLa: string;
  panaLa: string;
  rezumat: {
    intalniri: number;
    grupe: number;
    membri: number;
    musafiri: number;
    prezentiInMedie: number | null;
    procent: number | null;
    prezente: number;
    anuntate: number;
    absente: number;
    pulsistiNoi: number;
    primitiInGrupa: number;
    slujiri: number;
    auSlujit: number;
  };
  peGrupe: RandGrupa[];
  peBiserici: RandBiserica[];
  /** Gol dacă nu s-a scris nicio denominațiune - un tabel de nimic nu ajută. */
  peDenominatiuni: RandDenominatiune[];
  peBotez: RandBotez[];
  peLuni: RandLuna[];
  peClase: RandClasa[];
  fidelitate: { prag: string; pulsisti: number }[];
  /** Cei sub 50%, cei mai rari primii - lista de sunat la început de an. */
  deCautat: RandPulsist[];
  /** Cei care n-au lipsit deloc. Se laudă prea rar. */
  faraLipsa: RandPulsist[];
};

type Bifa = {
  intalnireId: number;
  membruId: number;
  stare: "prezent" | "motivat" | "absent";
  nume: string;
  grupaId: number;
  clasa: number | null;
  status: "membru" | "musafir";
  biserica: "harvest" | "alta" | "fara" | null;
  bisericaId: number | null;
  bisericaNume: string | null;
  bisericaLocalitate: string | null;
  bisericaDenominatiune: string | null;
  botez: "botezat" | "nebotezat" | null;
};

/** Numărătoarea de bază, din care ies toate procentele. */
type Numere = { prezente: number; anuntate: number; absente: number };

function numereGoale(): Numere {
  return { prezente: 0, anuntate: 0, absente: 0 };
}

function adauga(n: Numere, stare: Bifa["stare"]) {
  if (stare === "prezent") n.prezente++;
  else if (stare === "motivat") n.anuntate++;
  else n.absente++;
}

function total(n: Numere): number {
  return n.prezente + n.anuntate + n.absente;
}

function procent(n: Numere): number | null {
  const t = total(n);
  return t ? Math.round((n.prezente / t) * 100) : null;
}

/** Media rotunjită la o zecimală - „7,5 prezenți" spune mai mult decât „8". */
function medie(suma: number, cate: number): number | null {
  if (cate === 0) return null;
  return Math.round((suma / cate) * 10) / 10;
}

export async function statisticiPerioada(
  filtru: FiltruPerioada,
): Promise<StatisticiPerioada> {
  const { deLa, panaLa, grupaIds } = filtru;

  const conditii: SQL[] = [
    gte(intalniri.data, deLa),
    lte(intalniri.data, panaLa),
  ];
  if (grupaIds) {
    if (grupaIds.length === 0) return goale(deLa, panaLa);
    conditii.push(inArray(intalniri.grupaId, grupaIds));
  }

  const listaIntalniri = await db
    .select({ id: intalniri.id, grupaId: intalniri.grupaId, data: intalniri.data })
    .from(intalniri)
    .where(and(...conditii));

  const bife: Bifa[] =
    listaIntalniri.length === 0
      ? []
      : await db
          .select({
            intalnireId: prezente.intalnireId,
            membruId: prezente.membruId,
            stare: prezente.stare,
            nume: membri.nume,
            grupaId: membri.grupaId,
            clasa: membri.clasa,
            status: membri.status,
            biserica: membri.biserica,
            bisericaId: membri.bisericaId,
            bisericaNume: biserici.nume,
            bisericaLocalitate: biserici.localitate,
            bisericaDenominatiune: biserici.denominatiune,
            botez: membri.botez,
          })
          .from(prezente)
          .innerJoin(membri, eq(membri.id, prezente.membruId))
          .leftJoin(biserici, eq(biserici.id, membri.bisericaId))
          .where(
            inArray(
              prezente.intalnireId,
              listaIntalniri.map((i) => i.id),
            ),
          );

  const alMembrilor = bife.filter((b) => b.status === "membru");

  const [numeGrupe, pulsistiNoi, primiti, slujiri, auSlujit] = await Promise.all([
    numeleGrupelor(grupaIds),
    catiPulsistiNoi(filtru),
    catiPrimitiInGrupa(filtru),
    cateSlujiri(filtru),
    catiAuSlujit(filtru),
  ]);

  const intalnireaGrupei = new Map(listaIntalniri.map((i) => [i.id, i.grupaId]));
  const lunaIntalnirii = new Map(
    listaIntalniri.map((i) => [i.id, i.data.slice(0, 7)]),
  );

  return {
    deLa,
    panaLa,
    rezumat: rezumatul(
      listaIntalniri,
      bife,
      alMembrilor,
      pulsistiNoi,
      primiti,
      slujiri,
      auSlujit,
    ),
    peGrupe: peGrupe(listaIntalniri, bife, numeGrupe, intalnireaGrupei),
    peBiserici: peBiserici(alMembrilor),
    peDenominatiuni: peDenominatiuni(alMembrilor),
    peBotez: peBotez(alMembrilor),
    peLuni: peLuni(listaIntalniri, alMembrilor, lunaIntalnirii),
    peClase: peClase(alMembrilor),
    ...fidelitatea(alMembrilor, numeGrupe),
  };
}

/** Ce întoarcem când cel care se uită n-are nicio grupă. */
function goale(deLa: string, panaLa: string): StatisticiPerioada {
  return {
    deLa,
    panaLa,
    rezumat: {
      intalniri: 0,
      grupe: 0,
      membri: 0,
      musafiri: 0,
      prezentiInMedie: null,
      procent: null,
      prezente: 0,
      anuntate: 0,
      absente: 0,
      pulsistiNoi: 0,
      primitiInGrupa: 0,
      slujiri: 0,
      auSlujit: 0,
    },
    peGrupe: [],
    peBiserici: [],
    peDenominatiuni: [],
    peBotez: [],
    peLuni: [],
    peClase: [],
    fidelitate: [],
    deCautat: [],
    faraLipsa: [],
  };
}

async function numeleGrupelor(
  grupaIds: number[] | undefined,
): Promise<Map<number, string>> {
  const lista = grupaIds
    ? await db
        .select({ id: grupe.id, nume: grupe.nume })
        .from(grupe)
        .where(inArray(grupe.id, grupaIds))
    : await db.select({ id: grupe.id, nume: grupe.nume }).from(grupe);
  return new Map(lista.map((g) => [g.id, g.nume]));
}

/** Câți pulsiști au fost adăugați în perioadă (indiferent ce sunt acum). */
async function catiPulsistiNoi(filtru: FiltruPerioada): Promise<number> {
  const conditii: SQL[] = [
    gte(membri.creatLa, new Date(`${filtru.deLa}T00:00:00Z`)),
    lte(membri.creatLa, new Date(`${filtru.panaLa}T23:59:59Z`)),
  ];
  if (filtru.grupaIds) conditii.push(inArray(membri.grupaId, filtru.grupaIds));
  const lista = await db
    .select({ id: membri.id })
    .from(membri)
    .where(and(...conditii));
  return lista.length;
}

/** Câți musafiri au fost primiți în grupă în perioadă. */
async function catiPrimitiInGrupa(filtru: FiltruPerioada): Promise<number> {
  const conditii: SQL[] = [
    gte(membri.devenitMembruLa, filtru.deLa),
    lte(membri.devenitMembruLa, filtru.panaLa),
  ];
  if (filtru.grupaIds) conditii.push(inArray(membri.grupaId, filtru.grupaIds));
  const lista = await db
    .select({ id: membri.id })
    .from(membri)
    .where(and(...conditii));
  return lista.length;
}

async function cateSlujiri(filtru: FiltruPerioada): Promise<number> {
  const conditii: SQL[] = [
    gte(programariSlujire.data, filtru.deLa),
    lte(programariSlujire.data, filtru.panaLa),
  ];
  if (filtru.grupaIds) {
    conditii.push(inArray(programariSlujire.grupaId, filtru.grupaIds));
  }
  const lista = await db
    .select({ id: programariSlujire.id })
    .from(programariSlujire)
    .where(and(...conditii));
  return lista.length;
}

/** Câți pulsiști au slujit măcar o dată în perioadă. */
async function catiAuSlujit(filtru: FiltruPerioada): Promise<number> {
  const conditii: SQL[] = [
    gte(programariSlujire.data, filtru.deLa),
    lte(programariSlujire.data, filtru.panaLa),
    eq(prezenteSlujire.stare, "prezent"),
  ];
  if (filtru.grupaIds) conditii.push(inArray(membri.grupaId, filtru.grupaIds));

  const lista = await db
    .selectDistinct({ membruId: prezenteSlujire.membruId })
    .from(prezenteSlujire)
    .innerJoin(
      programariSlujire,
      eq(programariSlujire.id, prezenteSlujire.programareId),
    )
    .innerJoin(membri, eq(membri.id, prezenteSlujire.membruId))
    .where(and(...conditii));
  return lista.length;
}

function rezumatul(
  listaIntalniri: { id: number; grupaId: number }[],
  bife: Bifa[],
  alMembrilor: Bifa[],
  pulsistiNoi: number,
  primitiInGrupa: number,
  slujiri: number,
  auSlujit: number,
): StatisticiPerioada["rezumat"] {
  const n = numereGoale();
  for (const b of alMembrilor) adauga(n, b.stare);

  return {
    intalniri: listaIntalniri.length,
    grupe: new Set(listaIntalniri.map((i) => i.grupaId)).size,
    membri: new Set(alMembrilor.map((b) => b.membruId)).size,
    musafiri: new Set(
      bife.filter((b) => b.status === "musafir").map((b) => b.membruId),
    ).size,
    prezentiInMedie: medie(n.prezente, listaIntalniri.length),
    procent: procent(n),
    prezente: n.prezente,
    anuntate: n.anuntate,
    absente: n.absente,
    pulsistiNoi,
    primitiInGrupa,
    slujiri,
    auSlujit,
  };
}

function peGrupe(
  listaIntalniri: { id: number; grupaId: number }[],
  bife: Bifa[],
  numeGrupe: Map<number, string>,
  intalnireaGrupei: Map<number, number>,
): RandGrupa[] {
  const cateIntalniri = new Map<number, number>();
  for (const i of listaIntalniri) {
    cateIntalniri.set(i.grupaId, (cateIntalniri.get(i.grupaId) ?? 0) + 1);
  }

  const numere = new Map<number, Numere>();
  const membriiGrupei = new Map<number, Set<number>>();
  const musafiriiGrupei = new Map<number, Set<number>>();

  for (const b of bife) {
    /*
      Grupa e a ÎNTÂLNIRII, nu a pulsistului: dacă între timp a fost mutat,
      prezența lui de atunci trebuie să rămână la grupa în care a fost.
    */
    const grupaId = intalnireaGrupei.get(b.intalnireId) ?? b.grupaId;
    const unde = b.status === "membru" ? membriiGrupei : musafiriiGrupei;
    const set = unde.get(grupaId) ?? new Set<number>();
    set.add(b.membruId);
    unde.set(grupaId, set);

    if (b.status !== "membru") continue;
    const n = numere.get(grupaId) ?? numereGoale();
    adauga(n, b.stare);
    numere.set(grupaId, n);
  }

  return [...cateIntalniri.keys()]
    .map((grupaId) => {
      const n = numere.get(grupaId) ?? numereGoale();
      return {
        grupaId,
        nume: numeGrupe.get(grupaId) ?? `Grupa ${grupaId}`,
        intalniri: cateIntalniri.get(grupaId) ?? 0,
        membri: membriiGrupei.get(grupaId)?.size ?? 0,
        musafiri: musafiriiGrupei.get(grupaId)?.size ?? 0,
        prezentiInMedie: medie(n.prezente, cateIntalniri.get(grupaId) ?? 0),
        procent: procent(n),
      };
    })
    .sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
}

/** Cum se cheamă felul ăsta de răspuns, și sub ce cheie se adună. */
function feluluiBisericii(b: Bifa): { cheie: string; nume: string } {
  if (b.biserica === "harvest") return { cheie: "harvest", nume: "Harvest Arad" };
  if (b.biserica === "fara") return { cheie: "fara", nume: "Fără biserică" };
  if (b.biserica === "alta") {
    return b.bisericaId !== null && b.bisericaNume
      ? {
          cheie: `b:${b.bisericaId}`,
          // Două biserici se pot chema la fel; localitatea le desparte.
          nume: b.bisericaLocalitate
            ? `${b.bisericaNume} · ${b.bisericaLocalitate}`
            : b.bisericaNume,
        }
      : { cheie: "alta", nume: "Altă biserică (nescrisă)" };
  }
  return { cheie: "nescris", nume: "Fără răspuns încă" };
}

function peBiserici(alMembrilor: Bifa[]): RandBiserica[] {
  const numere = new Map<string, Numere>();
  const nume = new Map<string, string>();
  const oameni = new Map<string, Set<number>>();

  for (const b of alMembrilor) {
    const fel = feluluiBisericii(b);
    nume.set(fel.cheie, fel.nume);
    const n = numere.get(fel.cheie) ?? numereGoale();
    adauga(n, b.stare);
    numere.set(fel.cheie, n);
    const set = oameni.get(fel.cheie) ?? new Set<number>();
    set.add(b.membruId);
    oameni.set(fel.cheie, set);
  }

  return [...numere.entries()]
    .map(([cheie, n]) => ({
      cheie,
      nume: nume.get(cheie)!,
      pulsisti: oameni.get(cheie)?.size ?? 0,
      procent: procent(n),
    }))
    .sort((a, b) => b.pulsisti - a.pulsisti || a.nume.localeCompare(b.nume, "ro"));
}

/**
 * Din ce lume bisericească ne vin cei de la alte biserici.
 *
 * Numai ei: pentru cei de la noi denominațiunea se știe, iar pentru cei fără
 * biserică n-are ce însemna. Dacă nu s-a scris nicio denominațiune, întoarcem
 * o listă goală și tabelul nici nu se arată.
 */
function peDenominatiuni(alMembrilor: Bifa[]): RandDenominatiune[] {
  const deLaAltii = alMembrilor.filter((b) => b.biserica === "alta");
  if (!deLaAltii.some((b) => b.bisericaDenominatiune)) return [];

  const numere = new Map<string, Numere>();
  const oameni = new Map<string, Set<number>>();

  for (const b of deLaAltii) {
    const cheie = b.bisericaDenominatiune ?? "nescrisă";
    const n = numere.get(cheie) ?? numereGoale();
    adauga(n, b.stare);
    numere.set(cheie, n);
    const set = oameni.get(cheie) ?? new Set<number>();
    set.add(b.membruId);
    oameni.set(cheie, set);
  }

  return [...numere.entries()]
    .map(([cheie, n]) => ({
      cheie,
      nume: cheie,
      pulsisti: oameni.get(cheie)?.size ?? 0,
      procent: procent(n),
    }))
    .sort((a, b) => b.pulsisti - a.pulsisti || a.nume.localeCompare(b.nume, "ro"));
}

/**
 * Câți sunt botezați și câți nu - și cât de des vin unii și alții.
 *
 * Rândurile sunt mereu toate trei, chiar și goale: un zero la „nebotezați" e
 * o cifră adevărată, iar „fără răspuns încă" e chiar lucrul care se cere pus
 * la punct, deci n-are rost să dispară când e mare.
 */
function peBotez(alMembrilor: Bifa[]): RandBotez[] {
  const FELURI = [
    { cheie: "botezat", nume: "Botezați" },
    { cheie: "nebotezat", nume: "Nebotezați" },
    { cheie: "nescris", nume: "Fără răspuns încă" },
  ];

  const numere = new Map<string, Numere>();
  const oameni = new Map<string, Set<number>>();

  for (const b of alMembrilor) {
    const cheie = b.botez ?? "nescris";
    const n = numere.get(cheie) ?? numereGoale();
    adauga(n, b.stare);
    numere.set(cheie, n);
    const set = oameni.get(cheie) ?? new Set<number>();
    set.add(b.membruId);
    oameni.set(cheie, set);
  }

  return FELURI.map((f) => ({
    cheie: f.cheie,
    nume: f.nume,
    pulsisti: oameni.get(f.cheie)?.size ?? 0,
    procent: procent(numere.get(f.cheie) ?? numereGoale()),
  }));
}

function peLuni(
  listaIntalniri: { id: number }[],
  alMembrilor: Bifa[],
  lunaIntalnirii: Map<number, string>,
): RandLuna[] {
  const cateIntalniri = new Map<string, number>();
  for (const i of listaIntalniri) {
    const luna = lunaIntalnirii.get(i.id)!;
    cateIntalniri.set(luna, (cateIntalniri.get(luna) ?? 0) + 1);
  }

  const numere = new Map<string, Numere>();
  for (const b of alMembrilor) {
    const luna = lunaIntalnirii.get(b.intalnireId);
    if (!luna) continue;
    const n = numere.get(luna) ?? numereGoale();
    adauga(n, b.stare);
    numere.set(luna, n);
  }

  return [...cateIntalniri.keys()]
    .sort()
    .map((luna) => {
      const n = numere.get(luna) ?? numereGoale();
      return {
        luna,
        nume: lunaLizibila(luna),
        intalniri: cateIntalniri.get(luna)!,
        prezentiInMedie: medie(n.prezente, cateIntalniri.get(luna)!),
        procent: procent(n),
      };
    });
}

function peClase(alMembrilor: Bifa[]): RandClasa[] {
  const numere = new Map<number, Numere>();
  const oameni = new Map<number, Set<number>>();

  for (const b of alMembrilor) {
    // -1 ține locul clasei nescrise, ca să putem folosi tot o cheie numerică.
    const cheie = b.clasa ?? -1;
    const n = numere.get(cheie) ?? numereGoale();
    adauga(n, b.stare);
    numere.set(cheie, n);
    const set = oameni.get(cheie) ?? new Set<number>();
    set.add(b.membruId);
    oameni.set(cheie, set);
  }

  return [...numere.entries()]
    .map(([cheie, n]) => ({
      clasa: cheie === -1 ? null : cheie,
      nume: cheie === -1 ? "Clasă nescrisă" : etichetaClasa(cheie),
      pulsisti: oameni.get(cheie)?.size ?? 0,
      procent: procent(n),
    }))
    .sort((a, b) => (a.clasa ?? 99) - (b.clasa ?? 99));
}

/**
 * Cât de statornic vine fiecare, și cele două capete ale listei.
 *
 * Cerem cel puțin trei întâlniri ca să apară cineva în capete: cu una sau
 * două, procentul e o coincidență, nu o obișnuință.
 */
function fidelitatea(
  alMembrilor: Bifa[],
  numeGrupe: Map<number, string>,
): {
  fidelitate: StatisticiPerioada["fidelitate"];
  deCautat: RandPulsist[];
  faraLipsa: RandPulsist[];
} {
  const peOm = new Map<number, { bifa: Bifa; n: Numere }>();
  for (const b of alMembrilor) {
    const acumulat = peOm.get(b.membruId) ?? { bifa: b, n: numereGoale() };
    adauga(acumulat.n, b.stare);
    peOm.set(b.membruId, acumulat);
  }

  const randuri: RandPulsist[] = [...peOm.values()].map(({ bifa, n }) => ({
    membruId: bifa.membruId,
    nume: bifa.nume,
    grupa: numeGrupe.get(bifa.grupaId) ?? "",
    prezente: n.prezente,
    anuntate: n.anuntate,
    absente: n.absente,
    dinCate: total(n),
    procent: procent(n) ?? 0,
  }));

  const prag = (jos: number, sus: number) =>
    randuri.filter((r) => r.procent >= jos && r.procent < sus).length;

  return {
    fidelitate: [
      { prag: "peste 90%", pulsisti: randuri.filter((r) => r.procent >= 90).length },
      { prag: "80 - 90%", pulsisti: prag(80, 90) },
      { prag: "50 - 80%", pulsisti: prag(50, 80) },
      { prag: "sub 50%", pulsisti: randuri.filter((r) => r.procent < 50).length },
    ],
    deCautat: randuri
      .filter((r) => r.procent < 50 && r.dinCate >= 3)
      .sort((a, b) => a.procent - b.procent || a.nume.localeCompare(b.nume, "ro")),
    faraLipsa: randuri
      .filter((r) => r.absente === 0 && r.anuntate === 0 && r.dinCate >= 3)
      .sort((a, b) => b.dinCate - a.dinCate || a.nume.localeCompare(b.nume, "ro")),
  };
}
