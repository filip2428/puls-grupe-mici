"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ceruteAdmin } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { grupe, lideri, lideriGrupe, membri } from "@/lib/db/schema";
import { creeazaLiderCuCod, regenereazaCodLider } from "@/lib/interogari/lideri";

export type StareAdmin = {
  eroare?: string;
  reusit?: boolean;
  /** Codul de acces, arătat o singură dată după creare/regenerare. */
  cod?: string;
  numePersoana?: string;
};

const schemaLider = z.object({
  nume: z.string().trim().min(2, "Numele e prea scurt.").max(80),
  telefon: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : null)),
  rol: z.enum(["lider", "admin"]).default("lider"),
});

/** Creează un lider nou și arată codul lui de acces. */
export async function creeazaLider(
  _stare: StareAdmin,
  formData: FormData,
): Promise<StareAdmin> {
  const admin = await ceruteAdmin();

  const rezultat = schemaLider.safeParse({
    nume: formData.get("nume"),
    telefon: formData.get("telefon"),
    rol: formData.get("rol") ?? "lider",
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  const creat = await creeazaLiderCuCod(rezultat.data);
  await scrieAudit(admin.id, "lider:creat", {
    liderId: creat.id,
    nume: rezultat.data.nume,
    rol: rezultat.data.rol,
  });

  revalidatePath("/admin/lideri");
  return { reusit: true, cod: creat.cod, numePersoana: rezultat.data.nume };
}

/** Generează un cod nou pentru un lider care și-a pierdut codul. */
export async function codNou(
  liderId: number,
  _stare: StareAdmin,
): Promise<StareAdmin> {
  const admin = await ceruteAdmin();
  const rezultat = await regenereazaCodLider(liderId);
  if (!rezultat) return { eroare: "Liderul nu mai există." };

  await scrieAudit(admin.id, "lider:cod-nou", { liderId });
  revalidatePath("/admin/lideri");
  return { reusit: true, cod: rezultat.cod, numePersoana: rezultat.nume };
}

/** Activează sau dezactivează un lider (dezactivat = nu mai poate intra). */
export async function schimbaActivLider(liderId: number, activ: boolean) {
  const admin = await ceruteAdmin();
  if (liderId === admin.id) return; // nu se poate dezactiva singur

  // Un lider dezactivat nu mai poate intra: sesiunile lui sunt respinse
  // la prima verificare (vezi sesiuneCurenta).
  await db.update(lideri).set({ activ }).where(eq(lideri.id, liderId));
  await scrieAudit(admin.id, activ ? "lider:activat" : "lider:dezactivat", {
    liderId,
  });
  revalidatePath("/admin/lideri");
}

/** Schimbă rolul unui lider (lider / administrator). */
export async function schimbaRol(liderId: number, rol: "lider" | "admin") {
  const admin = await ceruteAdmin();
  if (liderId === admin.id) return;

  await db.update(lideri).set({ rol }).where(eq(lideri.id, liderId));
  await scrieAudit(admin.id, "lider:rol", { liderId, rol });
  revalidatePath("/admin/lideri");
}

/** Repartizează un lider la o grupă. */
export async function repartizeazaLider(grupaId: number, liderId: number) {
  const admin = await ceruteAdmin();
  await db
    .insert(lideriGrupe)
    .values({ grupaId, liderId })
    .onConflictDoNothing();
  await scrieAudit(admin.id, "grupa:lider-adaugat", { grupaId, liderId });
  revalidatePath(`/admin/grupe/${grupaId}`);
  revalidatePath("/admin/lideri");
}

/** Scoate un lider dintr-o grupă. */
export async function scoateLider(grupaId: number, liderId: number) {
  const admin = await ceruteAdmin();
  await db
    .delete(lideriGrupe)
    .where(
      and(eq(lideriGrupe.grupaId, grupaId), eq(lideriGrupe.liderId, liderId)),
    );
  await scrieAudit(admin.id, "grupa:lider-scos", { grupaId, liderId });
  revalidatePath(`/admin/grupe/${grupaId}`);
  revalidatePath("/admin/lideri");
}

/** Varianta de formular: liderul ales dintr-o listă. */
export async function repartizeazaLiderDinFormular(
  grupaId: number,
  formData: FormData,
) {
  const liderId = Number(formData.get("liderId"));
  if (!Number.isInteger(liderId)) return;
  await repartizeazaLider(grupaId, liderId);
}

/** Varianta de formular: grupa aleasă dintr-o listă. */
export async function mutaMembruDinFormular(
  membruId: number,
  formData: FormData,
) {
  const grupaId = Number(formData.get("grupaId"));
  if (!Number.isInteger(grupaId)) return;
  await mutaMembru(membruId, grupaId);
}

const schemaGrupa = z.object({
  nume: z.string().trim().min(2, "Numele grupei e prea scurt.").max(80),
  ziIntalnire: z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : Number(v)))
    .refine((v) => v === null || (v >= 0 && v <= 6), "Zi invalidă."),
  oraIntalnire: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((v) => (v ? v : null)),
  locatie: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v : null)),
});

