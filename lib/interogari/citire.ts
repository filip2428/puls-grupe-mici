import "server-only";

import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { cache } from "react";

import {
  luneaDin,
  socotesteAvans,
  stareDupaRestanta,
  ziuaDeStart,
  zileleSaptamanii,
  type Avans,
  type StareCitire,
  type ZiPlan,
} from "@/lib/citire";
import { db } from "@/lib/db";
import {
  citireSaptamani,
  citiri,
  grupe,
  lideri,
  membri,
  planCitire,
} from "@/lib/db/schema";
import { adaugaZile, dataAzi } from "@/lib/util/date";

/**
 * Interogările pentru cititul Bibliei. Regulile de socotit stau în
 * `lib/citire.ts`; aici doar se adună datele pentru ele.
 *
 * Planul are cel mult câteva sute de zile, iar bifele câteva zeci de mii pe
 * an, deci le luăm întregi și le socotim în memorie. E mai simplu de urmărit
 * decât un SQL care să facă singur tot calculul, și destul de repede.
 */

/** Tot planul, în ordinea zilelor. Luat o singură dată pe cerere. */
export const planulDeCitire = cache(async (): Promise<ZiPlan[]> => {
  return db.select().from(planCitire).orderBy(asc(planCitire.data));
});

/** Planul unei zile, dacă are. */
export async function portiuneaZilei(data: string): Promise<ZiPlan | null> {
  const plan = await planulDeCitire();
  return plan.find((z) => z.data === data) ?? null;
}

/** Ce trebuie știut despre un pulsist ca să-i socotești cititul. */
export type PulsistCititor = {
  id: number;
  grupaId: number | null;
  devenitMembruLa: string | null;
  creatLa: Date;
  citireDeLa: string | null;
};

/** Ziua în care a intrat în lucrare: primit în grupă, altfel ziua înscrierii. */
function intratLa(m: PulsistCititor): string {
  return m.devenitMembruLa ?? m.creatLa.toISOString().slice(0, 10);
}

/** Până unde a completat fiecare grupă cititul (cea mai târzie zi). */
async function completatPanaLaPeGrupe(
  grupaIds: number[],
): Promise<Map<number, string>> {
  if (grupaIds.length === 0) return new Map();
  const randuri = await db
    .select({
      grupaId: citireSaptamani.grupaId,
      panaLa: citireSaptamani.completatPanaLa,
    })
    .from(citireSaptamani)
    .where(inArray(citireSaptamani.grupaId, grupaIds));

  const rezultat = new Map<number, string>();
  for (const r of randuri) {
    const vechi = rezultat.get(r.grupaId);
    if (!vechi || r.panaLa > vechi) rezultat.set(r.grupaId, r.panaLa);
  }
  return rezultat;
}

/** Zilele bifate ale fiecărui pulsist. */
async function bifelePulsistilor(
  membruIds: number[],
): Promise<Map<number, Set<string>>> {
  const rezultat = new Map<number, Set<string>>();
  if (membruIds.length === 0) return rezultat;

  // SQLite are o limită la câți parametri primește o interogare.
  for (let i = 0; i < membruIds.length; i += 500) {
    const bucata = membruIds.slice(i, i + 500);
    const randuri = await db
      .select({ membruId: citiri.membruId, data: citiri.data })
      .from(citiri)
      .where(inArray(citiri.membruId, bucata));
    for (const r of randuri) {
      const set = rezultat.get(r.membruId) ?? new Set<string>();
      set.add(r.data);
      rezultat.set(r.membruId, set);
    }
  }
  return rezultat;
}

/**
 * Avansul fiecăruia dintre pulsiștii dați, socotit până la ziua până la care
 * a completat grupa lui cititul.
 */
