"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { scrieAudit } from "@/lib/audit";
import { ceruteLider } from "@/lib/auth/sesiune";
import { db } from "@/lib/db";
import { lideri, notificari } from "@/lib/db/schema";
import { emailValid } from "@/lib/email";
import { marcheazaToateCitite } from "@/lib/notificari";

export type StareSetari = { eroare?: string; reusit?: boolean };

/**
 * Setările liderului: adresa de email și ce vrea să afle pe ea.
 * Fiecare lider își schimbă doar propriile setări.
 */
export async function salveazaSetari(
  _stare: StareSetari,
  formData: FormData,
): Promise<StareSetari> {
  const lider = await ceruteLider();

  const email = String(formData.get("email") ?? "").trim();
  if (email && !emailValid(email)) {
    return { eroare: "Adresa de email nu pare corectă." };
  }
  if (email.length > 120) return { eroare: "Adresa de email e prea lungă." };

  await db
    .update(lideri)
    .set({
      email: email || null,
      notifZileNastere: formData.get("notifZileNastere") === "da",
      notifSlujiri: formData.get("notifSlujiri") === "da",
      notifPrezenta: formData.get("notifPrezenta") === "da",
      notifRezumat: formData.get("notifRezumat") === "da",
    })
    .where(eq(lideri.id, lider.id));

  await scrieAudit(lider.id, "setari:salvate", { areEmail: Boolean(email) });
  revalidatePath("/setari");
  return { reusit: true };
}

/** Marchează toate notificările ca citite. */
export async function citesteTot() {
  const lider = await ceruteLider();
  await marcheazaToateCitite(lider.id);
  revalidatePath("/setari");
}

/** Șterge o notificare. Fiecare lider umblă doar la ale lui. */
export async function stergeNotificare(notificareId: number) {
  const lider = await ceruteLider();
  await db
    .delete(notificari)
    .where(
      and(eq(notificari.id, notificareId), eq(notificari.liderId, lider.id)),
    );
  revalidatePath("/setari");
}

/** Golește lista de notificări. */
export async function stergeToateNotificarile() {
  const lider = await ceruteLider();
  await db.delete(notificari).where(eq(notificari.liderId, lider.id));
  await scrieAudit(lider.id, "notificari:sterse", {});
  revalidatePath("/setari");
}
