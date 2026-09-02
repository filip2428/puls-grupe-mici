import { createHmac } from "node:crypto";

import { and, eq, gte, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { incercariLogin } from "@/lib/db/schema";
import { secretulAplicatiei } from "./secret";

/**
 * Limitarea încercărilor de autentificare.
 *
 * Ne apărăm în primul rând de roboți: cineva (sau ceva) care încearcă coduri
 * la nimereală e oprit după câteva încercări greșite, atât pe IP cât și pe
 * codul public încercat.
 */

/** Câte încercări greșite sunt permise într-o fereastră. */
const MAX_INCERCARI = 5;
/** Fereastra de timp, în secunde (15 minute). */
const FEREASTRA_SECUNDE = 15 * 60;
/** Cât timp păstrăm istoricul încercărilor (24 de ore). */
const PASTRARE_SECUNDE = 24 * 60 * 60;

/** Nu salvăm IP-uri în clar - doar un hash cu secretul aplicației. */
export function cheieAnonima(prefix: string, valoare: string): string {
  return (
    prefix +
    ":" +
    createHmac("sha256", secretulAplicatiei())
      .update(valoare)
      .digest("base64url")
      .slice(0, 22)
  );
}

export type RezultatLimita = {
  permis: boolean;
  /** Câte secunde mai are de așteptat, dacă e blocat. */
  asteaptaSecunde: number;
  /** Câte încercări mai are până la blocare. */
  incercariRamase: number;
};

/** Verifică dacă mai are voie să încerce (fără să înregistreze nimic). */
export async function verificaLimita(chei: string[]): Promise<RezultatLimita> {
  const acum = Math.floor(Date.now() / 1000);
  const deLa = new Date((acum - FEREASTRA_SECUNDE) * 1000);

  let maximIncercari = 0;
  let ceaMaiVecheRelevanta = acum;

  for (const cheie of chei) {
    const randuri = await db
      .select({ creatLa: incercariLogin.creatLa })
      .from(incercariLogin)
      .where(
        and(
          eq(incercariLogin.cheie, cheie),
          eq(incercariLogin.reusita, false),
          gte(incercariLogin.creatLa, deLa),
        ),
      );
    if (randuri.length > maximIncercari) {
      maximIncercari = randuri.length;
      const ceaMaiVeche = randuri
        .map((r) => Math.floor(r.creatLa.getTime() / 1000))
        .sort((a, b) => a - b)[0];
      ceaMaiVecheRelevanta = ceaMaiVeche ?? acum;
    }
  }

  if (maximIncercari >= MAX_INCERCARI) {
    const asteapta = Math.max(
      1,
      ceaMaiVecheRelevanta + FEREASTRA_SECUNDE - acum,
    );
    return { permis: false, asteaptaSecunde: asteapta, incercariRamase: 0 };
  }

  return {
    permis: true,
    asteaptaSecunde: 0,
    incercariRamase: MAX_INCERCARI - maximIncercari,
  };
}

/** Înregistrează o încercare (reușită sau nu) pentru fiecare cheie. */
export async function inregistreazaIncercare(chei: string[], reusita: boolean) {
  if (chei.length === 0) return;
  await db
    .insert(incercariLogin)
    .values(chei.map((cheie) => ({ cheie, reusita })));

  // Curățăm din când în când istoricul vechi, ca tabelul să nu crească la nesfârșit.
  if (Math.random() < 0.05) {
    await db
      .delete(incercariLogin)
      .where(
        lt(
          incercariLogin.creatLa,
          new Date(Date.now() - PASTRARE_SECUNDE * 1000),
        ),
      );
  }
}

/** Șterge încercările greșite după o autentificare reușită. */
export async function resetLimita(chei: string[]) {
  for (const cheie of chei) {
    await db.delete(incercariLogin).where(eq(incercariLogin.cheie, cheie));
  }
}

/** Text prietenos pentru timpul de așteptare. */
export function textAsteptare(secunde: number): string {
  const minute = Math.ceil(secunde / 60);
  if (minute <= 1) return "un minut";
  return `${minute} minute`;
}
