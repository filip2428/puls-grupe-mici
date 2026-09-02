import "server-only";

import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  grupe,
  intalniri,
  membri,
  prezente,
  type StarePrezenta,
} from "@/lib/db/schema";
import { adaugaZile, dataAzi } from "@/lib/util/date";

/** Câte absențe la rând înseamnă „ar trebui căutat”. */
export const PRAG_ALERTA = 2;

type IntalnireCuPrezente = {
  id: number;
  data: string;
  stari: Map<number, StarePrezenta>;
};

/** Ultimele întâlniri ale grupei, cu starea fiecărui membru. */
async function ultimeleIntalniri(
  grupaId: number,
  limita: number,
): Promise<IntalnireCuPrezente[]> {
  const lista = await db
    .select({ id: intalniri.id, data: intalniri.data })
    .from(intalniri)
    .where(eq(intalniri.grupaId, grupaId))
    .orderBy(desc(intalniri.data))
    .limit(limita);

  if (lista.length === 0) return [];

  const stari = await db
    .select({
      intalnireId: prezente.intalnireId,
      membruId: prezente.membruId,
      stare: prezente.stare,
    })
    .from(prezente)
    .where(
      inArray(
        prezente.intalnireId,
        lista.map((i) => i.id),
      ),
    );

  const pe = new Map<number, Map<number, StarePrezenta>>();
  for (const i of lista) pe.set(i.id, new Map());
  for (const s of stari) pe.get(s.intalnireId)?.set(s.membruId, s.stare);

  return lista.map((i) => ({ ...i, stari: pe.get(i.id)! }));
}

export type AlertaAbsenta = {
  membruId: number;
  nume: string;
  telefon: string | null;
  absenteConsecutive: number;
  ultimaPrezenta: string | null;
};

/**
 * Membrii care au lipsit de mai multe ori la rând.
 * Absență = orice altceva decât „prezent” (inclusiv „motivat” - și cei care
 * anunță că lipsesc au nevoie să fie căutați dacă se repetă).
 */
export async function alerteAbsenteGrupa(
  grupaId: number,
  prag = PRAG_ALERTA,
  nrIntalniri = 10,
): Promise<AlertaAbsenta[]> {
  const [lista, activi] = await Promise.all([
    ultimeleIntalniri(grupaId, nrIntalniri),
    db
      .select()
      .from(membri)
      .where(
        and(
          eq(membri.grupaId, grupaId),
          eq(membri.activ, true),
          eq(membri.status, "membru"),
        ),
      ),
  ]);

  const alerte: AlertaAbsenta[] = [];

  for (const m of activi) {
    let consecutive = 0;
    let ultimaPrezenta: string | null = null;

    // Mergem înapoi în timp până dăm de prima întâlnire la care a fost prezent.
    for (const intalnire of lista) {
      const stare = intalnire.stari.get(m.id);
      if (stare === undefined) continue; // nu era în grupă atunci
      if (stare === "prezent") {
        ultimaPrezenta = intalnire.data;
        break;
      }
      consecutive++;
    }

    if (consecutive >= prag) {
      alerte.push({
        membruId: m.id,
        nume: m.nume,
        telefon: m.telefon,
        absenteConsecutive: consecutive,
        ultimaPrezenta,
      });
    }
  }

  return alerte.sort(
    (a, b) =>
      b.absenteConsecutive - a.absenteConsecutive ||
      a.nume.localeCompare(b.nume, "ro"),
  );
}

export type RandStatisticiMembru = {
  membruId: number;
  nume: string;
  activ: boolean;
  prezente: number;
  motivate: number;
  absente: number;
  procent: number | null;
  /** Stările la ultimele întâlniri, de la cea mai veche la cea mai nouă. */
  serie: (StarePrezenta | null)[];
};

export type StatisticiGrupa = {
  intalniri: { id: number; data: string }[];
  membri: RandStatisticiMembru[];
  /** Procentul mediu de prezență pe ultimele întâlniri. */
  mediePrezenta: number | null;
  ultimaIntalnire: string | null;
};

/** Tabelul de prezență pe ultimele `nrIntalniri` întâlniri. */
export async function statisticiGrupa(
  grupaId: number,
  nrIntalniri = 8,
): Promise<StatisticiGrupa> {
  const [lista, toti] = await Promise.all([
    ultimeleIntalniri(grupaId, nrIntalniri),
    db
      .select()
      .from(membri)
      .where(and(eq(membri.grupaId, grupaId), eq(membri.status, "membru")))
      .orderBy(asc(membri.nume)),
  ]);

  const cronologic = [...lista].reverse();

  const randuri: RandStatisticiMembru[] = toti.map((m) => {
    const serie = cronologic.map((i) => i.stari.get(m.id) ?? null);
    const prezenteNr = serie.filter((s) => s === "prezent").length;
    const motivateNr = serie.filter((s) => s === "motivat").length;
    const absenteNr = serie.filter((s) => s === "absent").length;
    const total = prezenteNr + motivateNr + absenteNr;
    return {
      membruId: m.id,
      nume: m.nume,
      activ: m.activ,
      prezente: prezenteNr,
      motivate: motivateNr,
      absente: absenteNr,
      procent: total ? Math.round((prezenteNr / total) * 100) : null,
      serie,
    };
  });

  const cuDate = randuri.filter((r) => r.procent !== null && r.activ);
  const mediePrezenta = cuDate.length
    ? Math.round(cuDate.reduce((s, r) => s + (r.procent ?? 0), 0) / cuDate.length)
    : null;

  return {
    intalniri: cronologic.map((i) => ({ id: i.id, data: i.data })),
    membri: randuri.sort(
      (a, b) =>
        Number(b.activ) - Number(a.activ) || a.nume.localeCompare(b.nume, "ro"),
    ),
    mediePrezenta,
    ultimaIntalnire: lista[0]?.data ?? null,
  };
}