export async function avansulPulsistilor(
  pulsisti: PulsistCititor[],
): Promise<Map<number, Avans>> {
  const [plan, completat, bife] = await Promise.all([
    planulDeCitire(),
    completatPanaLaPeGrupe([
      ...new Set(pulsisti.map((p) => p.grupaId).filter((g) => g !== null)),
    ]),
    bifelePulsistilor(pulsisti.map((p) => p.id)),
  ]);
  const datePlan = plan.map((z) => z.data);
  const azi = dataAzi();

  const rezultat = new Map<number, Avans>();
  for (const p of pulsisti) {
    const deLa = ziuaDeStart(plan, intratLa(p), p.citireDeLa);
    const completatLa = p.grupaId !== null ? completat.get(p.grupaId) : undefined;
    const panaLa = completatLa ? (completatLa < azi ? completatLa : azi) : null;
    rezultat.set(
      p.id,
      socotesteAvans(datePlan, deLa, panaLa, bife.get(p.id) ?? new Set()),
    );
  }
  return rezultat;
}

const coloanePulsist = {
  id: membri.id,
  nume: membri.nume,
  grupaId: membri.grupaId,
  devenitMembruLa: membri.devenitMembruLa,
  creatLa: membri.creatLa,
  citireDeLa: membri.citireDeLa,
};

/** Membrii activi ai unei grupe - cei de la care se așteaptă cititul. */
async function cititoriiGrupei(grupaId: number) {
  const lista = await db
    .select(coloanePulsist)
    .from(membri)
    .where(
      and(
        eq(membri.grupaId, grupaId),
        eq(membri.activ, true),
        eq(membri.status, "membru"),
      ),
    );
  return lista.sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
}

/** Avansul unui singur pulsist, pentru fișa lui. */
export async function avansulPulsistului(membruId: number) {
  const [p] = await db
    .select(coloanePulsist)
    .from(membri)
    .where(eq(membri.id, membruId));
  if (!p) return null;

  const [avans, plan, ultimele] = await Promise.all([
    avansulPulsistilor([p]).then((m) => m.get(p.id)!),
    planulDeCitire(),
    db
      .select({ data: citiri.data })
      .from(citiri)
      .where(eq(citiri.membruId, membruId)),
  ]);

  // Ultimele două săptămâni ale planului, până azi, ca să se vadă golurile.
  const azi = dataAzi();
  const bifate = new Set(ultimele.map((u) => u.data));
  const recente = plan
    .filter((z) => z.data <= azi && z.data >= adaugaZile(azi, -13))
    .map((z) => ({ ...z, citit: bifate.has(z.data) }));

  return { avans, recente, citireDeLa: p.citireDeLa };
}

export type RandFoaieCitire = {
  id: number;
  nume: string;
  /** Zilele săptămânii bifate. */
  bifate: string[];
  /** De la ce zi i se cere cititul - zilele de dinainte sunt opționale. */
  deLa: string | null;
  avans: Avans;
};

/** Foaia de citit a unei grupe, pe o săptămână. */
export async function foaiaDeCitire(grupaId: number, luni: string) {
  const zile = zileleSaptamanii(luni);
  const duminica = zile[6];

  const [plan, pulsisti, saptamana] = await Promise.all([
    planulDeCitire(),
    cititoriiGrupei(grupaId),
    db
      .select({
        completatPanaLa: citireSaptamani.completatPanaLa,
        actualizatLa: citireSaptamani.actualizatLa,
        marcatDe: lideri.nume,
      })
      .from(citireSaptamani)
      .leftJoin(lideri, eq(lideri.id, citireSaptamani.marcatDeId))
      .where(
        and(
          eq(citireSaptamani.grupaId, grupaId),
          eq(citireSaptamani.saptamana, luni),
        ),
      )
      .then((r) => r[0] ?? null),
  ]);

  const ids = pulsisti.map((p) => p.id);
  const [avansuri, bifeSaptamana] = await Promise.all([
    avansulPulsistilor(pulsisti),
    ids.length
      ? db
          .select({ membruId: citiri.membruId, data: citiri.data })
          .from(citiri)
          .where(
            and(
              inArray(citiri.membruId, ids),
              gte(citiri.data, luni),
              lte(citiri.data, duminica),
            ),
          )
      : Promise.resolve([]),
  ]);

  const peMembru = new Map<number, string[]>();
  for (const b of bifeSaptamana) {
    const lista = peMembru.get(b.membruId) ?? [];
    lista.push(b.data);
    peMembru.set(b.membruId, lista);
  }

  const portiuni = new Map(plan.map((z) => [z.data, z]));
  const randuri: RandFoaieCitire[] = pulsisti.map((p) => {
    const avans = avansuri.get(p.id)!;
    return {
      id: p.id,
      nume: p.nume,
      bifate: peMembru.get(p.id) ?? [],
      deLa: avans.deLa,
      avans,
    };
  });

  return {
    zile: zile.map((data) => ({
      data,
      portiune: portiuni.get(data)?.portiune ?? null,
    })),
    randuri,
    completat: saptamana,
    arePlan: plan.length > 0,
  };
}

