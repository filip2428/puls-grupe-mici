"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { membri, noteMembru } from "@/lib/db/schema";
import { verificaAccesGrupa } from "@/lib/interogari/acces";
import { dataAzi, esteDataValida } from "@/lib/util/date";

export type StareFormular = { eroare?: string; reusit?: boolean };

/** Verifică dreptul de a lucra cu un anumit adolescent. */
async function accesLaMembru(membruId: number) {
  const lider = await ceruteLider();
  const [m] = await db
    .select({ id: membri.id, grupaId: membri.grupaId })
    .from(membri)
    .where(eq(membri.id, membruId));
  if (!m) return null;
  const acces = await verificaAccesGrupa(lider, m.grupaId);
  if (!acces.permis) return null;
  return { lider, membru: m };
}

/** Adaugă o notă despre un adolescent. */
export async function adaugaNota(
  membruId: number,
  _stare: StareFormular,
  formData: FormData,
): Promise<StareFormular> {
  const acces = await accesLaMembru(membruId);
  if (!acces) return { eroare: "Nu ai acces la adolescentul ăsta." };

  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 2) return { eroare: "Scrie ceva mai întâi." };
  if (text.length > 2000) return { eroare: "Nota e prea lungă." };

  await db.insert(noteMembru).values({
    membruId,
    autorId: acces.lider.id,
    text,
  });
  await scrieAudit(acces.lider.id, "nota:adaugata", { membruId });

  revalidatePath(`/membri/${membruId}`);
  return { reusit: true };
}

/** Șterge o notă (doar autorul ei sau un admin). */
export async function stergeNota(membruId: number, notaId: number) {
  const acces = await accesLaMembru(membruId);
  if (!acces) return;

  const [nota] = await db
    .select()
    .from(noteMembru)
    .where(and(eq(noteMembru.id, notaId), eq(noteMembru.membruId, membruId)));
  if (!nota) return;
  if (nota.autorId !== acces.lider.id && acces.lider.rol !== "admin") return;

  await db.delete(noteMembru).where(eq(noteMembru.id, notaId));
  await scrieAudit(acces.lider.id, "nota:stearsa", { membruId, notaId });
  revalidatePath(`/membri/${membruId}`);
}

const textOptional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const schemaMembru = z.object({
  nume: z.string().trim().min(2, "Numele e prea scurt.").max(80),
  telefon: textOptional(30),
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
  parinte1Nume: textOptional(80),
  parinte1Telefon: textOptional(30),
  parinte2Nume: textOptional(80),
  parinte2Telefon: textOptional(30),
});

/** Salvează datele unui adolescent. */
export async function salveazaMembru(
  membruId: number,
  _stare: StareFormular,
  formData: FormData,
): Promise<StareFormular> {
  const acces = await accesLaMembru(membruId);
  if (!acces) return { eroare: "Nu ai acces la adolescentul ăsta." };

  const rezultat = schemaMembru.safeParse({
    nume: formData.get("nume"),
    telefon: formData.get("telefon"),
    dataNasterii: formData.get("dataNasterii"),
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  await db.update(membri).set(rezultat.data).where(eq(membri.id, membruId));
  await scrieAudit(acces.lider.id, "membru:modificat", { membruId });

  revalidatePath(`/membri/${membruId}`);
  return { reusit: true };
}

/**
 * Marchează un adolescent ca inactiv (nu mai vine) sau îl reactivează.
 * Istoricul lui rămâne intact - doar nu mai apare pe foaia de prezență.
 */
export async function schimbaActiv(membruId: number, activ: boolean) {
  const acces = await accesLaMembru(membruId);
  if (!acces) return;

  await db.update(membri).set({ activ }).where(eq(membri.id, membruId));
  await scrieAudit(acces.lider.id, activ ? "membru:reactivat" : "membru:inactivat", {
    membruId,
  });

  revalidatePath(`/membri/${membruId}`);
  revalidatePath(`/grupe/${acces.membru.grupaId}`);
}

/**
 * Primește un musafir în grupă (după procedura internă a lucrării).
 * Din momentul ăsta intră în statistici și în alertele de absență.
 */
export async function primesteInGrupa(membruId: number) {
  const acces = await accesLaMembru(membruId);
  if (!acces) return;

  await db
    .update(membri)
    .set({ status: "membru", devenitMembruLa: dataAzi() })
    .where(eq(membri.id, membruId));
  await scrieAudit(acces.lider.id, "musafir:primit-in-grupa", {
    membruId,
    grupaId: acces.membru.grupaId,
  });

  revalidatePath(`/membri/${membruId}`);
  revalidatePath(`/grupe/${acces.membru.grupaId}`);
}

/** Îl trece înapoi la musafiri (dacă a fost primit din greșeală). */
export async function treceLaMusafiri(membruId: number) {
  const acces = await accesLaMembru(membruId);
  if (!acces) return;

  await db
    .update(membri)
    .set({ status: "musafir", devenitMembruLa: null })
    .where(eq(membri.id, membruId));
  await scrieAudit(acces.lider.id, "membru:trecut-la-musafiri", { membruId });

  revalidatePath(`/membri/${membruId}`);
  revalidatePath(`/grupe/${acces.membru.grupaId}`);
}
