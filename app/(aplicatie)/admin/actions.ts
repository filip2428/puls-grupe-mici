"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ceruteAdmin } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { audit, grupe, lideri, lideriGrupe, membri } from "@/lib/db/schema";
import { emailConfigurat } from "@/lib/email";
import {
  genereazaNotificari,
  trimiteNotificariNetrimise,
} from "@/lib/notificari";
import { creeazaLiderCuCod, regenereazaCodLider } from "@/lib/interogari/lideri";
import {
  numeConfirmat,
  pierderiGrupa,
  pierderiLider,
  stergeGrupaDefinitiv,
  stergeLiderDefinitiv,
} from "@/lib/interogari/stergere";

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

/**
 * Șterge definitiv un lider.
 *
 * E ireversibil, deci cerem numele scris de mână. Prezențele pe care le-a
 * completat rămân în istoric, doar că nu mai au un nume lângă ele.
 * Pentru cine doar nu mai slujește există „Dezactivează".
 */
export async function stergeLider(
  liderId: number,
  _stare: StareAdmin,
  formData: FormData,
): Promise<StareAdmin> {
  const admin = await ceruteAdmin();
  if (liderId === admin.id) {
    return { eroare: "Nu te poți șterge pe tine." };
  }

  const pierderi = await pierderiLider(liderId);
  if (!pierderi) return { eroare: "Liderul nu mai există." };

  const scris = String(formData.get("confirmare") ?? "");
  if (!numeConfirmat(scris, pierderi.nume)) {
    return { eroare: `Scrie exact „${pierderi.nume}" ca să confirmi ștergerea.` };
  }

  await stergeLiderDefinitiv(liderId);
  await scrieAudit(admin.id, "lider:sters", {
    liderId,
    nume: pierderi.nume,
    grupe: pierderi.grupe,
    intalniriCompletate: pierderi.intalniriCompletate,
  });

  // La fel ca la adolescenți: atinge prea multe pagini ca să le numărăm.
  revalidatePath("/", "layout");
  return { reusit: true, numePersoana: pierderi.nume };
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

export type StareNotificari = {
  eroare?: string;
  mesaj?: string;
};

/**
 * Rulează acum generarea și trimiterea notificărilor, fără să aștepți
 * rularea automată de dimineață. Util ca să vezi imediat dacă merge.
 */
export async function ruleazaNotificari(): Promise<StareNotificari> {
  const admin = await ceruteAdmin();

  const generate = await genereazaNotificari();
  const trimise = await trimiteNotificariNetrimise();
  await scrieAudit(admin.id, "notificari:rulate", { generate, trimise });

  const bucati = [
    `${generate.total} ${generate.total === 1 ? "notificare nouă" : "notificări noi"}`,
    trimise.trimise > 0 ? `${trimise.trimise} trimise pe email` : "",
    trimise.inAsteptare > 0 ? `${trimise.inAsteptare} în așteptare` : "",
    trimise.esuate > 0 ? `${trimise.esuate} n-au putut fi trimise` : "",
  ].filter(Boolean);

  revalidatePath("/setari");
  revalidatePath("/admin");

  const explicatie = !emailConfigurat()
    ? " Trimiterea pe email nu e configurată încă (lipsesc RESEND_API_KEY și EMAIL_EXPEDITOR), dar notificările se văd în aplicație și pleacă singure după ce o configurezi."
    : trimise.inAsteptare > 0
      ? " Cele în așteptare sunt ale liderilor care nu și-au pus adresa de email."
      : "";

  return { mesaj: `${bucati.join(", ")}.${explicatie}` };
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

/**
 * Șterge definitiv o grupă.
 *
 * E cea mai grea ștergere din aplicație: pleacă și adolescenții din ea, cu tot
 * istoricul lor. Dacă vrei să păstrezi oamenii, mută-i întâi în altă grupă -
 * iar dacă grupa doar nu se mai ține, „Arhivează" e alegerea potrivită.
 * Liderii rămân în aplicație, doar nu mai sunt repartizați aici.
 */
export async function stergeGrupa(
  grupaId: number,
  _stare: StareAdmin,
  formData: FormData,
): Promise<StareAdmin> {
  const admin = await ceruteAdmin();

  const pierderi = await pierderiGrupa(grupaId);
  if (!pierderi) return { eroare: "Grupa nu mai există." };

  const scris = String(formData.get("confirmare") ?? "");
  if (!numeConfirmat(scris, pierderi.nume)) {
    return { eroare: `Scrie exact „${pierderi.nume}" ca să confirmi ștergerea.` };
  }

  await stergeGrupaDefinitiv(grupaId);
  await scrieAudit(admin.id, "grupa:stearsa", {
    grupaId,
    nume: pierderi.nume,
    adolescenti: pierderi.adolescenti,
    intalniri: pierderi.intalniri,
    prezente: pierderi.prezente,
  });

  revalidatePath("/", "layout");
  redirect("/admin/grupe");
}

/**
 * Golește jurnalul.
 *
 * Jurnalul e singura urmă a cine ce a schimbat, inclusiv a ștergerilor, deci
 * nu e ceva de făcut din obișnuință. Golirea însăși rămâne scrisă în el.
 */
export async function golesteJurnalul(
  _stare: StareAdmin,
  formData: FormData,
): Promise<StareAdmin> {
  const admin = await ceruteAdmin();

  if (!numeConfirmat(String(formData.get("confirmare") ?? ""), "golește")) {
    return { eroare: "Scrie cuvântul golește, exact așa, ca să confirmi." };
  }

  const [rand] = await db.select({ c: count() }).from(audit);
  await db.delete(audit);
  await scrieAudit(admin.id, "jurnal:golit", { intrari: Number(rand?.c ?? 0) });

  revalidatePath("/admin/jurnal");
  return { reusit: true };
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
