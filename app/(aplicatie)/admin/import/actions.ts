"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { scrieAudit } from "@/lib/audit";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { db } from "@/lib/db";
import { grupe, membri } from "@/lib/db/schema";
import { gasesteSauCreeaza } from "@/lib/interogari/biserici";
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
    db
      .select({ nume: membri.nume, grupaNume: grupe.nume })
      .from(membri)
      .leftJoin(grupe, eq(grupe.id, membri.grupaId)),
  ]);

  const rezultat = await analizeazaFisier(
    await fisier.arrayBuffer(),
    toateGrupele,
    toti,
  );
  return { ...rezultat, gata: true };
}

const schemaRand = z.object({
  rand: z.number(),
  nume: z.string().trim().min(2).max(80),
  grupaId: z.number().int().nullable(),
  grupaNume: z.string().nullable(),
  status: z.enum(["membru", "musafir"]),
  sex: z.enum(["baiat", "fata"]).nullable(),
  clasa: z.number().int().min(1).max(13).nullable(),
  dataNasterii: z
    .string()
    .nullable()
    .refine((v) => v === null || esteDataValida(v), "Dată invalidă."),
  biserica: z.enum(["harvest", "alta", "fara"]).nullable(),
  bisericaNume: z.string().max(80).nullable(),
  botez: z.enum(["botezat", "nebotezat"]).nullable(),
  botezatLa: z
    .string()
    .nullable()
    .refine((v) => v === null || esteDataValida(v), "Dată invalidă."),
  telefon: z.string().max(30).nullable(),
  email: z.string().max(120).nullable(),
  parinte1Nume: z.string().max(80).nullable(),
  parinte1Telefon: z.string().max(30).nullable(),
  parinte1Email: z.string().max(120).nullable(),
  parinte2Nume: z.string().max(80).nullable(),
  parinte2Telefon: z.string().max(30).nullable(),
  parinte2Email: z.string().max(120).nullable(),
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

  /*
    Grupele trebuie să existe și acum - fișierul putea sta deschis o vreme, iar
    între timp cineva putea șterge o grupă. Rândurile fără grupă trec oricum.
  */
  const cerute = [...new Set(randuri.map((r) => r.grupaId).filter((g) => g !== null))];
  const grupeExistente = cerute.length
    ? await db.select({ id: grupe.id }).from(grupe).where(inArray(grupe.id, cerute))
    : [];
  const idValide = new Set(grupeExistente.map((g) => g.id));

  const deScris = randuri.filter(
    (r) => r.grupaId === null || idValide.has(r.grupaId),
  );
  if (deScris.length === 0) {
    return { eroare: "Grupele din fișier nu mai există. Încarcă fișierul din nou." };
  }

  /*
    Bisericile scrise în fișier devin rânduri în tabelul de biserici. Le
    rezolvăm o dată pe nume distinct, nu o dată pe rând: un fișier cu o sută
    de pulsiști are, de obicei, patru-cinci biserici.
  */
  const idBiserici = new Map<string, number | null>();
  for (const nume of new Set(deScris.map((r) => r.bisericaNume).filter(Boolean))) {
    idBiserici.set(nume!, await gasesteSauCreeaza(nume!));
  }

  const azi = dataAzi();
  await db.insert(membri).values(
    deScris.map((r) => ({
      grupaId: r.grupaId,
      nume: r.nume,
      telefon: r.telefon,
      email: r.email,
      dataNasterii: r.dataNasterii,
      sex: r.sex,
      clasa: r.clasa,
      status: r.status,
      devenitMembruLa: r.status === "membru" ? azi : null,
      biserica: r.biserica,
      bisericaId: r.bisericaNume ? (idBiserici.get(r.bisericaNume) ?? null) : null,
      botez: r.botez,
      botezatLa: r.botezatLa,
      parinte1Nume: r.parinte1Nume,
      parinte1Telefon: r.parinte1Telefon,
      parinte1Email: r.parinte1Email,
      parinte2Nume: r.parinte2Nume,
      parinte2Telefon: r.parinte2Telefon,
      parinte2Email: r.parinte2Email,
    })),
  );

  await scrieAudit(admin.id, "pulsisti:importati", {
    cati: deScris.length,
    grupe: [...idValide],
  });

  revalidatePath("/pulsisti");
  revalidatePath("/admin/nerepartizati");
  for (const id of idValide) revalidatePath(`/grupe/${id}`);

  return { adaugati: deScris.length };
}
