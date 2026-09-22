"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { scrieAudit } from "@/lib/audit";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { analizeazaPlan, type AnalizaPlan } from "@/lib/import-plan-citire";
import { inlocuiestePlanul, stergePlanul } from "@/lib/interogari/citire";
import { esteDataValida } from "@/lib/util/date";

const MARIME_MAXIMA = 2 * 1024 * 1024;

export type StareAnalizaPlan = AnalizaPlan & { gata?: boolean };

const gol: StareAnalizaPlan = { zile: [], probleme: [] };

/** Prima etapă: citim fișierul și arătăm ce am înțeles. Nu se scrie nimic. */
export async function analizeazaFisierPlan(
  _stare: StareAnalizaPlan,
  formData: FormData,
): Promise<StareAnalizaPlan> {
  await ceruteAdmin();

  const fisier = formData.get("fisier");
  if (!(fisier instanceof File) || fisier.size === 0) {
    return { ...gol, eroare: "Alege un fișier .xlsx." };
  }
  if (fisier.size > MARIME_MAXIMA) {
    return { ...gol, eroare: "Fișierul e prea mare (peste 2 MB)." };
  }

  const incepe = String(formData.get("incepeLa") ?? "").trim();
  const rezultat = await analizeazaPlan(
    await fisier.arrayBuffer(),
    esteDataValida(incepe) ? incepe : null,
  );
  return { ...rezultat, gata: true };
}

const schemaZi = z.object({
  data: z.string().refine(esteDataValida, "Dată invalidă."),
  portiune: z.string().trim().min(1).max(200),
  carte: z.string().trim().min(1).max(60),
});

export type StarePlan = { eroare?: string; zile?: number };

/** A doua etapă: planul confirmat ia locul celui vechi. */
export async function salveazaPlanul(
  _stare: StarePlan,
  formData: FormData,
): Promise<StarePlan> {
  const admin = await ceruteAdmin();

  let brut: unknown;
  try {
    brut = JSON.parse(String(formData.get("zile") ?? "[]"));
  } catch {
    return { eroare: "Planul s-a pierdut. Încarcă fișierul din nou." };
  }

  const verificat = z.array(schemaZi).min(1).max(2000).safeParse(brut);
  if (!verificat.success) {
    return { eroare: "N-am ce salva. Încarcă fișierul din nou." };
  }
  const zile = verificat.data;
  if (new Set(zile.map((z) => z.data)).size !== zile.length) {
    return { eroare: "Planul are aceeași zi de două ori. Încarcă fișierul din nou." };
  }

  await inlocuiestePlanul(zile);
  await scrieAudit(admin.id, "citire:plan_incarcat", {
    zile: zile.length,
    deLa: zile[0].data,
    panaLa: zile[zile.length - 1].data,
  });

  revalidatePath("/", "layout");
  return { zile: zile.length };
}

/** Scoate planul. Bifele rămân, ca să nu se piardă nimic la o greșeală. */
export async function scoatePlanul() {
  const admin = await ceruteAdmin();
  await stergePlanul();
  await scrieAudit(admin.id, "citire:plan_sters");
  revalidatePath("/", "layout");
}