/** Creează o grupă mică. */
export async function creeazaGrupa(
  _stare: StareAdmin,
  formData: FormData,
): Promise<StareAdmin> {
  const admin = await ceruteAdmin();

  const rezultat = schemaGrupa.safeParse({
    nume: formData.get("nume"),
    ziIntalnire: formData.get("ziIntalnire"),
    oraIntalnire: formData.get("oraIntalnire"),
    locatie: formData.get("locatie"),
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  const [creata] = await db
    .insert(grupe)
    .values(rezultat.data)
    .returning({ id: grupe.id });
  await scrieAudit(admin.id, "grupa:creata", {
    grupaId: creata.id,
    nume: rezultat.data.nume,
  });

  revalidatePath("/admin/grupe");
  return { reusit: true };
}

/** Salvează datele unei grupe. */
export async function salveazaGrupa(
  grupaId: number,
  _stare: StareAdmin,
  formData: FormData,
): Promise<StareAdmin> {
  const admin = await ceruteAdmin();

  const rezultat = schemaGrupa.safeParse({
    nume: formData.get("nume"),
    ziIntalnire: formData.get("ziIntalnire"),
    oraIntalnire: formData.get("oraIntalnire"),
    locatie: formData.get("locatie"),
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  await db.update(grupe).set(rezultat.data).where(eq(grupe.id, grupaId));
  await scrieAudit(admin.id, "grupa:modificata", { grupaId });

  revalidatePath(`/admin/grupe/${grupaId}`);
  revalidatePath("/admin/grupe");
  return { reusit: true };
}

/** Arhivează sau reactivează o grupă. */
export async function schimbaActivaGrupa(grupaId: number, activa: boolean) {
  const admin = await ceruteAdmin();
  await db.update(grupe).set({ activa }).where(eq(grupe.id, grupaId));
  await scrieAudit(admin.id, activa ? "grupa:reactivata" : "grupa:arhivata", {
    grupaId,
  });
  revalidatePath("/admin/grupe");
  revalidatePath(`/admin/grupe/${grupaId}`);
}

/** Mută un adolescent în altă grupă (istoricul rămâne la el). */
export async function mutaMembru(membruId: number, grupaNouaId: number) {
  const admin = await ceruteAdmin();
  const [m] = await db.select().from(membri).where(eq(membri.id, membruId));
  if (!m) return;

  await db
    .update(membri)
    .set({ grupaId: grupaNouaId })
    .where(eq(membri.id, membruId));
  await scrieAudit(admin.id, "membru:mutat", {
    membruId,
    dinGrupa: m.grupaId,
    inGrupa: grupaNouaId,
  });

  revalidatePath(`/admin/grupe/${m.grupaId}`);
  revalidatePath(`/admin/grupe/${grupaNouaId}`);
  revalidatePath(`/membri/${membruId}`);
}
