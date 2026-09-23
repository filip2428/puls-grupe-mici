import "server-only";

import { and, asc, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";

import type { StareCitire } from "@/lib/citire";
import { db } from "@/lib/db";
import {
  aniArhivati,
  grupe,
  intalniri,
  lideri,
  lideriGrupe,
  membri,
  planCitire,
  prezente,
} from "@/lib/db/schema";
import { avansulPulsistilor, planulDeCitire, raportCitire } from "@/lib/interogari/citire";
import { statisticiPerioada, type StatisticiPerioada } from "@/lib/interogari/perioada";
import { cautaPulsisti } from "@/lib/interogari/pulsisti";
import { adaugaZile, anulBisericesc, dataAzi } from "@/lib/util/date";

/**
 * Închiderea anului bisericesc.
 *
 * Două lucruri se întâmplă, în ordinea asta:
 *  1. FOTOGRAFIA: statisticile anului, cititul, lista pulsiștilor cu grupele
 *     lor, liderii grupelor și planul de citire se salvează în `aniArhivati`,
 *     exact cum sunt. Oricât se schimbă apoi, anul rămâne consultabil.
 *  2. TRECEREA în anul nou, după ce bifează adminul:
 *     - toată lumea urcă o clasă; cine termină clasa a VIII-a iese din Puls
 *       (devine inactiv, fără grupă - istoricul lui rămâne);
 *     - grupele se reformează: pulsiștii trec la Nerepartizați, grupele se
 *       arhivează, liderii se desprind de ele;
 *     - planul de citire se închide, ca să se poată pune altul.
 */

/** Ultima clasă din Puls. Cine o termină nu mai ține de lucrare. */
export const ULTIMA_CLASA = 8;

export type PulsistArhivat = {
  id: number;
  nume: string;
  grupa: string | null;
  clasa: number | null;
  status: "membru" | "musafir";
  activ: boolean;
  intalniri: number;
  prezente: number;
  anuntate: number;
  absente: number;
  procent: number | null;
  citit: {
    asteptate: number;
    citite: number;
    inUrma: number;
    procent: number | null;
    stare: StareCitire;
  } | null;
};

export type FotografieAn = {
  versiune: 1;
  nume: string;
  deLa: string;
  panaLa: string;
  statistici: StatisticiPerioada;
  citire: Omit<Awaited<ReturnType<typeof raportCitire>>, "portiuneaDeAzi">;
  grupe: { id: number; nume: string; lideri: string[]; pulsisti: number }[];
  pulsisti: PulsistArhivat[];
  plan: { data: string; portiune: string }[];
  schimbari: {
    auUrcatClasa: boolean;
    auIesit: string[];
    grupeReformate: boolean;
    planInchis: boolean;
  };
};

/** Anul propus pentru închidere: cel care s-a încheiat de curând. */
export function anulDeInchis(azi = dataAzi()) {
  // Cu trei luni în urmă suntem sigur în anul care se încheie - și în iulie,
  // și în septembrie, când anul nou tocmai a început.
  const an = anulBisericesc(adaugaZile(azi, -90));
  return { ...an, nume: `${an.deLa.slice(0, 4)}-${an.panaLa.slice(0, 4)}` };
}

/** Ce s-ar schimba la închidere, ca adminul să vadă înainte să confirme. */
export async function previzualizareInchidere() {
  const [activi, grupeActive, legaturi, plan] = await Promise.all([
    db
      .select({
        id: membri.id,
        nume: membri.nume,
        clasa: membri.clasa,
        grupaId: membri.grupaId,
        status: membri.status,
      })
      .from(membri)
      .where(eq(membri.activ, true))
      .orderBy(asc(membri.nume)),
    db.select({ id: grupe.id, nume: grupe.nume }).from(grupe).where(eq(grupe.activa, true)),
    db
      .select({ grupaId: lideriGrupe.grupaId, nume: lideri.nume })
      .from(lideriGrupe)
      .innerJoin(lideri, eq(lideri.id, lideriGrupe.liderId)),
    planulDeCitire(),
  ]);

  const numeGrupa = new Map(grupeActive.map((g) => [g.id, g.nume]));
  return {
    /** Cei care termină clasa a VIII-a (sau sunt trecuți deja peste). */
    ies: activi
      .filter((m) => m.clasa !== null && m.clasa >= ULTIMA_CLASA)
      .map((m) => ({
        ...m,
        grupa: m.grupaId !== null ? (numeGrupa.get(m.grupaId) ?? null) : null,
      })),
    faraClasa: activi.filter((m) => m.clasa === null).length,
    urca: activi.filter((m) => m.clasa !== null && m.clasa < ULTIMA_CLASA).length,
    grupe: grupeActive.map((g) => ({
      ...g,
      pulsisti: activi.filter((m) => m.grupaId === g.id).length,
      lideri: legaturi.filter((l) => l.grupaId === g.id).map((l) => l.nume),
    })),
    cuGrupa: activi.filter((m) => m.grupaId !== null).length,
    zilePlan: plan.length,
  };
}

/** Prezențele fiecărui pulsist în perioadă, pe stări. */
async function prezenteInPerioada(deLa: string, panaLa: string) {
  const randuri = await db
    .select({ membruId: prezente.membruId, stare: prezente.stare })
    .from(prezente)
    .innerJoin(intalniri, eq(intalniri.id, prezente.intalnireId))
    .where(and(gte(intalniri.data, deLa), lte(intalniri.data, panaLa)));

  const pe = new Map<number, { prezente: number; anuntate: number; absente: number }>();
  for (const r of randuri) {
    const n = pe.get(r.membruId) ?? { prezente: 0, anuntate: 0, absente: 0 };
    if (r.stare === "prezent") n.prezente++;
    else if (r.stare === "motivat") n.anuntate++;
    else n.absente++;
    pe.set(r.membruId, n);
  }
  return pe;
}

async function faFotografia(
  an: { nume: string; deLa: string; panaLa: string },
  schimbari: FotografieAn["schimbari"],
): Promise<FotografieAn> {
  const [statistici, citireIntreaga, toti, pePrezente, plan, previzualizare] =
    await Promise.all([
      statisticiPerioada({ deLa: an.deLa, panaLa: an.panaLa }),
      raportCitire(),
      cautaPulsisti({ activi: "toti" }),
      prezenteInPerioada(an.deLa, an.panaLa),
      planulDeCitire(),
      previzualizareInchidere(),
    ]);
  const { portiuneaDeAzi: _azi, ...citire } = citireIntreaga;
  void _azi;

  // Intră cine e activ acum și cine a apărut pe vreo foaie de prezență în an.
  const pulsisti = toti.filter((p) => p.activ || pePrezente.has(p.id));
  const cititori = pulsisti.filter(
    (p) => p.activ && p.status === "membru" && p.grupaId !== null,
  );
  const avansuri = await avansulPulsistilor(cititori);

  return {
    versiune: 1,
    ...an,
    statistici,
    citire,
    grupe: previzualizare.grupe,
    pulsisti: pulsisti.map((p) => {
      const n = pePrezente.get(p.id) ?? { prezente: 0, anuntate: 0, absente: 0 };
      const intalniriAn = n.prezente + n.anuntate + n.absente;
      const av = avansuri.get(p.id);
      return {
        id: p.id,
        nume: p.nume,
        grupa: p.grupaNume,
        clasa: p.clasa,
        status: p.status,
        activ: p.activ,
        intalniri: intalniriAn,
        ...n,
        procent: intalniriAn ? Math.round((n.prezente / intalniriAn) * 100) : null,
        citit: av
          ? {
              asteptate: av.asteptate,
              citite: av.citite,
              inUrma: av.inUrma,
              procent: av.procent,
              stare: av.stare,
            }
          : null,
      };
    }),
    plan: plan.map((z) => ({ data: z.data, portiune: z.portiune })),
    schimbari,
  };
}

export type OptiuniInchidere = {
  nume: string;
  deLa: string;
  panaLa: string;
  urcaClasa: boolean;
  /** Cei care ies din Puls - aleși de admin din lista celor din clasa a VIII-a. */
  iesiti: number[];
  reformeazaGrupele: boolean;
  inchidePlanul: boolean;
};

/** Face fotografia anului și trecerea în anul nou. Întoarce id-ul anului arhivat. */
export async function inchideAnul(
  o: OptiuniInchidere,
  adminId: number,
): Promise<number> {
  // Doar cei care chiar sunt în clasa a VIII-a sau peste pot fi scoși.
  const iesiti = o.urcaClasa && o.iesiti.length
    ? (
        await db
          .select({ id: membri.id, nume: membri.nume, clasa: membri.clasa })
          .from(membri)
          .where(and(inArray(membri.id, o.iesiti), eq(membri.activ, true), isNotNull(membri.clasa)))
      ).filter((m) => (m.clasa ?? 0) >= ULTIMA_CLASA)
    : [];

  const fotografie = await faFotografia(
    { nume: o.nume, deLa: o.deLa, panaLa: o.panaLa },
    {
      auUrcatClasa: o.urcaClasa,
      auIesit: iesiti.map((m) => m.nume),
      grupeReformate: o.reformeazaGrupele,
      planInchis: o.inchidePlanul,
    },
  );

  const [arhivat] = await db
    .insert(aniArhivati)
    .values({
      nume: o.nume,
      deLa: o.deLa,
      panaLa: o.panaLa,
      date: JSON.stringify(fotografie),
      creatDeId: adminId,
    })
    .returning({ id: aniArhivati.id });

  await db.transaction(async (tx) => {
    if (o.urcaClasa) {
      const cuClasa = await tx
        .select({ id: membri.id, clasa: membri.clasa })
        .from(membri)
        .where(and(eq(membri.activ, true), isNotNull(membri.clasa)));
      for (const m of cuClasa) {
        await tx
          .update(membri)
          .set({ clasa: Math.min(13, (m.clasa ?? 0) + 1) })
          .where(eq(membri.id, m.id));
      }
      if (iesiti.length) {
        await tx
          .update(membri)
          .set({ activ: false, grupaId: null })
          .where(inArray(membri.id, iesiti.map((m) => m.id)));
      }
    }

    if (o.reformeazaGrupele) {
      const active = await tx
        .select({ id: grupe.id })
        .from(grupe)
        .where(eq(grupe.activa, true));
      const ids = active.map((g) => g.id);
      if (ids.length) {
        await tx.update(membri).set({ grupaId: null }).where(inArray(membri.grupaId, ids));
        await tx.delete(lideriGrupe).where(inArray(lideriGrupe.grupaId, ids));
        await tx.update(grupe).set({ activa: false }).where(inArray(grupe.id, ids));
      }
    }

    if (o.inchidePlanul) {
      await tx.delete(planCitire);
      await tx.update(membri).set({ citireDeLa: null }).where(isNotNull(membri.citireDeLa));
    }
  });

  return arhivat.id;
}

/** Anii arhivați, cei mai noi primii (fără fotografia întreagă). */
export async function aniiArhivati() {
  return db
    .select({
      id: aniArhivati.id,
      nume: aniArhivati.nume,
      deLa: aniArhivati.deLa,
      panaLa: aniArhivati.panaLa,
      creatLa: aniArhivati.creatLa,
      creatDe: lideri.nume,
    })
    .from(aniArhivati)
    .leftJoin(lideri, eq(lideri.id, aniArhivati.creatDeId))
    .orderBy(desc(aniArhivati.deLa), desc(aniArhivati.creatLa));
}

/** Un an arhivat, cu fotografia lui. */
export async function anArhivat(id: number) {
  const [rand] = await db
    .select({
      id: aniArhivati.id,
      date: aniArhivati.date,
      creatLa: aniArhivati.creatLa,
      creatDe: lideri.nume,
    })
    .from(aniArhivati)
    .leftJoin(lideri, eq(lideri.id, aniArhivati.creatDeId))
    .where(eq(aniArhivati.id, id));
  if (!rand) return null;
  return {
    id: rand.id,
    creatLa: rand.creatLa,
    creatDe: rand.creatDe,
    f: JSON.parse(rand.date) as FotografieAn,
  };
}
