import "server-only";

import { and, desc, eq, inArray, lte, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  evenimente,
  grupe,
  intalniri,
  membri,
  prezenteEveniment,
  prezente,
  type StarePrezenta,
} from "@/lib/db/schema";

/**
 * Prezența dintr-o singură seară - de obicei o vineri - pe toate grupele
 * deodată.
 *
 * Statisticile pe perioadă răspund la „cum a mers anul"; asta răspunde la
 * „cine a fost vinerea trecută". De-aia zilele se aleg dintr-o listă cu
 * serile în care chiar s-a făcut prezența, nu dintr-un calendar gol.
 */

/**
 * Zilele (≤ azi) în care s-a făcut prezența la vreo grupă dintre cele date
 * sau la o întâlnire cu toți, cele mai noi primele.
 */
export async function zileleCuPrezenta(
  pana: string,
  /** Grupele pe care le vede cel care se uită. Lipsă = toate. */
  grupaIds?: number[],
): Promise<string[]> {
  if (grupaIds && grupaIds.length === 0) return [];

  const conditii: SQL[] = [lte(intalniri.data, pana)];
  if (grupaIds) conditii.push(inArray(intalniri.grupaId, grupaIds));

  const cuPrezenta = db
    .selectDistinct({ id: prezenteEveniment.evenimentId })
    .from(prezenteEveniment);

  const [laGrupe, laCuToti] = await Promise.all([
    db
      .selectDistinct({ data: intalniri.data })
      .from(intalniri)
      .where(and(...conditii))
      .orderBy(desc(intalniri.data)),
    db
      .selectDistinct({ data: evenimente.data })
      .from(evenimente)
      .where(and(lte(evenimente.data, pana), inArray(evenimente.id, cuPrezenta))),
  ]);

  return [...new Set([...laGrupe, ...laCuToti].map((r) => r.data))].sort(
    (a, b) => b.localeCompare(a),
  );
}

export type OmLaSeara = { membruId: number; nume: string };

export type GrupaInSeara = {
  grupaId: number;
  nume: string;
  subiect: string | null;
  prezenti: OmLaSeara[];
  auAnuntat: OmLaSeara[];
  absenti: OmLaSeara[];
  /** Musafirii bifați prezenți - nu intră la procent. */
  musafiri: OmLaSeara[];
  /** Doar pe membri, ca peste tot în statistici. */
  procent: number | null;
};

export type Seara = {
  data: string;
  grupe: GrupaInSeara[];
  /** Grupele active care n-au prezență în ziua asta. */
  faraPrezenta: { grupaId: number; nume: string }[];
  cuToti: { id: number; titlu: string; veniti: number; musafiri: number }[];
  total: {
    prezenti: number;
    auAnuntat: number;
    absenti: number;
    musafiri: number;
    procent: number | null;
  };
};

