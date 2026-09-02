import "server-only";

import { and, eq, inArray, like, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { grupe, intalniri, membri, prezente } from "@/lib/db/schema";
import { varsta } from "@/lib/util/date";

/** Filtrele listei de adolescenți (vin din adresa paginii). */
export type FiltruAdolescenti = {
  /** Căutare după nume sau telefon. */
  q?: string;
  grupaId?: number;
  status?: "membru" | "musafir";
  sex?: "baiat" | "fata";
  clasa?: number;
  varstaMin?: number;
  varstaMax?: number;
  /** "activi" (implicit), "inactivi" sau "toti". */
  activi?: "activi" | "inactivi" | "toti";
  /** Limitarea de acces: grupele pe care le poate vedea cel care caută. */
  grupePermise?: number[];
};

export type AdolescentDinLista = {
  id: number;
  nume: string;
  telefon: string | null;
  dataNasterii: string | null;
  varsta: number | null;
  sex: "baiat" | "fata" | null;
  clasa: number | null;
  status: "membru" | "musafir";
  activ: boolean;
  devenitMembruLa: string | null;
  parinte1Nume: string | null;
  parinte1Telefon: string | null;
  parinte2Nume: string | null;
  parinte2Telefon: string | null;
  grupaId: number;
  grupaNume: string;
  /** Câte întâlniri a avut și la câte a fost prezent (tot istoricul). */
  intalniri: number;
  prezente: number;
  procent: number | null;
};

/**
 * Lista adolescenților, cu filtre.
 * Adminul vede pe toți; un lider primește `grupePermise` cu grupele lui.
 */
export async function cautaAdolescenti(
  filtru: FiltruAdolescenti,
): Promise<AdolescentDinLista[]> {
  const conditii: SQL[] = [];

  if (filtru.grupePermise) {
    if (filtru.grupePermise.length === 0) return [];
    conditii.push(inArray(membri.grupaId, filtru.grupePermise));
  }
  if (filtru.grupaId) conditii.push(eq(membri.grupaId, filtru.grupaId));
  if (filtru.status) conditii.push(eq(membri.status, filtru.status));
  if (filtru.sex) conditii.push(eq(membri.sex, filtru.sex));
  if (filtru.clasa) conditii.push(eq(membri.clasa, filtru.clasa));

  const activi = filtru.activi ?? "activi";
  if (activi === "activi") conditii.push(eq(membri.activ, true));
  if (activi === "inactivi") conditii.push(eq(membri.activ, false));

  const cautare = filtru.q?.trim();
  if (cautare) {
    const tipar = `%${cautare}%`;
    const potriviri = or(
      like(membri.nume, tipar),
      like(membri.telefon, tipar),
      like(membri.parinte1Nume, tipar),
      like(membri.parinte2Nume, tipar),
    );
    if (potriviri) conditii.push(potriviri);
  }

  const lista = await db
    .select({ membru: membri, grupaNume: grupe.nume })
    .from(membri)
    .innerJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(conditii.length ? and(...conditii) : undefined);

  if (lista.length === 0) return [];

  // Totalurile de prezență, dintr-o singură interogare.
  const stari = await db
    .select({ membruId: prezente.membruId, stare: prezente.stare })
    .from(prezente)
    .innerJoin(intalniri, eq(intalniri.id, prezente.intalnireId))
    .where(
      inArray(
        prezente.membruId,
        lista.map((r) => r.membru.id),
      ),
    );

  const totaluri = new Map<number, { total: number; prezente: number }>();
  for (const s of stari) {
    const t = totaluri.get(s.membruId) ?? { total: 0, prezente: 0 };
    t.total++;
    if (s.stare === "prezent") t.prezente++;
    totaluri.set(s.membruId, t);
  }

  const rezultat = lista.map(({ membru: m, grupaNume }) => {
    const t = totaluri.get(m.id) ?? { total: 0, prezente: 0 };
    return {
      id: m.id,
      nume: m.nume,
      telefon: m.telefon,
      dataNasterii: m.dataNasterii,
      varsta: varsta(m.dataNasterii),
      sex: m.sex,
      clasa: m.clasa,
      status: m.status,
      activ: m.activ,
      devenitMembruLa: m.devenitMembruLa,
      parinte1Nume: m.parinte1Nume,
      parinte1Telefon: m.parinte1Telefon,
      parinte2Nume: m.parinte2Nume,
      parinte2Telefon: m.parinte2Telefon,
      grupaId: m.grupaId,
      grupaNume,
      intalniri: t.total,
      prezente: t.prezente,
      procent: t.total ? Math.round((t.prezente / t.total) * 100) : null,
    };
  });

  // Vârsta se calculează după data nașterii, deci filtrăm aici, nu în SQL.
  const filtrat = rezultat.filter((a) => {
    if (filtru.varstaMin !== undefined) {
      if (a.varsta === null || a.varsta < filtru.varstaMin) return false;
    }
    if (filtru.varstaMax !== undefined) {
      if (a.varsta === null || a.varsta > filtru.varstaMax) return false;
    }
    return true;
  });

  return filtrat.sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
}

/** Citește filtrele din adresa paginii (?q=...&grupa=3&clasa=9...). */
export function filtruDinParametri(
  parametri: URLSearchParams | Record<string, string | string[] | undefined>,
): FiltruAdolescenti {
  const ia = (cheie: string): string | undefined => {
    if (parametri instanceof URLSearchParams) {
      return parametri.get(cheie) ?? undefined;
    }
    const valoare = parametri[cheie];
    return Array.isArray(valoare) ? valoare[0] : valoare;
  };

  const numar = (cheie: string): number | undefined => {
    const brut = ia(cheie);
    if (!brut) return undefined;
    const n = Number(brut);
    return Number.isFinite(n) ? n : undefined;
  };

  const status = ia("status");
  const sex = ia("sex");
  const activi = ia("activi");

  return {
    q: ia("q") || undefined,
    grupaId: numar("grupa"),
    status: status === "membru" || status === "musafir" ? status : undefined,
    sex: sex === "baiat" || sex === "fata" ? sex : undefined,
    clasa: numar("clasa"),
    varstaMin: numar("varstaMin"),
    varstaMax: numar("varstaMax"),
    activi:
      activi === "inactivi" || activi === "toti" || activi === "activi"
        ? activi
        : undefined,
  };
}