/**
 * Scrie bifele unei săptămâni pentru o grupă.
 *
 * Se înlocuiesc doar bifele din zilele din plan ale săptămânii, și doar ale
 * membrilor de acum ai grupei - un pulsist venit din altă grupă își păstrează
 * restul istoriei. Zilele din viitor nu se pot bifa.
 */
export async function salveazaCitireSaptamana(optiuni: {
  grupaId: number;
  luni: string;
  liderId: number;
  bife: Record<string, string[]>;
}) {
  const { grupaId, luni, liderId } = optiuni;
  const azi = dataAzi();
  const zile = zileleSaptamanii(luni);
  const plan = await planulDeCitire();
  const cuPortiune = new Set(
    plan.filter((z) => zile.includes(z.data) && z.data <= azi).map((z) => z.data),
  );
  const zileDeScris = [...cuPortiune];

  const pulsisti = await cititoriiGrupei(grupaId);
  const ids = pulsisti.map((p) => p.id);

  const deInserat: { membruId: number; data: string; marcatDeId: number }[] = [];
  for (const id of ids) {
    for (const data of optiuni.bife[String(id)] ?? []) {
      if (cuPortiune.has(data)) deInserat.push({ membruId: id, data, marcatDeId: liderId });
    }
  }

  const completatPanaLa = zile[6] < azi ? zile[6] : azi;

  await db.transaction(async (tx) => {
    if (ids.length > 0 && zileDeScris.length > 0) {
      await tx
        .delete(citiri)
        .where(and(inArray(citiri.membruId, ids), inArray(citiri.data, zileDeScris)));
    }
    if (deInserat.length > 0) {
      await tx.insert(citiri).values(deInserat);
    }
    await tx
      .insert(citireSaptamani)
      .values({ grupaId, saptamana: luni, completatPanaLa, marcatDeId: liderId })
      .onConflictDoUpdate({
        target: [citireSaptamani.grupaId, citireSaptamani.saptamana],
        set: { completatPanaLa, marcatDeId: liderId, actualizatLa: new Date() },
      });
  });

  return { bife: deInserat.length, pulsisti: ids.length, zile: zileDeScris.length };
}

export type RezumatCitireGrupa = {
  grupaId: number;
  nume: string;
  pulsisti: number;
  /** Media procentelor celor de la care s-a așteptat ceva. */
  procentMediu: number | null;
  laZi: number;
  putin: number;
  mult: number;
  necompletat: number;
  completatPanaLa: string | null;
};

export type PulsistInUrma = {
  membruId: number;
  nume: string;
  grupa: string;
  avans: Avans;
};

export type SaptamanaEvolutie = {
  /** Duminica săptămânii. */
  panaLa: string;
  laZi: number;
  putin: number;
  mult: number;
};

/**
 * Tabloul cititului pentru statistici: pe grupe, cine a rămas mult în urmă
 * și cum a evoluat lucrarea săptămână de săptămână.
 *
 * `grupaIds` nedat = toate grupele active.
 */
