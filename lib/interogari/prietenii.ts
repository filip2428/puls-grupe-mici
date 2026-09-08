import "server-only";

import { and, asc, eq, inArray, ne, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { grupe, membri, prietenii } from "@/lib/db/schema";

/**
 * Prieteniile dintre pulsiști.
 *
 * Tabelul ține o prietenie o singură dată, cu id-ul mai mic în prima coloană.
 * Toate întrebările puse aici ascund treaba asta: cine cheamă funcțiile de mai
 * jos nu trebuie să știe în ce coloană a nimerit omul.
 */

/** Perechea, mereu în aceeași ordine, ca prietenia să nu se scrie de două ori. */
function perechea(unul: number, altul: number): [number, number] {
  return unul < altul ? [unul, altul] : [altul, unul];
}

export type Prieten = {
  id: number;
  nume: string;
  grupaId: number;
  grupaNume: string;
  clasa: number | null;
  activ: boolean;
  status: "membru" | "musafir";
};

/** Prietenii unui pulsist, în ordine alfabetică. */
export async function prieteniiMembrului(membruId: number): Promise<Prieten[]> {
  const legaturi = await db
    .select({ a: prietenii.membruAId, b: prietenii.membruBId })
    .from(prietenii)
    .where(
      or(eq(prietenii.membruAId, membruId), eq(prietenii.membruBId, membruId)),
    );
  if (legaturi.length === 0) return [];

  // Din fiecare pereche ne interesează celălalt, oricare ar fi coloana lui.
  const ids = legaturi.map((l) => (l.a === membruId ? l.b : l.a));

  const lista = await db
    .select({
      id: membri.id,
      nume: membri.nume,
      grupaId: membri.grupaId,
      grupaNume: grupe.nume,
      clasa: membri.clasa,
      activ: membri.activ,
      status: membri.status,
    })
    .from(membri)
    .innerJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(inArray(membri.id, ids))
    .orderBy(asc(membri.nume));

  return lista;
}

/**
 * Cine mai poate fi legat de pulsistul ăsta.
 *
 * `grupePermise` vine din drepturile celui care se uită: liderul alege dintre
 * pulsiștii grupelor lui, coordonatorul dintre toți. Sar peste el însuși și
 * peste prietenii deja scriși, ca lista să nu ofere lucruri fără rost.
 */
export async function pulsistiDeLegat(
  membruId: number,
  grupePermise: number[] | undefined,
): Promise<Prieten[]> {
  if (grupePermise && grupePermise.length === 0) return [];

  const deja = await prieteniiMembrului(membruId);
  const excluse = new Set([membruId, ...deja.map((p) => p.id)]);

  const conditii = [eq(membri.activ, true), ne(membri.id, membruId)];
  if (grupePermise) conditii.push(inArray(membri.grupaId, grupePermise));

  const lista = await db
    .select({
      id: membri.id,
      nume: membri.nume,
      grupaId: membri.grupaId,
      grupaNume: grupe.nume,
      clasa: membri.clasa,
      activ: membri.activ,
      status: membri.status,
    })
    .from(membri)
    .innerJoin(grupe, eq(grupe.id, membri.grupaId))
    .where(and(...conditii))
    .orderBy(asc(grupe.nume), asc(membri.nume));

  return lista.filter((m) => !excluse.has(m.id));
}

/** Leagă doi pulsiști. Dacă erau deja legați, nu se întâmplă nimic. */
export async function leagaPrietenii(
  unul: number,
  altul: number,
  liderId: number,
) {
  if (unul === altul) return;
  const [a, b] = perechea(unul, altul);
  await db
    .insert(prietenii)
    .values({ membruAId: a, membruBId: b, creatDeId: liderId })
    .onConflictDoNothing();
}

/** Desface prietenia dintre doi pulsiști. */
export async function desfaPrietenia(unul: number, altul: number) {
  const [a, b] = perechea(unul, altul);
  await db
    .delete(prietenii)
    .where(and(eq(prietenii.membruAId, a), eq(prietenii.membruBId, b)));
}

/**
 * Prietenii mai multor pulsiști deodată, ca nume gata scrise.
 *
 * Folosită la export: o singură interogare pentru toată lista, în loc de una
 * pentru fiecare rând.
 */
export async function prieteniiMaiMultora(
  membruIds: number[],
): Promise<Map<number, string[]>> {
  const pe = new Map<number, string[]>();
  if (membruIds.length === 0) return pe;

  const legaturi = await db
    .select({ a: prietenii.membruAId, b: prietenii.membruBId })
    .from(prietenii)
    .where(
      or(
        inArray(prietenii.membruAId, membruIds),
        inArray(prietenii.membruBId, membruIds),
      ),
    );
  if (legaturi.length === 0) return pe;

  const nevoieDeNume = new Set<number>();
  for (const l of legaturi) {
    nevoieDeNume.add(l.a);
    nevoieDeNume.add(l.b);
  }

  const nume = new Map(
    (
      await db
        .select({ id: membri.id, nume: membri.nume })
        .from(membri)
        .where(inArray(membri.id, [...nevoieDeNume]))
    ).map((m) => [m.id, m.nume] as const),
  );

  const ceruti = new Set(membruIds);
  const adauga = (cui: number, cine: number) => {
    if (!ceruti.has(cui)) return;
    const numele = nume.get(cine);
    if (!numele) return;
    const lista = pe.get(cui) ?? [];
    lista.push(numele);
    pe.set(cui, lista);
  };

  for (const l of legaturi) {
    adauga(l.a, l.b);
    adauga(l.b, l.a);
  }

  for (const lista of pe.values()) lista.sort((x, y) => x.localeCompare(y, "ro"));
  return pe;
}
