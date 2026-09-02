import "server-only";

import { count, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  abonamentePush,
  audit,
  delegari,
  echipeSlujire,
  grupe,
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
 * Ștergerea definitivă a unui lider sau a unui pulsist.
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
    await tx.delete(abonamentePush).where(eq(abonamentePush.liderId, liderId));

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

/** Ce se pierde dacă ștergem un pulsist. */
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

/** Șterge definitiv un pulsist, cu tot istoricul lui. */
export async function stergeMembruDefinitiv(membruId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(prezente).where(eq(prezente.membruId, membruId));
    await tx.delete(noteMembru).where(eq(noteMembru.membruId, membruId));
    await tx.delete(membriEchipe).where(eq(membriEchipe.membruId, membruId));
    await tx.delete(membri).where(eq(membri.id, membruId));
  });
}

export type PierderiGrupa = {
  nume: string;
  pulsisti: number;
  intalniri: number;
  prezente: number;
  note: number;
  lideri: number;
  programari: number;
};

/** Ce se pierde dacă ștergem o grupă. E cea mai grea ștergere din aplicație. */
export async function pierderiGrupa(
  grupaId: number,
): Promise<PierderiGrupa | null> {
  const [g] = await db.select().from(grupe).where(eq(grupe.id, grupaId));
  if (!g) return null;

  const aiGrupei = await db
    .select({ id: membri.id })
    .from(membri)
    .where(eq(membri.grupaId, grupaId));
  const idMembri = aiGrupei.map((m) => m.id);

  const aleGrupei = await db
    .select({ id: intalniri.id })
    .from(intalniri)
    .where(eq(intalniri.grupaId, grupaId));
  const idIntalniri = aleGrupei.map((i) => i.id);

  const [[p], [n], [l], [pr]] = await Promise.all([
    idIntalniri.length
      ? db
          .select({ c: count() })
          .from(prezente)
          .where(inArray(prezente.intalnireId, idIntalniri))
      : Promise.resolve([{ c: 0 }]),
    idMembri.length
      ? db
          .select({ c: count() })
          .from(noteMembru)
          .where(inArray(noteMembru.membruId, idMembri))
      : Promise.resolve([{ c: 0 }]),
    db
      .select({ c: count() })
      .from(lideriGrupe)
      .where(eq(lideriGrupe.grupaId, grupaId)),
    db
      .select({ c: count() })
      .from(programariSlujire)
      .where(eq(programariSlujire.grupaId, grupaId)),
  ]);

  return {
    nume: g.nume,
    pulsisti: idMembri.length,
    intalniri: idIntalniri.length,
    prezente: Number(p?.c ?? 0),
    note: Number(n?.c ?? 0),
    lideri: Number(l?.c ?? 0),
    programari: Number(pr?.c ?? 0),
  };
}

/**
 * Șterge definitiv o grupă cu tot ce ține de ea: pulsiștii, prezențele,
 * notele, înlocuirile și programările ei. Liderii rămân - doar nu mai sunt
 * repartizați aici.
 */
export async function stergeGrupaDefinitiv(grupaId: number) {
  const aiGrupei = await db
    .select({ id: membri.id })
    .from(membri)
    .where(eq(membri.grupaId, grupaId));
  const aleGrupei = await db
    .select({ id: intalniri.id })
    .from(intalniri)
    .where(eq(intalniri.grupaId, grupaId));

  const idMembri = aiGrupei.map((m) => m.id);
  const idIntalniri = aleGrupei.map((i) => i.id);

  await db.transaction(async (tx) => {
    if (idIntalniri.length > 0) {
      await tx.delete(prezente).where(inArray(prezente.intalnireId, idIntalniri));
    }
    if (idMembri.length > 0) {
      await tx.delete(prezente).where(inArray(prezente.membruId, idMembri));
      await tx.delete(noteMembru).where(inArray(noteMembru.membruId, idMembri));
      await tx.delete(membriEchipe).where(inArray(membriEchipe.membruId, idMembri));
    }
    await tx.delete(intalniri).where(eq(intalniri.grupaId, grupaId));
    await tx.delete(membri).where(eq(membri.grupaId, grupaId));
    await tx.delete(lideriGrupe).where(eq(lideriGrupe.grupaId, grupaId));
    await tx.delete(delegari).where(eq(delegari.grupaId, grupaId));
    await tx
      .delete(programariSlujire)
      .where(eq(programariSlujire.grupaId, grupaId));
    await tx.delete(grupe).where(eq(grupe.id, grupaId));
  });
}

export type PierderiIntalnire = {
  data: string;
  grupaId: number;
  prezente: number;
  areNote: boolean;
};

/** Ce se pierde dacă ștergem prezența unei zile. */
export async function pierderiIntalnire(
  intalnireId: number,
): Promise<PierderiIntalnire | null> {
  const [i] = await db
    .select()
    .from(intalniri)
    .where(eq(intalniri.id, intalnireId));
  if (!i) return null;

  const [p] = await db
    .select({ c: count() })
    .from(prezente)
    .where(eq(prezente.intalnireId, intalnireId));

  return {
    data: i.data,
    grupaId: i.grupaId,
    prezente: Number(p?.c ?? 0),
    areNote: Boolean(i.subiect || i.nota),
  };
}

/** Șterge prezența unei zile, cu tot ce s-a bifat atunci. */
export async function stergeIntalnireDefinitiv(intalnireId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(prezente).where(eq(prezente.intalnireId, intalnireId));
    await tx.delete(intalniri).where(eq(intalniri.id, intalnireId));
  });
}

export type PierderiEchipa = {
  nume: string;
  pulsisti: number;
  programari: number;
};

/** Ce se pierde dacă ștergem un loc de slujire. */
export async function pierderiEchipa(
  echipaId: number,
): Promise<PierderiEchipa | null> {
  const [e] = await db
    .select()
    .from(echipeSlujire)
    .where(eq(echipeSlujire.id, echipaId));
  if (!e) return null;

  const [[m], [p]] = await Promise.all([
    db
      .select({ c: count() })
      .from(membriEchipe)
      .where(eq(membriEchipe.echipaId, echipaId)),
    db
      .select({ c: count() })
      .from(programariSlujire)
      .where(eq(programariSlujire.echipaId, echipaId)),
  ]);

  return {
    nume: e.nume,
    pulsisti: Number(m?.c ?? 0),
    programari: Number(p?.c ?? 0),
  };
}

/** Șterge un loc de slujire. Pulsiștii rămân, doar nu mai slujesc acolo. */
export async function stergeEchipaDefinitiv(echipaId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(membriEchipe).where(eq(membriEchipe.echipaId, echipaId));
    await tx
      .delete(programariSlujire)
      .where(eq(programariSlujire.echipaId, echipaId));
    await tx.delete(echipeSlujire).where(eq(echipeSlujire.id, echipaId));
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
