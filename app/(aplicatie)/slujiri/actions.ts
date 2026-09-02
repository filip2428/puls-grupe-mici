"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { scrieAudit } from "@/lib/audit";
import { ceruteAdmin, ceruteLider } from "@/lib/auth/sesiune";
import { db } from "@/lib/db";
import { echipeSlujire, membri, membriEchipe, programariSlujire } from "@/lib/db/schema";
import { verificaAccesGrupa } from "@/lib/interogari/acces";
import {
  numeConfirmat,
  pierderiEchipa,
  stergeEchipaDefinitiv,
} from "@/lib/interogari/stergere";
import { esteDataValida } from "@/lib/util/date";

export type StareSlujire = { eroare?: string; reusit?: boolean };

const textOptional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/* ---------------------------------------------------------------- echipe */

const schemaEchipa = z.object({
  nume: z.string().trim().min(2, "Numele echipei e prea scurt.").max(60),
  descriere: textOptional(200),
  responsabilId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v) : null))
    .refine((v) => v === null || Number.isInteger(v), "Responsabil invalid."),
});

/** Creează o echipă de slujire (Laudă, Media, Protocol...). */
export async function creeazaEchipa(
  _stare: StareSlujire,
  formData: FormData,
): Promise<StareSlujire> {
  const admin = await ceruteAdmin();

  const rezultat = schemaEchipa.safeParse({
    nume: formData.get("nume"),
    descriere: formData.get("descriere"),
    responsabilId: formData.get("responsabilId"),
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  const [creata] = await db
    .insert(echipeSlujire)
    .values(rezultat.data)
    .returning({ id: echipeSlujire.id });
  await scrieAudit(admin.id, "echipa:creata", {
    echipaId: creata.id,
    nume: rezultat.data.nume,
  });

  revalidatePath("/slujiri");
  return { reusit: true };
}

/** Salvează datele unei echipe. */
export async function salveazaEchipa(
  echipaId: number,
  _stare: StareSlujire,
  formData: FormData,
): Promise<StareSlujire> {
  const admin = await ceruteAdmin();

  const rezultat = schemaEchipa.safeParse({
    nume: formData.get("nume"),
    descriere: formData.get("descriere"),
    responsabilId: formData.get("responsabilId"),
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  await db
    .update(echipeSlujire)
    .set(rezultat.data)
    .where(eq(echipeSlujire.id, echipaId));
  await scrieAudit(admin.id, "echipa:modificata", { echipaId });

  revalidatePath("/slujiri");
  revalidatePath(`/slujiri/${echipaId}`);
  return { reusit: true };
}

/** Arhivează sau reactivează o echipă. */
export async function schimbaActivaEchipa(echipaId: number, activa: boolean) {
  const admin = await ceruteAdmin();
  await db
    .update(echipeSlujire)
    .set({ activa })
    .where(eq(echipeSlujire.id, echipaId));
  await scrieAudit(admin.id, activa ? "echipa:reactivata" : "echipa:arhivata", {
    echipaId,
  });
  revalidatePath("/slujiri");
  revalidatePath(`/slujiri/${echipaId}`);
}

/**
 * Șterge un loc de slujire, cu programările lui din calendar.
 * Pulsiștii rămân neatinși - doar nu mai slujesc acolo.
 */
export async function stergeEchipa(
  echipaId: number,
  _stare: StareSlujire,
  formData: FormData,
): Promise<StareSlujire> {
  const admin = await ceruteAdmin();

  const pierderi = await pierderiEchipa(echipaId);
  if (!pierderi) return { eroare: "Slujirea nu mai există." };

  const scris = String(formData.get("confirmare") ?? "");
  if (!numeConfirmat(scris, pierderi.nume)) {
    return { eroare: `Scrie exact „${pierderi.nume}" ca să confirmi ștergerea.` };
  }

  await stergeEchipaDefinitiv(echipaId);
  await scrieAudit(admin.id, "echipa:stearsa", {
    echipaId,
    nume: pierderi.nume,
    pulsisti: pierderi.pulsisti,
    programari: pierderi.programari,
  });

  revalidatePath("/", "layout");
  redirect("/slujiri");
}

/**
 * Cine poate umbla la componența unei echipe: adminul, responsabilul ei,
 * sau liderul grupei din care face parte pulsistul.
 */
async function poateSchimbaEchipa(echipaId: number, membruId: number) {
  const lider = await ceruteLider();
  if (lider.rol === "admin") return lider;

  const [e] = await db
    .select({ responsabilId: echipeSlujire.responsabilId })
    .from(echipeSlujire)
    .where(eq(echipeSlujire.id, echipaId));
  if (!e) return null;
  if (e.responsabilId === lider.id) return lider;

  const [m] = await db
    .select({ grupaId: membri.grupaId })
    .from(membri)
    .where(eq(membri.id, membruId));
  if (!m) return null;

  const acces = await verificaAccesGrupa(lider, m.grupaId);
  return acces.permis ? lider : null;
}

/** Adaugă un pulsist într-o echipă de slujire. */
export async function adaugaInEchipa(echipaId: number, formData: FormData) {
  const membruId = Number(formData.get("membruId"));
  if (!Number.isInteger(membruId)) return;

  const lider = await poateSchimbaEchipa(echipaId, membruId);
  if (!lider) return;

  const rol = String(formData.get("rol") ?? "").trim();
  await db
    .insert(membriEchipe)
    .values({ echipaId, membruId, rol: rol || null })
    .onConflictDoNothing();
  await scrieAudit(lider.id, "echipa:pulsist-adaugat", { echipaId, membruId });

  revalidatePath(`/slujiri/${echipaId}`);
  revalidatePath(`/membri/${membruId}`);
}

/** Scoate un pulsist dintr-o echipă. */
export async function scoateDinEchipa(echipaId: number, membruId: number) {
  const lider = await poateSchimbaEchipa(echipaId, membruId);
  if (!lider) return;

  await db
    .delete(membriEchipe)
    .where(
      and(eq(membriEchipe.echipaId, echipaId), eq(membriEchipe.membruId, membruId)),
    );
  await scrieAudit(lider.id, "echipa:pulsist-scos", { echipaId, membruId });

  revalidatePath(`/slujiri/${echipaId}`);
  revalidatePath(`/membri/${membruId}`);
}

/**
 * Aceleași două operații, dar pornite de pe fișa pulsistului: acolo alegi
 * din listă unde slujește, nu pe cine adaugi într-o slujire.
 */
export async function adaugaSlujireaMembrului(
  membruId: number,
  formData: FormData,
) {
  const echipaId = Number(formData.get("echipaId"));
  if (!Number.isInteger(echipaId)) return;

  const lider = await poateSchimbaEchipa(echipaId, membruId);
  if (!lider) return;

  const rol = String(formData.get("rol") ?? "").trim();
  await db
    .insert(membriEchipe)
    .values({ echipaId, membruId, rol: rol || null })
    .onConflictDoNothing();
  await scrieAudit(lider.id, "echipa:pulsist-adaugat", { echipaId, membruId });

  revalidatePath(`/slujiri/${echipaId}`);
  revalidatePath(`/membri/${membruId}`);
}

export async function scoateSlujireaMembrului(membruId: number, echipaId: number) {
  await scoateDinEchipa(echipaId, membruId);
}

/* ------------------------------------------------------------ programări */

const schemaProgramare = z
  .object({
    data: z
      .string()
      .trim()
      .refine((v) => esteDataValida(v), "Alege o dată validă."),
    titlu: z.string().trim().min(2, "Scrie ce se slujește.").max(80),
    ora: textOptional(10),
    locatie: textOptional(80),
    detalii: textOptional(300),
    grupaId: z
      .string()
      .optional()
      .transform((v) => (v && v !== "" ? Number(v) : null)),
    echipaId: z
      .string()
      .optional()
      .transform((v) => (v && v !== "" ? Number(v) : null)),
  })
  .refine(
    (v) => v.grupaId !== null || v.echipaId !== null,
    "Alege cine slujește: o grupă mică sau o echipă.",
  );

function dinFormular(formData: FormData) {
  return {
    data: formData.get("data"),
    titlu: formData.get("titlu"),
    ora: formData.get("ora"),
    locatie: formData.get("locatie"),
    detalii: formData.get("detalii"),
    grupaId: formData.get("grupaId"),
    echipaId: formData.get("echipaId"),
  };
}

/** Trece o slujire în calendar. */
export async function creeazaProgramare(
  _stare: StareSlujire,
  formData: FormData,
): Promise<StareSlujire> {
  const admin = await ceruteAdmin();

  const rezultat = schemaProgramare.safeParse(dinFormular(formData));
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  const [creata] = await db
    .insert(programariSlujire)
    .values({ ...rezultat.data, creatDeId: admin.id })
    .returning({ id: programariSlujire.id });
  await scrieAudit(admin.id, "programare:creata", {
    programareId: creata.id,
    data: rezultat.data.data,
  });

  revalidatePath("/slujiri");
  revalidatePath("/grupe");
  return { reusit: true };
}

/** Schimbă o programare din calendar. */
export async function salveazaProgramare(
  programareId: number,
  _stare: StareSlujire,
  formData: FormData,
): Promise<StareSlujire> {
  const admin = await ceruteAdmin();

  const rezultat = schemaProgramare.safeParse(dinFormular(formData));
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  await db
    .update(programariSlujire)
    .set(rezultat.data)
    .where(eq(programariSlujire.id, programareId));
  await scrieAudit(admin.id, "programare:modificata", { programareId });

  revalidatePath("/slujiri");
  return { reusit: true };
}

/** Scoate o slujire din calendar. */
export async function stergeProgramare(programareId: number) {
  const admin = await ceruteAdmin();
  await db
    .delete(programariSlujire)
    .where(eq(programariSlujire.id, programareId));
  await scrieAudit(admin.id, "programare:stearsa", { programareId });
  revalidatePath("/slujiri");
  revalidatePath("/grupe");
}
