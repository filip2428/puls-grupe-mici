import type { Config } from "drizzle-kit";

// Configurarea Drizzle: unde e schema și unde ajung migrările.
// La dezvoltare baza de date e un fișier local (local.db), în producție e Turso.
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
