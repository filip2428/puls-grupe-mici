import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  echipeSlujire,
  grupe,
  lideri,
  membri,
  membriEchipe,
  prezenteSlujire,
  programariGrupe,
  programariSlujire,
  type Lider,
  type StarePrezenta,
} from "@/lib/db/schema";
import { verificaAccesGrupa } from "./acces";
import { esteLiderulEchipei, type GrupaScurta } from "./slujiri";

/**
 * Prezența la slujire.
 *
 * E cu totul altceva decât prezența de la grupa mică. Acolo se numără cine a
 * venit la întâlnirea săptămânală; aici, cine a venit efectiv să slujească.
 * Un pulsist poate lipsi de la grupă și totuși să slujească duminică, sau
 * invers - de-aia cele două nu se amestecă niciodată în statistici.
 *
 * Evenimentul e chiar programarea din calendar, nu ceva creat separat.
 */

export type ProgramareCuPrezenta = {
  id: number;
  data: string;
  titlu: string;
  detalii: string | null;
  ora: string | null;
  locatie: string | null;
  grupe: GrupaScurta[];
  echipaId: number | null;
  echipaNume: string | null;
  prezentaMarcataLa: Date | null;
  prezentaMarcataDeNume: string | null;
  prezentaNota: string | null;
};

/** O programare, cu tot ce trebuie ca să știm dacă prezența e făcută. */
export async function programareCuPrezenta(
  programareId: number,
): Promise<ProgramareCuPrezenta | null> {
  const [p] = await db
    .select({
      id: programariSlujire.id,
      data: programariSlujire.data,
      titlu: programariSlujire.titlu,
      detalii: programariSlujire.detalii,
      ora: programariSlujire.ora,
      locatie: programariSlujire.locatie,
      echipaId: programariSlujire.echipaId,
      echipaNume: echipeSlujire.nume,
      prezentaMarcataLa: programariSlujire.prezentaMarcataLa,
      prezentaMarcataDeNume: lideri.nume,
      prezentaNota: programariSlujire.prezentaNota,
    })
    .from(programariSlujire)
    .leftJoin(echipeSlujire, eq(echipeSlujire.id, programariSlujire.echipaId))
    .leftJoin(lideri, eq(lideri.id, programariSlujire.prezentaMarcataDeId))
    .where(eq(programariSlujire.id, programareId));
  if (!p) return null;

  const aleEi = await db
    .select({ id: grupe.id, nume: grupe.nume })
    .from(programariGrupe)
    .innerJoin(grupe, eq(grupe.id, programariGrupe.grupaId))
    .where(eq(programariGrupe.programareId, programareId));

  return {
    ...p,
    grupe: aleEi.sort((a, b) => a.nume.localeCompare(b.nume, "ro")),
  };
}

export type AccesProgramare = {
  permis: boolean;
  prinInlocuire: boolean;
};

/**
 * Cine are voie să facă prezența la o slujire.
 *
 * Dacă slujesc grupe, hotărăsc aceleași reguli ca la grupa mică - inclusiv
 * înlocuitorii - și e destul să fii liderul uneia dintre ele. Dacă e
 * programată o echipă, au voie liderii ei. Adminul, peste tot.
 */
export async function verificaAccesProgramare(
  lider: Lider,
  programare: { grupe: GrupaScurta[]; echipaId: number | null },
): Promise<AccesProgramare> {
  if (lider.rol === "admin") return { permis: true, prinInlocuire: false };

  for (const g of programare.grupe) {
    const acces = await verificaAccesGrupa(lider, g.id);
    if (acces.permis) {
      return { permis: true, prinInlocuire: acces.prinInlocuire };
    }
  }

  if (programare.echipaId !== null) {
    if (await esteLiderulEchipei(lider.id, programare.echipaId)) {
      return { permis: true, prinInlocuire: false };
    }
  }

  return { permis: false, prinInlocuire: false };
}

export type PersoanaDeSlujire = {
  id: number;
  nume: string;
  /** De unde vine pe listă: dintr-o grupă programată sau din echipă. */
  sursa: "grupa" | "echipa";
  /** Grupa din care vine, când vine dintr-una - la două grupe contează. */
  grupaNume: string | null;
};

export type FoaieSlujire = {
  persoane: PersoanaDeSlujire[];
  stari: Record<number, StarePrezenta>;
};

/**
 * Cine ar trebui să fie la slujirea asta.
 *
 * Dacă slujesc grupe, toți membrii lor activi. Dacă e programată o echipă,
 * pulsiștii din echipă. Dacă sunt și una și alta - grupele ajută echipa -
 * lista e reunită, fără să apară cineva de două ori.
 *
 * Musafirii nu intră: ei sunt în vizită la grupă, nu în slujire.
 */
