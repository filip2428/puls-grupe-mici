import "server-only";

import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  grupe,
  intalniri,
  lideri,
  membri,
  noteMembru,
  prezente,
  type StarePrezenta,
} from "@/lib/db/schema";
import { adaugaZile } from "@/lib/util/date";

/** Datele unei grupe (sau null dacă nu există). */
export async function grupa(grupaId: number) {
  const [g] = await db.select().from(grupe).where(eq(grupe.id, grupaId));
  return g ?? null;
}

export type OptiuniMembri = {
  /** Include și adolescenții marcați ca inactivi. */
  includeInactivi?: boolean;
  /** "membru" (implicit), "musafir" sau "toti". */
  status?: "membru" | "musafir" | "toti";
};

/**
 * Adolescenții unei grupe. Implicit doar membrii activi -
 * musafirii se cer explicit, ca să nu ajungă din greșeală în statistici.
 */
export async function membriGrupei(
  grupaId: number,
  optiuni: OptiuniMembri = {},
) {
  const status = optiuni.status ?? "membru";
  const conditii = [eq(membri.grupaId, grupaId)];
  if (!optiuni.includeInactivi) conditii.push(eq(membri.activ, true));
  if (status !== "toti") conditii.push(eq(membri.status, status));

  const lista = await db
    .select()
    .from(membri)
    .where(and(...conditii));

  return lista.sort(
    (a, b) =>
      Number(b.activ) - Number(a.activ) || a.nume.localeCompare(b.nume, "ro"),
  );
}

export type IntalnireCuNumere = {
  id: number;
  data: string;
  subiect: string | null;
  nota: string | null;
  prinInlocuire: boolean;
  marcatDe: string | null;
  /** Numerele de mai jos sunt doar ale membrilor grupei. */
  prezenti: number;
  motivati: number;
  absenti: number;
  /** Musafirii prezenti la intalnirea respectiva. */
  musafiri: number;
};

/** Ultimele întâlniri ale grupei, cu numărul de prezenți. */
export async function intalniriGrupei(
  grupaId: number,
  limita = 12,
): Promise<IntalnireCuNumere[]> {
  const lista = await db
    .select({
      id: intalniri.id,
      data: intalniri.data,
      subiect: intalniri.subiect,
      nota: intalniri.nota,
      prinInlocuire: intalniri.prinInlocuire,
      marcatDe: lideri.nume,
    })
    .from(intalniri)
    .leftJoin(lideri, eq(lideri.id, intalniri.marcatDeId))
    .where(eq(intalniri.grupaId, grupaId))
    .orderBy(desc(intalniri.data))
    .limit(limita);

  if (lista.length === 0) return [];

  const toateStarile = await db
    .select({
      intalnireId: prezente.intalnireId,
      stare: prezente.stare,
      status: membri.status,
    })
    .from(prezente)
    .innerJoin(membri, eq(membri.id, prezente.membruId))
    .where(
      inArray(
        prezente.intalnireId,
        lista.map((i) => i.id),
      ),
    );

  const numere = new Map<
    number,
    { prezenti: number; motivati: number; absenti: number; musafiri: number }
  >();
  for (const i of lista) {
    numere.set(i.id, { prezenti: 0, motivati: 0, absenti: 0, musafiri: 0 });
  }
  for (const p of toateStarile) {
    const n = numere.get(p.intalnireId);
    if (!n) continue;
    if (p.status === "musafir") {
      if (p.stare === "prezent") n.musafiri++;
      continue;
    }
    if (p.stare === "prezent") n.prezenti++;
    else if (p.stare === "motivat") n.motivati++;
    else n.absenti++;
  }

  return lista.map((i) => ({ ...i, ...numere.get(i.id)! }));
}

/**
 * Musafirii care au trecut pe la grupă în ultima vreme (implicit 90 de zile),
 * plus cei marcați deja la întâlnirea din data cerută.
 * Ei apar pe foaia de prezență într-o secțiune separată.
 */
export async function musafiriRecenti(
  grupaId: number,
  data: string,
  zile = 90,
) {
  const toti = await membriGrupei(grupaId, { status: "musafir" });
  if (toti.length === 0) return [];

  const deLa = adaugaZile(data, -zile);
  const veniri = await db
    .select({ membruId: prezente.membruId })
    .from(prezente)
    .innerJoin(intalniri, eq(intalniri.id, prezente.intalnireId))
    .where(
      and(
        eq(intalniri.grupaId, grupaId),
        gte(intalniri.data, deLa),
        lte(intalniri.data, data),
        inArray(
          prezente.membruId,
          toti.map((m) => m.id),
        ),
      ),
    );

  const recenti = new Set(veniri.map((v) => v.membruId));
  // Musafirii adăugați azi nu au încă nicio prezență salvată, dar trebuie să apară.
  const azi = new Date();
  const adaugatiRecent = (m: (typeof toti)[number]) =>
    (azi.getTime() - m.creatLa.getTime()) / 86400000 < 1;

  return toti.filter((m) => recenti.has(m.id) || adaugatiRecent(m));
}

/** Grupele (dintre cele date) care au deja prezența făcută la data cerută. */
export async function grupeCuPrezentaLa(
  grupaIds: number[],
  data: string,
): Promise<Set<number>> {
  if (grupaIds.length === 0) return new Set();
  const randuri = await db
    .select({ grupaId: intalniri.grupaId })
    .from(intalniri)
    .where(and(inArray(intalniri.grupaId, grupaIds), eq(intalniri.data, data)));
  return new Set(randuri.map((r) => r.grupaId));
}

/** Un membru împreună cu grupa lui. */
export async function membru(membruId: number) {
  const [rezultat] = await db
    .select({ membru: membri, grupa: grupe })
    .from(membri)
    .innerJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(eq(membri.id, membruId));
  return rezultat ?? null;
}

export type IstoricPrezenta = {
  data: string;
  stare: StarePrezenta;
  subiect: string | null;
};

/** Istoricul prezenței unui membru, de la cea mai recentă întâlnire. */
export async function istoricMembru(
  membruId: number,
  limita = 30,
): Promise<IstoricPrezenta[]> {
  return db
    .select({
      data: intalniri.data,
      stare: prezente.stare,
      subiect: intalniri.subiect,
    })
    .from(prezente)
    .innerJoin(intalniri, eq(intalniri.id, prezente.intalnireId))
    .where(eq(prezente.membruId, membruId))
    .orderBy(desc(intalniri.data))
    .limit(limita);
}

/** Notele scrise despre un membru. */
export async function noteleMembrului(membruId: number) {
  return db
    .select({
      id: noteMembru.id,
      text: noteMembru.text,
      creatLa: noteMembru.creatLa,
      autorId: noteMembru.autorId,
      autorNume: lideri.nume,
    })
    .from(noteMembru)
    .leftJoin(lideri, eq(lideri.id, noteMembru.autorId))
    .where(eq(noteMembru.membruId, membruId))
    .orderBy(desc(noteMembru.creatLa));
}
