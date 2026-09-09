import "server-only";

import { and, count, eq, inArray, isNotNull, ne, or } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  abonamentePush,
  audit,
  delegari,
  echipeSlujire,
  evenimente,
  grupe,
  intalniri,
  lideri,
  lideriEchipe,
  lideriGrupe,
  membri,
  membriEchipe,
  noteMembru,
  notificari,
  prezente,
  prezenteSlujire,
  prietenii,
  programariGrupe,
  programariSlujire,
} from "@/lib/db/schema";
import { acelasiNume } from "@/lib/util/text";

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
    await tx.delete(lideriEchipe).where(eq(lideriEchipe.liderId, liderId));
    await tx
      .update(programariSlujire)
      .set({ creatDeId: null })
      .where(eq(programariSlujire.creatDeId, liderId));
    await tx
      .update(evenimente)
      .set({ creatDeId: null })
      .where(eq(evenimente.creatDeId, liderId));
    await tx.update(audit).set({ liderId: null }).where(eq(audit.liderId, liderId));

    await tx.delete(lideri).where(eq(lideri.id, liderId));
  });
}

export type PierderiMembru = {
  nume: string;
  grupaId: number | null;
  prezente: number;
  note: number;
  echipe: number;
  prieteni: number;
};

/** Ce se pierde dacă ștergem un pulsist. */
export async function pierderiMembru(
  membruId: number,
): Promise<PierderiMembru | null> {
  const [m] = await db.select().from(membri).where(eq(membri.id, membruId));
  if (!m) return null;

  const [[p], [n], [e], [pr]] = await Promise.all([
    db.select({ c: count() }).from(prezente).where(eq(prezente.membruId, membruId)),
    db
      .select({ c: count() })
      .from(noteMembru)
      .where(eq(noteMembru.membruId, membruId)),
    db
      .select({ c: count() })
      .from(membriEchipe)
      .where(eq(membriEchipe.membruId, membruId)),
    db
      .select({ c: count() })
      .from(prietenii)
      .where(
        or(
          eq(prietenii.membruAId, membruId),
          eq(prietenii.membruBId, membruId),
        ),
      ),
  ]);

  return {
    nume: m.nume,
    grupaId: m.grupaId,
    prezente: Number(p?.c ?? 0),
    note: Number(n?.c ?? 0),
    echipe: Number(e?.c ?? 0),
    prieteni: Number(pr?.c ?? 0),
  };
}

/** Șterge definitiv un pulsist, cu tot istoricul lui. */
export async function stergeMembruDefinitiv(membruId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(prezente).where(eq(prezente.membruId, membruId));
    await tx
      .delete(prezenteSlujire)
      .where(eq(prezenteSlujire.membruId, membruId));
    await tx.delete(noteMembru).where(eq(noteMembru.membruId, membruId));
    await tx.delete(membriEchipe).where(eq(membriEchipe.membruId, membruId));
    // Prietenia poate fi scrisă în oricare din cele două coloane.
    await tx
      .delete(prietenii)
      .where(
        or(
          eq(prietenii.membruAId, membruId),
          eq(prietenii.membruBId, membruId),
        ),
      );
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
  /** În câte slujiri din calendar e trecută grupa. */
  programari: number;
  /**
   * Câte dintre ele rămân fără nimeni și se șterg.
   *
   * O slujire la care mai slujesc și alții nu dispare - grupa doar iese din
   * ea. Dispare doar cea care rămâne goală, fiindcă n-ar mai avea ce spune.
   */
  programariGoale: number;
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
      .from(programariGrupe)
      .where(eq(programariGrupe.grupaId, grupaId)),
  ]);

  const goale = await programariRamaseGoale(grupaId);

  return {
    nume: g.nume,
    pulsisti: idMembri.length,
    intalniri: idIntalniri.length,
    prezente: Number(p?.c ?? 0),
    note: Number(n?.c ?? 0),
    lideri: Number(l?.c ?? 0),
    programari: Number(pr?.c ?? 0),
    programariGoale: goale.length,
  };
}

/**
 * Programările care ar rămâne fără nimeni dacă grupa asta iese din ele:
 * n-au altă grupă și nici echipă.
 */
async function programariRamaseGoale(grupaId: number): Promise<number[]> {
  const aleGrupei = await db
    .select({ id: programariGrupe.programareId })
    .from(programariGrupe)
    .where(eq(programariGrupe.grupaId, grupaId));
  if (aleGrupei.length === 0) return [];
  const ids = aleGrupei.map((p) => p.id);

  const [altele, cuEchipa] = await Promise.all([
    db
      .select({ id: programariGrupe.programareId })
      .from(programariGrupe)
      .where(
        and(
          inArray(programariGrupe.programareId, ids),
          ne(programariGrupe.grupaId, grupaId),
        ),
      ),
    db
      .select({ id: programariSlujire.id })
      .from(programariSlujire)
      .where(
        and(
          inArray(programariSlujire.id, ids),
          isNotNull(programariSlujire.echipaId),
        ),
      ),
  ]);

  const ramane = new Set([...altele, ...cuEchipa].map((r) => r.id));
  return ids.filter((id) => !ramane.has(id));
}

