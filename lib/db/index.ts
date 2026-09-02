import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

/**
 * Conexiunea la baza de date.
 *
 * La dezvoltare: DATABASE_URL = "file:./local.db" (un fișier pe calculatorul tău).
 * În producție:  DATABASE_URL = "libsql://...turso.io" + DATABASE_AUTH_TOKEN.
 *
 * Clientul e păstrat pe `globalThis` ca să nu se deschidă o conexiune nouă
 * la fiecare reîncărcare a modulelor în dezvoltare.
 */
const global_ = globalThis as unknown as {
  __pulsDb?: ReturnType<typeof creeazaDb>;
};

function creeazaDb() {
  const url = process.env.DATABASE_URL ?? "file:./local.db";
  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

export const db = global_.__pulsDb ?? creeazaDb();
if (process.env.NODE_ENV !== "production") global_.__pulsDb = db;

export { schema };
