"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { scrieAudit } from "@/lib/audit";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { db } from "@/lib/db";
import { evenimente } from "@/lib/db/schema";
import { adaugaZile, esteDataValida } from "@/lib/util/date";

export type StareIntalnire = { eroare?: string; reusit?: string };

/** Câte întâlniri poate face o singură apăsare pe „se repetă săptămânal". */
const MAXIM_REPETARI = 60;

const textOptional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const schemaIntalnire = z
  .object({
    data: z
      .string()
      .trim()
      .refine((v) => esteDataValida(v), "Alege o dată validă."),
    titlu: z.string().trim().min(2, "Scrie ce fel de întâlnire e.").max(80),
    ora: textOptional(10),
    locatie: textOptional(80),
    detalii: textOptional(300),
    /*
      Vin butoane radio, nu o bifă: la o bifă nebifată formularul nu trimite
      nimic, iar „nu s-a trimis nimic" arată la fel ca „nu e pe grupe mici".
      Aici alegerea e mereu scrisă, deci nu ghicim.
    */
    peGrupeMici: z
      .string()
      .optional()
      .transform((v) => v === "da"),
    repeta: z
      .string()
      .optional()
      .transform((v) => (v === "saptamanal" ? "saptamanal" : "nu")),
    repetaPanaLa: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine(
    (v) =>
      v.repeta === "nu" ||
      (v.repetaPanaLa !== null &&
        esteDataValida(v.repetaPanaLa) &&
        v.repetaPanaLa >= v.data),
    "Pentru o întâlnire care se repetă, alege până când ține.",
  );

/*
  `FormData.get` dă `null` când câmpul lipsește din formular - așa se întâmplă
  cu o bifă nebifată, care nu trimite nimic. Zod însă citește `null` ca pe o
  valoare greșită, nu ca pe una lipsă, iar formularul s-ar opri cu o eroare
  fără noimă. Îl traducem deci în `undefined`, care înseamnă chiar „lipsește".
*/
function camp(formData: FormData, nume: string) {
  return formData.get(nume) ?? undefined;
}

function dinFormular(formData: FormData) {
  return {
    data: camp(formData, "data"),
    titlu: camp(formData, "titlu"),
    ora: camp(formData, "ora"),
    locatie: camp(formData, "locatie"),
    detalii: camp(formData, "detalii"),
    peGrupeMici: camp(formData, "peGrupeMici"),
    repeta: camp(formData, "repeta"),
    repetaPanaLa: camp(formData, "repetaPanaLa"),
  };
}

/**
 * Datele la care se scrie întâlnirea.
 *
 * „Se repetă săptămânal" nu ține minte nicio regulă: scrie de-a dreptul câte
 * un rând pentru fiecare vineri. Așa, o săptămână în care nu se ține poate fi
 * ștearsă singură, fără să strice restul - iar calendarul nu trebuie să știe
 * despre repetări deloc.
 */
function dateleRepetarii(
  data: string,
  repeta: "nu" | "saptamanal",
  panaLa: string | null,
): string[] {
  if (repeta === "nu" || !panaLa) return [data];

  const zile: string[] = [];
  let zi = data;
  while (zi <= panaLa && zile.length < MAXIM_REPETARI) {
    zile.push(zi);
    zi = adaugaZile(zi, 7);
  }
  return zile;
}

/** Scrie o întâlnire în calendar (sau un șir de întâlniri săptămânale). */
export async function creeazaIntalnire(
  _stare: StareIntalnire,
  formData: FormData,
): Promise<StareIntalnire> {
  const admin = await ceruteAdmin();

  const rezultat = schemaIntalnire.safeParse(dinFormular(formData));
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  const { repeta, repetaPanaLa, ...intalnire } = rezultat.data;
  const zile = dateleRepetarii(intalnire.data, repeta, repetaPanaLa);

  await db.insert(evenimente).values(
    zile.map((data) => ({ ...intalnire, data, creatDeId: admin.id })),
  );
  await scrieAudit(admin.id, "intalnire:creata", {
    titlu: intalnire.titlu,
    data: intalnire.data,
    cate: zile.length,
  });

  revalidatePath("/calendar");
  return {
    reusit:
      zile.length === 1
        ? "Am trecut-o în calendar."
        : `Am trecut ${zile.length} întâlniri în calendar.`,
  };
}

/** Schimbă o întâlnire din calendar. Repetarea nu se aplică la modificare. */
export async function salveazaIntalnire(
  intalnireId: number,
  _stare: StareIntalnire,
  formData: FormData,
): Promise<StareIntalnire> {
  const admin = await ceruteAdmin();

  const rezultat = schemaIntalnire.safeParse(dinFormular(formData));
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  const { repeta: _r, repetaPanaLa: _p, ...intalnire } = rezultat.data;
  await db
    .update(evenimente)
    .set(intalnire)
    .where(eq(evenimente.id, intalnireId));
  await scrieAudit(admin.id, "intalnire:modificata", { intalnireId });

  revalidatePath("/calendar");
  return { reusit: "Salvat." };
}

/** Scoate o întâlnire din calendar. */
export async function stergeIntalnire(intalnireId: number) {
  const admin = await ceruteAdmin();
  await db.delete(evenimente).where(eq(evenimente.id, intalnireId));
  await scrieAudit(admin.id, "intalnire:stearsa", { intalnireId });
  revalidatePath("/calendar");
}