export async function raportCitire(
  grupaIds?: number[],
  saptamaniInEvolutie = 10,
) {
  const conditiiGrupe = [eq(grupe.activa, true)];
  if (grupaIds) conditiiGrupe.push(inArray(grupe.id, grupaIds.length ? grupaIds : [-1]));
  const grupele = await db
    .select({ id: grupe.id, nume: grupe.nume })
    .from(grupe)
    .where(and(...conditiiGrupe))
    .orderBy(asc(grupe.nume));
  const ids = grupele.map((g) => g.id);

  const [plan, pulsisti, saptamani] = await Promise.all([
    planulDeCitire(),
    ids.length
      ? db
          .select(coloanePulsist)
          .from(membri)
          .where(
            and(
              inArray(membri.grupaId, ids),
              eq(membri.activ, true),
              eq(membri.status, "membru"),
            ),
          )
      : Promise.resolve([]),
    ids.length
      ? db
          .select({
            grupaId: citireSaptamani.grupaId,
            saptamana: citireSaptamani.saptamana,
            completatPanaLa: citireSaptamani.completatPanaLa,
          })
          .from(citireSaptamani)
          .where(inArray(citireSaptamani.grupaId, ids))
      : Promise.resolve([]),
  ]);

  const bife = await bifelePulsistilor(pulsisti.map((p) => p.id));
  const datePlan = plan.map((z) => z.data);
  const azi = dataAzi();

  // Până unde a completat fiecare grupă, și care săptămâni sunt complete.
  const completat = new Map<number, string>();
  const saptamaniComplete = new Set<string>();
  for (const s of saptamani) {
    const vechi = completat.get(s.grupaId);
    if (!vechi || s.completatPanaLa > vechi) completat.set(s.grupaId, s.completatPanaLa);
    if (s.completatPanaLa >= adaugaZile(s.saptamana, 6)) {
      saptamaniComplete.add(`${s.grupaId}:${s.saptamana}`);
    }
  }

  const numeGrupa = new Map(grupele.map((g) => [g.id, g.nume]));
  const peGrupa = new Map<number, RezumatCitireGrupa>(
    grupele.map((g) => [
      g.id,
      {
        grupaId: g.id,
        nume: g.nume,
        pulsisti: 0,
        procentMediu: null,
        laZi: 0,
        putin: 0,
        mult: 0,
        necompletat: 0,
        completatPanaLa: completat.get(g.id) ?? null,
      },
    ]),
  );
  const sumeProcente = new Map<number, { suma: number; cati: number }>();
  const multInUrma: PulsistInUrma[] = [];
  const starti = new Map<number, string | null>();

  for (const p of pulsisti) {
    const grupaId = p.grupaId!;
    const deLa = ziuaDeStart(plan, intratLa(p), p.citireDeLa);
    starti.set(p.id, deLa);
    const completatLa = completat.get(grupaId);
    const panaLa = completatLa ? (completatLa < azi ? completatLa : azi) : null;
    const avans = socotesteAvans(datePlan, deLa, panaLa, bife.get(p.id) ?? new Set());

    const r = peGrupa.get(grupaId)!;
    r.pulsisti++;
    numara(r, avans.stare);
    if (avans.procent !== null) {
      const s = sumeProcente.get(grupaId) ?? { suma: 0, cati: 0 };
      s.suma += avans.procent;
      s.cati++;
      sumeProcente.set(grupaId, s);
    }
    if (avans.stare === "mult") {
      multInUrma.push({
        membruId: p.id,
        nume: p.nume,
        grupa: numeGrupa.get(grupaId) ?? "",
        avans,
      });
    }
  }

  for (const [grupaId, s] of sumeProcente) {
    peGrupa.get(grupaId)!.procentMediu = Math.round(s.suma / s.cati);
  }

  /*
    Evoluția: pentru fiecare din ultimele săptămâni încheiate, starea
    pulsiștilor așa cum era duminica aia. Intră doar grupele care au
    completat săptămâna întreagă - altfel golurile ar arăta ca restanțe.
  */
  const evolutie: SaptamanaEvolutie[] = [];
  const luniaAsta = luneaDin(azi);
  for (let i = saptamaniInEvolutie; i >= 1; i--) {
    const luni = adaugaZile(luniaAsta, -7 * i);
    const duminica = adaugaZile(luni, 6);
    if (datePlan.length === 0 || duminica < datePlan[0]) continue;

    const sapt: SaptamanaEvolutie = { panaLa: duminica, laZi: 0, putin: 0, mult: 0 };
    let cati = 0;
    for (const p of pulsisti) {
      if (!saptamaniComplete.has(`${p.grupaId}:${luni}`)) continue;
      const avans = socotesteAvans(
        datePlan,
        starti.get(p.id) ?? null,
        duminica,
        bife.get(p.id) ?? new Set(),
      );
      if (avans.asteptate === 0) continue;
      cati++;
      const stare = stareDupaRestanta(avans.inUrma);
      if (stare === "la_zi") sapt.laZi++;
      else if (stare === "putin") sapt.putin++;
      else sapt.mult++;
    }
    if (cati > 0) evolutie.push(sapt);
  }

  const grupeLista = [...peGrupa.values()].filter((g) => g.pulsisti > 0);
  const total = grupeLista.reduce(
    (t, g) => ({
      pulsisti: t.pulsisti + g.pulsisti,
      laZi: t.laZi + g.laZi,
      putin: t.putin + g.putin,
      mult: t.mult + g.mult,
      necompletat: t.necompletat + g.necompletat,
    }),
    { pulsisti: 0, laZi: 0, putin: 0, mult: 0, necompletat: 0 },
  );
  const toateSumele = [...sumeProcente.values()].reduce(
    (t, s) => ({ suma: t.suma + s.suma, cati: t.cati + s.cati }),
    { suma: 0, cati: 0 },
  );

  return {
    arePlan: plan.length > 0,
    portiuneaDeAzi: plan.find((z) => z.data === azi) ?? null,
    total: {
      ...total,
      procentMediu: toateSumele.cati
        ? Math.round(toateSumele.suma / toateSumele.cati)
        : null,
    },
    peGrupe: grupeLista,
    multInUrma: multInUrma.sort((a, b) => b.avans.inUrma - a.avans.inUrma),
    evolutie,
  };
}