export type RezumatGrupaAdmin = {
  grupaId: number;
  nume: string;
  activa: boolean;
  membriActivi: number;
  ultimaIntalnire: string | null;
  prezentiUltima: number | null;
  mediePrezenta: number | null;
  alerte: number;
};

/**
 * Câte o linie de rezumat pentru fiecare grupă.
 * Fără `ids` ia toate grupele (pentru admin); cu `ids`, doar pe cele cerute.
 */
export async function rezumatGrupe(optiuni?: {
  ids?: number[];
  nrIntalniri?: number;
}): Promise<RezumatGrupaAdmin[]> {
  const nrIntalniri = optiuni?.nrIntalniri ?? 8;
  if (optiuni?.ids && optiuni.ids.length === 0) return [];

  const toate = optiuni?.ids
    ? await db
        .select()
        .from(grupe)
        .where(inArray(grupe.id, optiuni.ids))
        .orderBy(asc(grupe.nume))
    : await db.select().from(grupe).orderBy(asc(grupe.nume));
  const rezultat: RezumatGrupaAdmin[] = [];

  for (const g of toate) {
    const [stat, alerte, activi] = await Promise.all([
      statisticiGrupa(g.id, nrIntalniri),
      alerteAbsenteGrupa(g.id),
      db
        .select({ id: membri.id })
        .from(membri)
        .where(
          and(
            eq(membri.grupaId, g.id),
            eq(membri.activ, true),
            eq(membri.status, "membru"),
          ),
        ),
    ]);

    const ultima = stat.intalniri.at(-1);
    let prezentiUltima: number | null = null;
    if (ultima) {
      const stari = await db
        .select({ stare: prezente.stare })
        .from(prezente)
        .where(eq(prezente.intalnireId, ultima.id));
      prezentiUltima = stari.filter((s) => s.stare === "prezent").length;
    }

    rezultat.push({
      grupaId: g.id,
      nume: g.nume,
      activa: g.activa,
      membriActivi: activi.length,
      ultimaIntalnire: stat.ultimaIntalnire,
      prezentiUltima,
      mediePrezenta: stat.mediePrezenta,
      alerte: alerte.length,
    });
  }

  return rezultat.sort(
    (a, b) => Number(b.activa) - Number(a.activa) || a.nume.localeCompare(b.nume, "ro"),
  );
}

export type PrezentaSaptamana = {
  data: string;
  prezenti: number;
  total: number;
};

/** Evoluția prezenței pe toată lucrarea, în ultimele săptămâni. */
export async function evolutiePrezenta(
  saptamani = 12,
): Promise<PrezentaSaptamana[]> {
  const deLa = adaugaZile(dataAzi(), -saptamani * 7);

  const lista = await db
    .select({ id: intalniri.id, data: intalniri.data })
    .from(intalniri)
    .where(gte(intalniri.data, deLa))
    .orderBy(asc(intalniri.data));

  if (lista.length === 0) return [];

  const stari = await db
    .select({ intalnireId: prezente.intalnireId, stare: prezente.stare })
    .from(prezente)
    .where(
      inArray(
        prezente.intalnireId,
        lista.map((i) => i.id),
      ),
    );

  const peIntalnire = new Map<number, { prezenti: number; total: number }>();
  for (const i of lista) peIntalnire.set(i.id, { prezenti: 0, total: 0 });
  for (const s of stari) {
    const n = peIntalnire.get(s.intalnireId);
    if (!n) continue;
    n.total++;
    if (s.stare === "prezent") n.prezenti++;
  }

  const peSaptamana = new Map<string, { prezenti: number; total: number }>();
  for (const i of lista) {
    const n = peIntalnire.get(i.id)!;
    const cheie = inceputSaptamanii(i.data);
    const acumulat = peSaptamana.get(cheie) ?? { prezenti: 0, total: 0 };
    acumulat.prezenti += n.prezenti;
    acumulat.total += n.total;
    peSaptamana.set(cheie, acumulat);
  }

  return [...peSaptamana.entries()]
    .map(([data, n]) => ({ data, ...n }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

/** Lunea săptămânii din care face parte data. */
function inceputSaptamanii(data: string): string {
  const [an, luna, zi] = data.split("-").map(Number);
  const d = new Date(Date.UTC(an, luna - 1, zi));
  const ziSapt = (d.getUTCDay() + 6) % 7; // 0 = luni
  return adaugaZile(data, -ziSapt);
}