/**
 * Șterge definitiv o grupă: întâlnirile ei cu prezențele lor, înlocuirile și
 * programările.
 *
 * PULSIȘTII NU SE ȘTERG. Rămân ai lucrării, doar fără grupă, și așteaptă la
 * „Administrare · Nerepartizați". O grupă desființată înseamnă că s-a
 * schimbat împărțirea, nu că au plecat oamenii - iar datele lor (botez,
 * biserică, părinți, note) s-au strâns în luni de zile.
 *
 * Ce se pierde totuși e prezența de la întâlnirile grupei: ea ține de întâlniri,
 * iar întâlnirile dispar odată cu grupa. De-aia ecranul de confirmare o spune.
 * Liderii rămân și ei - doar nu mai sunt repartizați aici.
 */
export async function stergeGrupaDefinitiv(grupaId: number) {
  const aleGrupei = await db
    .select({ id: intalniri.id })
    .from(intalniri)
    .where(eq(intalniri.grupaId, grupaId));

  const idIntalniri = aleGrupei.map((i) => i.id);
  const idProgramari = await programariRamaseGoale(grupaId);

  await db.transaction(async (tx) => {
    if (idIntalniri.length > 0) {
      await tx.delete(prezente).where(inArray(prezente.intalnireId, idIntalniri));
    }
    if (idProgramari.length > 0) {
      await tx
        .delete(prezenteSlujire)
        .where(inArray(prezenteSlujire.programareId, idProgramari));
    }
    await tx.delete(intalniri).where(eq(intalniri.grupaId, grupaId));
    // Oamenii rămân; îi scoatem doar din grupa care dispare.
    await tx
      .update(membri)
      .set({ grupaId: null })
      .where(eq(membri.grupaId, grupaId));
    await tx.delete(lideriGrupe).where(eq(lideriGrupe.grupaId, grupaId));
    await tx.delete(delegari).where(eq(delegari.grupaId, grupaId));
    /*
      Din calendar iese doar grupa. Slujirile la care mai slujește cineva
      rămân în picioare; se șterg doar cele care ar rămâne goale.
    */
    await tx.delete(programariGrupe).where(eq(programariGrupe.grupaId, grupaId));
    if (idProgramari.length > 0) {
      await tx
        .delete(programariSlujire)
        .where(inArray(programariSlujire.id, idProgramari));
    }
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
  /** În câte slujiri din calendar e trecută echipa. */
  programari: number;
  /** Câte dintre ele n-au nicio grupă și deci se șterg cu totul. */
  programariGoale: number;
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

  const [[m], [p], goale] = await Promise.all([
    db
      .select({ c: count() })
      .from(membriEchipe)
      .where(eq(membriEchipe.echipaId, echipaId)),
    db
      .select({ c: count() })
      .from(programariSlujire)
      .where(eq(programariSlujire.echipaId, echipaId)),
    programariFaraGrupe(echipaId),
  ]);

  return {
    nume: e.nume,
    pulsisti: Number(m?.c ?? 0),
    programari: Number(p?.c ?? 0),
    programariGoale: goale.length,
  };
}

/** Programările echipei la care nu slujește nicio grupă. */
async function programariFaraGrupe(echipaId: number): Promise<number[]> {
  const aleEchipei = await db
    .select({ id: programariSlujire.id })
    .from(programariSlujire)
    .where(eq(programariSlujire.echipaId, echipaId));
  if (aleEchipei.length === 0) return [];
  const ids = aleEchipei.map((p) => p.id);

  const cuGrupe = await db
    .selectDistinct({ id: programariGrupe.programareId })
    .from(programariGrupe)
    .where(inArray(programariGrupe.programareId, ids));

  const ramane = new Set(cuGrupe.map((r) => r.id));
  return ids.filter((id) => !ramane.has(id));
}

/** Șterge un loc de slujire. Pulsiștii rămân, doar nu mai slujesc acolo. */
export async function stergeEchipaDefinitiv(echipaId: number) {
  const idProgramari = await programariFaraGrupe(echipaId);

  await db.transaction(async (tx) => {
    await tx.delete(membriEchipe).where(eq(membriEchipe.echipaId, echipaId));
    await tx.delete(lideriEchipe).where(eq(lideriEchipe.echipaId, echipaId));
    if (idProgramari.length > 0) {
      await tx
        .delete(prezenteSlujire)
        .where(inArray(prezenteSlujire.programareId, idProgramari));
      await tx
        .delete(programariSlujire)
        .where(inArray(programariSlujire.id, idProgramari));
    }
    /*
      Slujirile la care erau trecute și grupe rămân în calendar - grupele
      slujesc mai departe în ziua aia, doar că nu mai e nimeni deasupra lor.
    */
    await tx
      .update(programariSlujire)
      .set({ echipaId: null })
      .where(eq(programariSlujire.echipaId, echipaId));
    await tx.delete(echipeSlujire).where(eq(echipeSlujire.id, echipaId));
  });
}

/**
 * Compară ce a scris omul în caseta de confirmare cu numele real.
 * Ignorăm diacriticele și spațiile în plus - contează intenția, nu tastatura.
 */
export function numeConfirmat(scris: string, real: string): boolean {
  return acelasiNume(scris, real);
}
