import "server-only";

import { and, asc, eq, gte, lte, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { delegari, grupe, lideri, lideriGrupe, type Lider } from "@/lib/db/schema";
import { dataAzi } from "@/lib/util/date";

/**
 * Cine ce grupă poate vedea.
 *
 *  - adminul vede toate grupele;
 *  - liderul vede grupele la care e repartizat;
 *  - în plus, liderul vede grupele pentru care are o ÎNLOCUIRE activă azi
 *    (o delegare făcută de un lider al grupei sau de admin).
 */

export type GrupaAccesibila = {
  id: number;
  nume: string;
  ziIntalnire: number | null;
  oraIntalnire: string | null;
  locatie: string | null;
  activa: boolean;
  /** Adevărat dacă liderul o vede doar pentru că ține locul cuiva. */
  prinInlocuire: boolean;
  /** Până când ține înlocuirea (AAAA-LL-ZZ), dacă e cazul. */
  inlocuirePanaLa?: string;
};

/** Grupele pe care liderul are voie să le deschidă. */
export async function grupeAccesibile(lider: Lider): Promise<GrupaAccesibila[]> {
  if (lider.rol === "admin") {
    const toate = await db
      .select()
      .from(grupe)
      .orderBy(asc(grupe.activa), asc(grupe.nume));
    return toate
      .sort((a, b) => Number(b.activa) - Number(a.activa) || a.nume.localeCompare(b.nume, "ro"))
      .map((g) => ({ ...g, prinInlocuire: false }));
  }

  const azi = dataAzi();

  const proprii = await db
    .select({ grupa: grupe })
    .from(lideriGrupe)
    .innerJoin(grupe, eq(grupe.id, lideriGrupe.grupaId))
    .where(eq(lideriGrupe.liderId, lider.id));

  const inlocuiri = await db
    .select({ grupa: grupe, panaLa: delegari.panaLa })
    .from(delegari)
    .innerJoin(grupe, eq(grupe.id, delegari.grupaId))
    .where(
      and(
        eq(delegari.liderId, lider.id),
        eq(delegari.anulata, false),
        lte(delegari.deLa, azi),
        gte(delegari.panaLa, azi),
      ),
    );

  const rezultat = new Map<number, GrupaAccesibila>();
  for (const { grupa } of proprii) {
    rezultat.set(grupa.id, { ...grupa, prinInlocuire: false });
  }
  for (const { grupa, panaLa } of inlocuiri) {
    if (rezultat.has(grupa.id)) continue;
    rezultat.set(grupa.id, {
      ...grupa,
      prinInlocuire: true,
      inlocuirePanaLa: panaLa,
    });
  }

  return [...rezultat.values()].sort(
    (a, b) =>
      Number(b.activa) - Number(a.activa) || a.nume.localeCompare(b.nume, "ro"),
  );
}

export type VerificareAcces =
  | { permis: false }
  | { permis: true; prinInlocuire: boolean; esteAdmin: boolean };

/** Verifică dacă liderul poate deschide o anumită grupă. */
export async function verificaAccesGrupa(
  lider: Lider,
  grupaId: number,
): Promise<VerificareAcces> {
  if (lider.rol === "admin") {
    return { permis: true, prinInlocuire: false, esteAdmin: true };
  }

  const [propriu] = await db
    .select({ liderId: lideriGrupe.liderId })
    .from(lideriGrupe)
    .where(
      and(eq(lideriGrupe.liderId, lider.id), eq(lideriGrupe.grupaId, grupaId)),
    );
  if (propriu) return { permis: true, prinInlocuire: false, esteAdmin: false };

  const azi = dataAzi();
  const [inlocuire] = await db
    .select({ id: delegari.id })
    .from(delegari)
    .where(
      and(
        eq(delegari.liderId, lider.id),
        eq(delegari.grupaId, grupaId),
        eq(delegari.anulata, false),
        lte(delegari.deLa, azi),
        gte(delegari.panaLa, azi),
      ),
    );
  if (inlocuire) return { permis: true, prinInlocuire: true, esteAdmin: false };

  return { permis: false };
}

/** Liderii repartizați la o grupă. */
export async function liderilGrupei(grupaId: number) {
  return db
    .select({
      id: lideri.id,
      nume: lideri.nume,
      telefon: lideri.telefon,
      rol: lideri.rol,
      activ: lideri.activ,
    })
    .from(lideriGrupe)
    .innerJoin(lideri, eq(lideri.id, lideriGrupe.liderId))
    .where(eq(lideriGrupe.grupaId, grupaId))
    .orderBy(asc(lideri.nume));
}

/** Liderii care pot fi aleși ca înlocuitori la o grupă (fără cei ai grupei). */
export async function liderilPotentiali(grupaId: number) {
  const aiGrupei = await db
    .select({ id: lideriGrupe.liderId })
    .from(lideriGrupe)
    .where(eq(lideriGrupe.grupaId, grupaId));
  const exclusi = new Set(aiGrupei.map((l) => l.id));

  const toti = await db
    .select({ id: lideri.id, nume: lideri.nume, rol: lideri.rol })
    .from(lideri)
    .where(eq(lideri.activ, true))
    .orderBy(asc(lideri.nume));

  return toti.filter((l) => !exclusi.has(l.id) && l.rol !== "admin");
}

/** Înlocuirile (delegările) active sau viitoare ale unei grupe. */
export async function inlocuiriGrupa(grupaId: number) {
  const azi = dataAzi();
  return db
    .select({
      id: delegari.id,
      deLa: delegari.deLa,
      panaLa: delegari.panaLa,
      motiv: delegari.motiv,
      liderId: delegari.liderId,
      liderNume: lideri.nume,
    })
    .from(delegari)
    .innerJoin(lideri, eq(lideri.id, delegari.liderId))
    .where(
      and(
        eq(delegari.grupaId, grupaId),
        eq(delegari.anulata, false),
        or(gte(delegari.panaLa, azi), eq(delegari.deLa, azi)),
      ),
    )
    .orderBy(asc(delegari.deLa));
}
