"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { inchideAnul } from "@/lib/arhiva";
import { scrieAudit } from "@/lib/audit";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { trimiteCopiaPeEmail } from "@/lib/copie";
import { numeConfirmat } from "@/lib/interogari/stergere";
import { esteDataValida } from "@/lib/util/date";

export type StareInchidere = { eroare?: string };

/** Închide anul bisericesc: fotografia lui, apoi trecerea în anul nou. */
export async function inchide(
  _stare: StareInchidere,
  formData: FormData,
): Promise<StareInchidere> {
  const admin = await ceruteAdmin();

  const deLa = String(formData.get("deLa") ?? "");
  const panaLa = String(formData.get("panaLa") ?? "");
  if (!esteDataValida(deLa) || !esteDataValida(panaLa) || deLa > panaLa) {
    return { eroare: "Perioada anului nu e validă." };
  }
  const nume = `${deLa.slice(0, 4)}-${panaLa.slice(0, 4)}`;
  if (!numeConfirmat(String(formData.get("confirmare") ?? ""), nume)) {
    return { eroare: `Scrie „${nume}”, exact așa, ca să confirmi.` };
  }

  const iesiti = formData
    .getAll("iesiti")
    .map(Number)
    .filter((n) => Number.isInteger(n));

  // Înainte de schimbări, o copie a bazei pleacă pe email (dacă se poate).
  await trimiteCopiaPeEmail("înainte de închiderea anului", admin.id);

  const optiuni = {
    nume,
    deLa,
    panaLa,
    urcaClasa: formData.get("urcaClasa") === "da",
    iesiti,
    reformeazaGrupele: formData.get("reformeaza") === "da",
    inchidePlanul: formData.get("inchidePlanul") === "da",
  };
  const id = await inchideAnul(optiuni, admin.id);

  await scrieAudit(admin.id, "an:inchis", {
    an: nume,
    urcaClasa: optiuni.urcaClasa,
    iesiti: iesiti.length,
    reformeazaGrupele: optiuni.reformeazaGrupele,
    inchidePlanul: optiuni.inchidePlanul,
  });

  revalidatePath("/", "layout");
  redirect(`/admin/an/${id}`);
}