export async function prezentaDinSeara(
  data: string,
  grupaIds?: number[],
): Promise<Seara> {
  const goala: Seara = {
    data,
    grupe: [],
    faraPrezenta: [],
    cuToti: [],
    total: { prezenti: 0, auAnuntat: 0, absenti: 0, musafiri: 0, procent: null },
  };
  if (grupaIds && grupaIds.length === 0) return goala;

  const inGrupe = grupaIds ? inArray(intalniri.grupaId, grupaIds) : undefined;

  const [bife, grupeleVazute, cuToti] = await Promise.all([
    db
      .select({
        grupaId: intalniri.grupaId,
        subiect: intalniri.subiect,
        membruId: prezente.membruId,
        stare: prezente.stare,
        nume: membri.nume,
        status: membri.status,
      })
      .from(intalniri)
      .innerJoin(prezente, eq(prezente.intalnireId, intalniri.id))
      .innerJoin(membri, eq(membri.id, prezente.membruId))
      .where(and(eq(intalniri.data, data), inGrupe)),
    db
      .select({ id: grupe.id, nume: grupe.nume, activa: grupe.activa })
      .from(grupe)
      .where(grupaIds ? inArray(grupe.id, grupaIds) : undefined),
    cineAVenitLaCuToti(data, grupaIds),
  ]);

  const numeGrupa = new Map(grupeleVazute.map((g) => [g.id, g.nume]));
  const peGrupa = new Map<number, GrupaInSeara>();
  const sortate = [...bife].sort((a, b) => a.nume.localeCompare(b.nume, "ro"));

  for (const b of sortate) {
    const g = peGrupa.get(b.grupaId) ?? {
      grupaId: b.grupaId,
      nume: numeGrupa.get(b.grupaId) ?? `Grupa ${b.grupaId}`,
      subiect: b.subiect,
      prezenti: [],
      auAnuntat: [],
      absenti: [],
      musafiri: [],
      procent: null,
    };
    const om = { membruId: b.membruId, nume: b.nume };
    if (b.status === "musafir") {
      // Musafirul e pe foaie doar dacă a venit; „absent" la el n-ar spune nimic.
      if (b.stare === "prezent") g.musafiri.push(om);
    } else {
      lista(g, b.stare).push(om);
    }
    peGrupa.set(b.grupaId, g);
  }

  const grupele = [...peGrupa.values()]
    .map((g) => ({ ...g, procent: procentul(g) }))
    .sort((a, b) => a.nume.localeCompare(b.nume, "ro"));

  const suma = (camp: "prezenti" | "auAnuntat" | "absenti" | "musafiri") =>
    grupele.reduce((s, g) => s + g[camp].length, 0);
  const total = {
    prezenti: suma("prezenti"),
    auAnuntat: suma("auAnuntat"),
    absenti: suma("absenti"),
    musafiri: suma("musafiri"),
    procent: null as number | null,
  };
  const asteptati = total.prezenti + total.auAnuntat + total.absenti;
  total.procent = asteptati ? Math.round((total.prezenti / asteptati) * 100) : null;

  return {
    data,
    grupe: grupele,
    /*
      Doar dacă măcar o grupă a făcut prezența: altfel ziua nu e o seară de
      grupe, iar lista ar spune „n-au completat" despre toată lumea.
    */
    faraPrezenta:
      grupele.length === 0
        ? []
        : grupeleVazute
            .filter((g) => g.activa && !peGrupa.has(g.id))
            .map((g) => ({ grupaId: g.id, nume: g.nume }))
            .sort((a, b) => a.nume.localeCompare(b.nume, "ro")),
    cuToti,
    total,
  };
}

function lista(g: GrupaInSeara, stare: StarePrezenta): OmLaSeara[] {
  if (stare === "prezent") return g.prezenti;
  if (stare === "motivat") return g.auAnuntat;
  return g.absenti;
}

function procentul(g: GrupaInSeara): number | null {
  const t = g.prezenti.length + g.auAnuntat.length + g.absenti.length;
  return t ? Math.round((g.prezenti.length / t) * 100) : null;
}

/**
 * Întâlnirile cu toți din ziua asta, cu câți au venit. Liderul care nu e
 * admin îi numără doar pe ai lui, ca în restul statisticilor.
 */
async function cineAVenitLaCuToti(
  data: string,
  grupaIds?: number[],
): Promise<Seara["cuToti"]> {
  const aleZilei = await db
    .select({ id: evenimente.id, titlu: evenimente.titlu })
    .from(evenimente)
    .where(
      and(
        eq(evenimente.data, data),
        eq(evenimente.peGrupeMici, false),
        eq(evenimente.doarLideri, false),
      ),
    )
    .orderBy(evenimente.ora);
  if (aleZilei.length === 0) return [];

  const bife = await db
    .select({
      evenimentId: prezenteEveniment.evenimentId,
      status: membri.status,
    })
    .from(prezenteEveniment)
    .innerJoin(membri, eq(membri.id, prezenteEveniment.membruId))
    .where(
      and(
        inArray(
          prezenteEveniment.evenimentId,
          aleZilei.map((e) => e.id),
        ),
        grupaIds ? inArray(membri.grupaId, grupaIds) : undefined,
      ),
    );

  return aleZilei.map((e) => {
    const aleLui = bife.filter((b) => b.evenimentId === e.id);
    return {
      ...e,
      veniti: aleLui.length,
      musafiri: aleLui.filter((b) => b.status === "musafir").length,
    };
  });
}
