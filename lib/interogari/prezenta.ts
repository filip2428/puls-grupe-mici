import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  intalniri,
  membri as tabelMembri,
  prezente,
  type Membru,
  type StarePrezenta,
} from "@/lib/db/schema";
import { membriGrupei, musafiriRecenti } from "./grupe";

export type FoaieDePrezenta = {
  intalnireId: number | null;
  data: string;
  subiect: string | null;
  nota: string | null;
  numarInvitati: number;
  /** Pulsiștii care fac parte din grupă. */
  membri: Membru[];
  /** Musafirii care au trecut pe la grupă în ultima vreme. */
  musafiri: Membru[];
  /** membruId -> stare, doar pentru cei deja marcați. */
  stari: Record<number, StarePrezenta>;
};

/**
 * Pregătește foaia de prezență a unei grupe pentru o dată anume.
 * Dacă întâlnirea nu există încă, întoarce listele fără stări.
 */
export async function foaiaDePrezenta(
  grupaId: number,
  data: string,
): Promise<FoaieDePrezenta> {
  const [intalnire] = await db
    .select()
    .from(intalniri)
    .where(and(eq(intalniri.grupaId, grupaId), eq(intalniri.data, data)));

  const [membri, musafiri] = await Promise.all([
    membriGrupei(grupaId),
    musafiriRecenti(grupaId, data),
  ]);

  const stari: Record<number, StarePrezenta> = {};
  if (intalnire) {
    const randuri = await db
      .select({ membruId: prezente.membruId, stare: prezente.stare })
      .from(prezente)
      .where(eq(prezente.intalnireId, intalnire.id));
    for (const r of randuri) stari[r.membruId] = r.stare;
  }

  return {
    intalnireId: intalnire?.id ?? null,
    data,
    subiect: intalnire?.subiect ?? null,
    nota: intalnire?.nota ?? null,
    numarInvitati: intalnire?.numarInvitati ?? 0,
    membri,
    musafiri,
    stari,
  };
}

export type DatePrezenta = {
  grupaId: number;
  data: string;
  liderId: number;
  prinInlocuire: boolean;
  subiect: string | null;
  nota: string | null;
  numarInvitati: number;
  stari: Record<number, StarePrezenta>;
};

export type RezultatSalvare = {
  intalnireId: number;
  prezenti: number;
  total: number;
  eraNoua: boolean;
};

/**
 * Salvează prezența unei întâlniri (o creează dacă nu există).
 * Acceptă doar membri care chiar aparțin grupei - restul sunt ignorați.
 */
export async function salveazaPrezenta(
  date: DatePrezenta,
): Promise<RezultatSalvare> {
  const membriGrupa = await db
    .select({ id: tabelMembri.id })
    .from(tabelMembri)
    .where(eq(tabelMembri.grupaId, date.grupaId));
  const idValide = new Set(membriGrupa.map((m) => m.id));

  const [existenta] = await db
    .select()
    .from(intalniri)
    .where(
      and(eq(intalniri.grupaId, date.grupaId), eq(intalniri.data, date.data)),
    );

  let intalnireId: number;
  const eraNoua = !existenta;

  if (existenta) {
    await db
      .update(intalniri)
      .set({
        subiect: date.subiect,
        nota: date.nota,
        numarInvitati: date.numarInvitati,
        marcatDeId: date.liderId,
        prinInlocuire: date.prinInlocuire,
        actualizatLa: new Date(),
      })
      .where(eq(intalniri.id, existenta.id));
    intalnireId = existenta.id;
  } else {
    const [creata] = await db
      .insert(intalniri)
      .values({
        grupaId: date.grupaId,
        data: date.data,
        subiect: date.subiect,
        nota: date.nota,
        numarInvitati: date.numarInvitati,
        marcatDeId: date.liderId,
        prinInlocuire: date.prinInlocuire,
      })
      .returning({ id: intalniri.id });
    intalnireId = creata.id;
  }

  let prezenti = 0;
  let total = 0;

  for (const [membruIdText, stare] of Object.entries(date.stari)) {
    const membruId = Number(membruIdText);
    if (!idValide.has(membruId)) continue;
    total++;
    if (stare === "prezent") prezenti++;

    await db
      .insert(prezente)
      .values({ intalnireId, membruId, stare })
      .onConflictDoUpdate({
        target: [prezente.intalnireId, prezente.membruId],
        set: { stare },
      });
  }

  return { intalnireId, prezenti, total, eraNoua };
}
