/**
 * `npm run lider:nou -- --nume "Ana Popescu" [--rol admin] [--telefon 07...]`
 *
 * Creează un lider (sau administrator) și afișează codul lui de acces.
 * Codul apare O SINGURĂ DATĂ - dacă se pierde, se generează altul cu
 * `npm run cod:nou -- --id 3`.
 *
 * De obicei nu ai nevoie de scriptul ăsta: adminul poate face totul din
 * pagina de administrare. E util doar pentru primul administrator.
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
  const nume = argument("nume");
  if (!nume) {
    console.error('Lipsește numele. Exemplu: npm run lider:nou -- --nume "Ana Popescu"');
    process.exit(1);
  }

  const rol = argument("rol") === "admin" ? "admin" : "lider";
  const telefon = argument("telefon") ?? null;

  // Ne asigurăm că partea publică a codului e unică.
  let cod = genereazaCod();
  for (let incercare = 0; incercare < 20; incercare++) {
    const [existent] = await db
      .select({ id: lideri.id })
      .from(lideri)
      .where(eq(lideri.codPublic, cod.partePublica));
    if (!existent) break;
    cod = genereazaCod();
  }

  const [creat] = await db
    .insert(lideri)
    .values({
      nume,
      telefon,
      rol,
      codPublic: cod.partePublica,
      codHash: await hashCod(cod.parteSecreta),
    })
    .returning({ id: lideri.id });

  console.log("");
  console.log(`  ${rol === "admin" ? "Administrator" : "Lider"} creat: ${nume} (id ${creat.id})`);
  console.log("");
  console.log(`  Cod de acces:  ${cod.codIntreg}`);
  console.log("");
  console.log("  Dă-i codul persoanei în privat. Nu mai poate fi văzut după asta.");
  console.log("");
}

main().catch((eroare) => {
  console.error(eroare);
  process.exit(1);
});