export async function foaiaSlujirii(programare: {
  id: number;
  grupe: GrupaScurta[];
  echipaId: number | null;
}): Promise<FoaieSlujire> {
  const persoane: PersoanaDeSlujire[] = [];
  const vazute = new Set<number>();

  if (programare.grupe.length > 0) {
    const dinGrupe = await db
      .select({ id: membri.id, nume: membri.nume, grupaId: membri.grupaId })
      .from(membri)
      .where(
        and(
          inArray(
            membri.grupaId,
            programare.grupe.map((g) => g.id),
          ),
          eq(membri.activ, true),
          eq(membri.status, "membru"),
        ),
      );

    const numeGrupe = new Map(programare.grupe.map((g) => [g.id, g.nume]));
    for (const m of dinGrupe) {
      vazute.add(m.id);
      persoane.push({
        id: m.id,
        nume: m.nume,
        sursa: "grupa",
        grupaNume: m.grupaId !== null ? (numeGrupe.get(m.grupaId) ?? null) : null,
      });
    }
  }

  if (programare.echipaId !== null) {
    const dinEchipa = await db
      .select({ id: membri.id, nume: membri.nume, grupaNume: grupe.nume })
      .from(membriEchipe)
      .innerJoin(membri, eq(membri.id, membriEchipe.membruId))
      .leftJoin(grupe, eq(grupe.id, membri.grupaId))
      .where(
        and(
          eq(membriEchipe.echipaId, programare.echipaId),
          eq(membri.activ, true),
        ),
      );
    for (const m of dinEchipa) {
      if (vazute.has(m.id)) continue;
      vazute.add(m.id);
      persoane.push({ ...m, sursa: "echipa" });
    }
  }

  /*
    Întâi grupele, apoi echipa, iar în fiecare bucată alfabetic pe grupe și
    pe nume: liderul care completează se uită la oamenii lui, strânși la un
    loc, nu la o listă amestecată.
  */
  persoane.sort(
    (a, b) =>
      a.sursa.localeCompare(b.sursa) ||
      (a.grupaNume ?? "").localeCompare(b.grupaNume ?? "", "ro") ||
      a.nume.localeCompare(b.nume, "ro"),
  );

  const stari: Record<number, StarePrezenta> = {};
  const randuri = await db
    .select({
      membruId: prezenteSlujire.membruId,
      stare: prezenteSlujire.stare,
    })
    .from(prezenteSlujire)
    .where(eq(prezenteSlujire.programareId, programare.id));
  for (const r of randuri) stari[r.membruId] = r.stare;

  return { persoane, stari };
}

/** Salvează foaia unei slujiri. Întoarce câți au fost prezenți din câți. */
export async function salveazaPrezentaSlujire(optiuni: {
  programareId: number;
  liderId: number;
  nota: string | null;
  stari: Record<string, StarePrezenta>;
}): Promise<{ prezenti: number; total: number; eraNoua: boolean }> {
  const { programareId, liderId, nota, stari } = optiuni;

  const [inainte] = await db
    .select({ marcataLa: programariSlujire.prezentaMarcataLa })
    .from(programariSlujire)
    .where(eq(programariSlujire.id, programareId));
  const eraNoua = !inainte?.marcataLa;

  const perechi = Object.entries(stari).map(([id, stare]) => ({
    membruId: Number(id),
    stare,
  }));

  await db.transaction(async (tx) => {
    await tx
      .update(programariSlujire)
      .set({
        prezentaMarcataDeId: liderId,
        prezentaMarcataLa: new Date(),
        prezentaNota: nota,
      })
      .where(eq(programariSlujire.id, programareId));

    /*
      Ștergem tot și rescriem, în loc să căutăm ce s-a schimbat. O foaie are
      zeci de rânduri, nu mii, iar așa dispar singure și bifele celor scoși
      de pe listă între timp. Totul într-o tranzacție, deci nimeni nu vede
      foaia goală la mijloc.
    */
    await tx
      .delete(prezenteSlujire)
      .where(eq(prezenteSlujire.programareId, programareId));

    if (perechi.length > 0) {
      await tx.insert(prezenteSlujire).values(
        perechi.map((p) => ({
          programareId,
          membruId: p.membruId,
          stare: p.stare,
        })),
      );
    }
  });

  return {
    prezenti: perechi.filter((p) => p.stare === "prezent").length,
    total: perechi.length,
    eraNoua,
  };
}

/** Dintr-o listă de programări, care au deja prezența făcută. */
export async function programariCuPrezentaFacuta(
  ids: number[],
): Promise<Set<number>> {
  if (ids.length === 0) return new Set();

  const randuri = await db
    .select({
      id: programariSlujire.id,
      marcataLa: programariSlujire.prezentaMarcataLa,
    })
    .from(programariSlujire)
    .where(inArray(programariSlujire.id, ids));

  return new Set(randuri.filter((r) => r.marcataLa !== null).map((r) => r.id));
}
