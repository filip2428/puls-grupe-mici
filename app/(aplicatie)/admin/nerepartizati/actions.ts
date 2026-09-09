"use server";

import { and, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { scrieAudit } from "@/lib/audit";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { db } from "@/lib/db";
import { grupe, membri } from "@/lib/db/schema";

export type StareRepartizare = { eroare?: string; repartizati?: number };

/**
 * Pune într-o grupă toți pulsiștii bifați.
 *
 * Repartizarea se face pe blocuri, nu om cu om: la începutul anului vin
 * cincizeci de înscrieri deodată, iar hotărârea se ia oricum pe clase („toți
 * băieții de a VI-a la grupa lui Filip"), nu individual.
 */
export async function repartizeaza(
  _stare: StareRepartizare,
  formData: FormData,
): Promise<StareRepartizare> {
  const admin = await ceruteAdmin();

  const grupaId = Number(formData.get("grupaId"));
  if (!Number.isInteger(grupaId) || grupaId <= 0) {
    return { eroare: "Alege întâi grupa." };
  }

  const ids = formData
    .getAll("pulsist")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) {
    return { eroare: "N-ai bifat pe nimeni." };
  }

  const [grupa] = await db
    .select({ id: grupe.id, nume: grupe.nume })
    .from(grupe)
    .where(inArray(grupe.id, [grupaId]));
  if (!grupa) return { eroare: "Grupa aleasă nu mai există." };

  /*
    Scriem numai peste cei care chiar sunt nerepartizați. Pagina putea sta
    deschisă într-un telefon de dimineață, iar între timp altcineva să le fi
    dat deja grupă - n-ar fi frumos să i-o schimbăm pe la spate.
  */
  const deMutat = await db
    .select({ id: membri.id })
    .from(membri)
    .where(and(inArray(membri.id, ids), isNull(membri.grupaId)));
  const gasiti = deMutat.map((m) => m.id);
  if (gasiti.length === 0) return { eroare: "Nu mai e nimeni de repartizat." };

  await db
    .update(membri)
    .set({ grupaId: grupa.id })
    .where(inArray(membri.id, gasiti));
  await scrieAudit(admin.id, "pulsisti:repartizati", {
    cati: gasiti.length,
    grupaId: grupa.id,
  });

  revalidatePath("/admin/nerepartizati");
  revalidatePath("/admin");
  revalidatePath("/pulsisti");
  revalidatePath(`/grupe/${grupa.id}`);
  revalidatePath(`/admin/grupe/${grupa.id}`);
  for (const id of gasiti) revalidatePath(`/membri/${id}`);

  return { repartizati: gasiti.length };
}
