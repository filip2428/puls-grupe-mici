"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { delegari, membri } from "@/lib/db/schema";
import { verificaAccesGrupa } from "@/lib/interogari/acces";
import { esteDataValida } from "@/lib/util/date";

export type StareFormular = { eroare?: string; reusit?: boolean };

const schemaMembru = z.object({
  nume: z.string().trim().min(2, "Numele e prea scurt.").max(80),
  telefon: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : null)),
  dataNasterii: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || esteDataValida(v), "Data nașterii nu e validă."),
  sex: z
    .string()
    .optional()
    .transform((v) => (v === "baiat" || v === "fata" ? v : null)),
  clasa: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (v >= 1 && v <= 13), "Clasa nu e validă."),
});

/** Adaugă un adolescent în grupă (liderul grupei sau adminul). */
export async function adaugaMembru(
  grupaId: number,
  _stare: StareFormular,
  formData: FormData,
): Promise<StareFormular> {
  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis) return { eroare: "Nu ai acces la grupa asta." };

  const rezultat = schemaMembru.safeParse({
    nume: formData.get("nume"),
    telefon: formData.get("telefon"),
    dataNasterii: formData.get("dataNasterii"),
    sex: formData.get("sex"),
    clasa: formData.get("clasa"),
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  const [creat] = await db
    .insert(membri)
    .values({ grupaId, ...rezultat.data })
    .returning({ id: membri.id });

  await scrieAudit(lider.id, "membru:adaugat", {
    grupaId,
    membruId: creat.id,
    nume: rezultat.data.nume,
  });

  revalidatePath(`/grupe/${grupaId}`);
  return { reusit: true };
}

const schemaInlocuire = z.object({
  liderId: z.coerce.number().int().positive(),
  deLa: z.string().refine(esteDataValida, "Data de început nu e validă."),
  panaLa: z.string().refine(esteDataValida, "Data de sfârșit nu e validă."),
  motiv: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
});

/**
 * Cere unui alt lider să țină locul la grupă o perioadă.
 * Îl pot face liderii grupei și adminul - nu și cineva care e deja înlocuitor.
 */
export async function creeazaInlocuire(
  grupaId: number,
  _stare: StareFormular,
  formData: FormData,
): Promise<StareFormular> {
  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis || (acces.prinInlocuire && !acces.esteAdmin)) {
    return { eroare: "Doar liderii grupei pot cere o înlocuire." };
  }

  const rezultat = schemaInlocuire.safeParse({
    liderId: formData.get("liderId"),
    deLa: formData.get("deLa"),
    panaLa: formData.get("panaLa"),
    motiv: formData.get("motiv"),
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }
  if (rezultat.data.panaLa < rezultat.data.deLa) {
    return { eroare: "Data de sfârșit e înaintea celei de început." };
  }

  await db.insert(delegari).values({
    grupaId,
    liderId: rezultat.data.liderId,
    deLa: rezultat.data.deLa,
    panaLa: rezultat.data.panaLa,
    motiv: rezultat.data.motiv,
    creatDeId: lider.id,
  });

  await scrieAudit(lider.id, "inlocuire:creata", {
    grupaId,
    ...rezultat.data,
  });

  revalidatePath(`/grupe/${grupaId}`);
  return { reusit: true };
}

/** Anulează o înlocuire. */
export async function anuleazaInlocuire(grupaId: number, delegareId: number) {
  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis || (acces.prinInlocuire && !acces.esteAdmin)) return;

  await db
    .update(delegari)
    .set({ anulata: true })
    .where(and(eq(delegari.id, delegareId), eq(delegari.grupaId, grupaId)));

  await scrieAudit(lider.id, "inlocuire:anulata", { grupaId, delegareId });
  revalidatePath(`/grupe/${grupaId}`);
}
