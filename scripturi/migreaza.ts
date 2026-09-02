/**
 * `npm run db:migrate`
 *
 * Aplică migrările din folderul ./drizzle pe baza de date din DATABASE_URL.
 * Merge la fel pe baza locală (file:./local.db) și pe cea din producție (Turso).
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./local.db";
  console.log(`Migrez baza de date: ${url}`);

  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrările au fost aplicate.");
  client.close();
}

main().catch((eroare) => {
  console.error(eroare);
  process.exit(1);
});
