"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { scrieAudit } from "@/lib/audit";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { db } from "@/lib/db";
import { grupe, membri } from "@/lib/db/schema";
import {
  analizeazaFisier,
  type RezultatAnaliza,
} from "@/lib/import-pulsisti";
import { dataAzi, esteDataValida } from "@/lib/util/date";

/** Mărimea maximă acceptată - un fișier de pulsiști nu are cum să fie mai mare. */
const MARIME_MAXIMA = 2 * 1024 * 1024;

export type StareAnaliza = RezultatAnaliza & { gata?: boolean };

const gol: StareAnaliza = { deImportat: [], existenti: [], probleme: [] };

/**
 * Prima etapă: citim fișierul și spunem ce urmează să intre.
 * Nu se scrie nimic în baza de date.
 */
export async function analizeaza(
  _stare: StareAnaliza,
  formData: FormData,
): Promise<StareAnaliza> {
  await ceruteAdmin();

  const fisier = formData.get("fisier");
  if (!(fisier instanceof File) || fisier.size === 0) {
    return { ...gol, eroare: "Alege un fișier .xlsx." };
  }
  if (fisier.size > MARIME_MAXIMA) {
    return { ...gol, eroare: "Fișierul e prea mare (peste 2 MB)." };
  }

  const [toateGrupele, toti] = await Promise.all([
    db.select({ id: grupe.id, nume: grupe.nume }).from(grupe),
    db.select({ grupaId: membri.grupaId, nume: membri.nume }).from(membri),
  ]);

  const existente = new Set(
    toti.map((m) => `${m.grupaId}|${normalizeaza(m.nume)}`),
  );

  const rezultat = await analizeazaFisier(
    await fisier.arrayBuffer(),
    toateGrupele,
    existente,
  );
  return { ...rezultat, gata: true };
}

const schemaRand = z.object({
  rand: z.number(),
  nume: z.string().trim().min(2).max(80),
  grupaId: z.number().int(),
  grupaNume: z.string(),
  status: z.enum(["membru", "musafir"]),
  sex: z.enum(["baiat", "fata"]).nullable(),
  clasa: z.number().int().min(1).max(13).nullable(),
  dataNasterii: z
    .string()
    .nullable()
    .refine((v) => v === null || esteDataValida(v), "Dată invalidă."),
  telefon: z.string().max(30).nullable(),
  parinte1Nume: z.string().max(80).nullable(),
  parinte1Telefon: z.string().max(30).nullable(),
  parinte2Nume: z.string().max(80).nullable(),
  parinte2Telefon: z.string().max(30).nullable(),
});

export type StareImport = { eroare?: string; adaugati?: number };

/** A doua etapă: scriem în baza de date rândurile confirmate. */
export async function importa(
  _stare: StareImport,
  formData: FormData,
): Promise<StareImport> {
  const admin = await ceruteAdmin();

  let brut: unknown;
  try {
    brut = JSON.parse(String(formData.get("date") ?? "[]"));
  } catch {
    return { eroare: "Datele importului s-au pierdut. Încarcă fișierul din nou." };
  }

  const verificat = z.array(schemaRand).max(2000).safeParse(brut);
  if (!verificat.success || verificat.data.length === 0) {
    return { eroare: "N-am ce importa. Încarcă fișierul din nou." };
  }
  const randuri = verificat.data;

  // Grupele trebuie să existe și acum - fișierul putea sta deschis o vreme.
  const grupeExistente = await db
    .select({ id: grupe.id })
    .from(grupe)
    .where(inArray(grupe.id, [...new Set(randuri.map((r) => r.grupaId))]));
  const idValide = new Set(grupeExistente.map((g) => g.id));

  const deScris = randuri.filter((r) => idValide.has(r.grupaId));
  if (deScris.length === 0) {
    return { eroare: "Grupele din fișier nu mai există. Încarcă fișierul din nou." };
  }

  const azi = dataAzi();
  await db.insert(membri).values(
    deScris.map((r) => ({
      grupaId: r.grupaId,
      nume: r.nume,
      telefon: r.telefon,
      dataNasterii: r.dataNasterii,
      sex: r.sex,
      clasa: r.clasa,
      status: r.status,
      devenitMembruLa: r.status === "membru" ? azi : null,
      parinte1Nume: r.parinte1Nume,
      parinte1Telefon: r.parinte1Telefon,
      parinte2Nume: r.parinte2Nume,
      parinte2Telefon: r.parinte2Telefon,
    })),
  );

  await scrieAudit(admin.id, "pulsisti:importati", {
    cati: deScris.length,
    grupe: [...idValide],
  });

  revalidatePath("/pulsisti");
  for (const id of idValide) revalidatePath(`/grupe/${id}`);

  return { adaugati: deScris.length };
}

function normalizeaza(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
