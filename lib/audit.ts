import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { audit, lideri } from "@/lib/db/schema";

/**
 * Jurnalul modificărilor. Orice schimbare importantă (prezență, membri,
 * lideri, coduri, înlocuiri) lasă o urmă: cine, ce și când.
 * Adminul îl vede în panoul de administrare.
 */
export async function scrieAudit(
  liderId: number | null,
  actiune: string,
  detalii?: Record<string, unknown>,
) {
  await db.insert(audit).values({
    liderId,
    actiune,
    detalii: detalii ? JSON.stringify(detalii) : null,
  });
}

export async function ultimeleAuditari(limita = 100) {
  return db
    .select({
      id: audit.id,
      actiune: audit.actiune,
      detalii: audit.detalii,
      creatLa: audit.creatLa,
      liderNume: lideri.nume,
    })
    .from(audit)
    .leftJoin(lideri, eq(lideri.id, audit.liderId))
    .orderBy(desc(audit.creatLa))
    .limit(limita);
}