function numara(
  r: { laZi: number; putin: number; mult: number; necompletat: number },
  stare: StareCitire,
) {
  if (stare === "la_zi") r.laZi++;
  else if (stare === "putin") r.putin++;
  else if (stare === "mult") r.mult++;
  else r.necompletat++;
}

/**
 * Grupele care n-au completat cititul pe o săptămână încheiată, pentru
 * amintirea de luni. Doar grupele active cu membri, și doar dacă săptămâna
 * a avut zile în plan.
 */
export async function grupeFaraCitireCompletata(luni: string) {
  const duminica = adaugaZile(luni, 6);
  const plan = await planulDeCitire();
  if (!plan.some((z) => z.data >= luni && z.data <= duminica)) return [];

  const [active, cuMembri, facute] = await Promise.all([
    db.select({ id: grupe.id, nume: grupe.nume }).from(grupe).where(eq(grupe.activa, true)),
    db
      .selectDistinct({ grupaId: membri.grupaId })
      .from(membri)
      .where(and(eq(membri.activ, true), eq(membri.status, "membru"))),
    db
      .select({
        grupaId: citireSaptamani.grupaId,
        completatPanaLa: citireSaptamani.completatPanaLa,
      })
      .from(citireSaptamani)
      .where(eq(citireSaptamani.saptamana, luni)),
  ]);

  const auMembri = new Set(cuMembri.map((m) => m.grupaId));
  const complete = new Set(
    facute.filter((f) => f.completatPanaLa >= duminica).map((f) => f.grupaId),
  );
  return active.filter((g) => auMembri.has(g.id) && !complete.has(g.id));
}

/* ------------------------------------------------------------------ planul */

/**
 * Pune un plan nou în locul celui vechi.
 *
 * Bifele rămân: sunt legate de zile, nu de rândurile planului. Dacă noul plan
 * are aceleași zile, nimeni nu pierde nimic; dacă o zi dispare din plan,
 * bifa ei rămâne în baza de date, dar nu se mai socotește.
 */
export async function inlocuiestePlanul(zile: ZiPlan[]) {
  await db.transaction(async (tx) => {
    await tx.delete(planCitire);
    for (let i = 0; i < zile.length; i += 200) {
      await tx.insert(planCitire).values(zile.slice(i, i + 200));
    }
  });
}

/** Șterge planul de tot. Bifele rămân, ca la înlocuire. */
export async function stergePlanul() {
  await db.delete(planCitire);
}
