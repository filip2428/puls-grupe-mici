import "server-only";

import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  audit,
  delegari,
  echipeSlujire,
  intalniri,
  lideri,
  lideriGrupe,
  membri,
  membriEchipe,
  noteMembru,
  notificari,
  prezente,
  programariSlujire,
} from "@/lib/db/schema";

/**
 * Ștergerea definitivă a unui lider sau a unui adolescent.
 *
 * E ireversibilă, așa că înainte de a șterge arătăm exact ce se pierde, iar
 * confirmarea se face scriind numele. Pentru cine doar nu mai vine există
 * varianta blândă: „marchează ca inactiv" - acolo nu se pierde nimic.
 *
 * Ce se poate păstra, se păstrează: întâlnirile completate de un lider șters
 * rămân, doar că nu mai au nume lângă ele; la fel notele și jurnalul.
 */

export type PierderiLider = {
  nume: string;
  esteAdmin: boolean;
  grupe: number;
  intalniriCompletate: number;
  note: number;
  inlocuiri: number;
};

/** Ce se pierde dacă ștergem un lider. */
export async function pierderiLider(
  liderId: number,
): Promise<PierderiLider | null> {
  const [l] = await db.select().from(lideri).where(eq(lideri.id, liderId));
  if (!l) return null;

  const [[g], [i], [n], [d]] = await Promise.all([
    db
      .select({ c: count() })
      .from(lideriGrupe)
      .where(eq(lideriGrupe.liderId, liderId)),
    db
      .select({ c: count() })
      .from(intalniri)
      .where(eq(intalniri.marcatDeId, liderId)),
    db
      .select({ c: count() })
      .from(noteMembru)
      .where(eq(noteMembru.autorId, liderId)),
    db.select({ c: count() }).from(delegari).where(eq(delegari.liderId, liderId)),
  ]);

  return {
    nume: l.nume,
    esteAdmin: l.rol === "admin",
    grupe: Number(g?.c ?? 0),
    intalniriCompletate: Number(i?.c ?? 0),
    note: Number(n?.c ?? 0),
    inlocuiri: Number(d?.c ?? 0),
  };
}

/**
 * Șterge definitiv un lider.
 * Prezențele pe care le-a completat rămân (fără nume lângă ele), la fel
 * notele scrise de el și urmele din jurnal.
 */
export async function stergeLiderDefinitiv(liderId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(lideriGrupe).where(eq(lideriGrupe.liderId, liderId));
    await tx.delete(delegari).where(eq(delegari.liderId, liderId));
    await tx.delete(notificari).where(eq(notificari.liderId, liderId));

    await tx
      .update(delegari)
      .set({ creatDeId: null })
      .where(eq(delegari.creatDeId, liderId));
    await tx
      .update(intalniri)
      .set({ marcatDeId: null })
      .where(eq(intalniri.marcatDeId, liderId));
    await tx
      .update(noteMembru)
      .set({ autorId: null })
      .where(eq(noteMembru.autorId, liderId));
    await tx
      .update(echipeSlujire)
      .set({ responsabilId: null })
      .where(eq(echipeSlujire.responsabilId, liderId));
    await tx
      .update(programariSlujire)
      .set({ creatDeId: null })
      .where(eq(programariSlujire.creatDeId, liderId));
    await tx.update(audit).set({ liderId: null }).where(eq(audit.liderId, liderId));

    await tx.delete(lideri).where(eq(lideri.id, liderId));
  });
}

export type PierderiMembru = {
  nume: string;
  grupaId: number;
  prezente: number;
  note: number;
  echipe: number;
};

/** Ce se pierde dacă ștergem un adolescent. */
export async function pierderiMembru(
  membruId: number,
): Promise<PierderiMembru | null> {
  const [m] = await db.select().from(membri).where(eq(membri.id, membruId));
  if (!m) return null;

  const [[p], [n], [e]] = await Promise.all([
    db.select({ c: count() }).from(prezente).where(eq(prezente.membruId, membruId)),
    db
      .select({ c: count() })
      .from(noteMembru)
      .where(eq(noteMembru.membruId, membruId)),
    db
      .select({ c: count() })
      .from(membriEchipe)
      .where(eq(membriEchipe.membruId, membruId)),
  ]);

  return {
    nume: m.nume,
    grupaId: m.grupaId,
    prezente: Number(p?.c ?? 0),
    note: Number(n?.c ?? 0),
    echipe: Number(e?.c ?? 0),
  };
}

/** Șterge definitiv un adolescent, cu tot istoricul lui. */
export async function stergeMembruDefinitiv(membruId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(prezente).where(eq(prezente.membruId, membruId));
    await tx.delete(noteMembru).where(eq(noteMembru.membruId, membruId));
    await tx.delete(membriEchipe).where(eq(membriEchipe.membruId, membruId));
    await tx.delete(membri).where(eq(membri.id, membruId));
  });
}

/**
 * Compară ce a scris omul în caseta de confirmare cu numele real.
 * Ignorăm diacriticele și spațiile în plus - contează intenția, nu tastatura.
 */
export function numeConfirmat(scris: string, real: string): boolean {
  const asteptat = faraDiacritice(real);
  return asteptat !== "" && faraDiacritice(scris) === asteptat;
}

/** "Ștefan  Ioneț" -> "stefan ionet" */
function faraDiacritice(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
