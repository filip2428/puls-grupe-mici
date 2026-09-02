/**
 * `npm run cod:nou -- --id 3`
 *
 * Generează un cod de acces nou pentru un lider (când și-a pierdut codul).
 * Sesiunile lui vechi se închid automat.
 */
import { eq } from "drizzle-orm";

import { genereazaCod, hashCod } from "../lib/auth/cod";
import { db } from "../lib/db";
import { lideri } from "../lib/db/schema";

function argument(nume: string): string | undefined {
  const i = process.argv.indexOf(`--${nume}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const id = Number(argument("id"));
  if (!Number.isInteger(id)) {
    console.error("Lipsește id-ul. Exemplu: npm run cod:nou -- --id 3");
    console.error("Lista liderilor:");
    for (const l of await db.select().from(lideri)) {
      console.error(`  ${l.id}  ${l.nume} (${l.rol})`);
    }
    process.exit(1);
  }

  const [lider] = await db.select().from(lideri).where(eq(lideri.id, id));
  if (!lider) {
    console.error(`Nu există niciun lider cu id-ul ${id}.`);
    process.exit(1);
  }

  let cod = genereazaCod();
  for (let incercare = 0; incercare < 20; incercare++) {
    const [existent] = await db
      .select({ id: lideri.id })
      .from(lideri)
      .where(eq(lideri.codPublic, cod.partePublica));
    if (!existent || existent.id === lider.id) break;
    cod = genereazaCod();
  }

  await db
    .update(lideri)
    .set({
      codPublic: cod.partePublica,
      codHash: await hashCod(cod.parteSecreta),
      versiuneSesiuni: lider.versiuneSesiuni + 1,
    })
    .where(eq(lideri.id, lider.id));

  console.log("");
  console.log(`  Cod nou pentru ${lider.nume}:  ${cod.codIntreg}`);
  console.log("");
}

main().catch((eroare) => {
  console.error(eroare);
  process.exit(1);
});
