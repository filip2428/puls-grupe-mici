"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { scrieAudit } from "@/lib/audit";
import { ceruteLider } from "@/lib/auth/sesiune";
import { luneaDin } from "@/lib/citire";
import { verificaAccesGrupa } from "@/lib/interogari/acces";
import { salveazaCitireSaptamana } from "@/lib/interogari/citire";
import { dataAzi, esteDataValida } from "@/lib/util/date";

export type StareFoaieCitire = { eroare?: string; salvatLa?: number };

const schemaBife = z.record(
  z.string().regex(/^\d+$/),
  z.array(z.string().refine(esteDataValida)).max(7),
);

/** Salvează bifele de citit ale unei grupe pe o săptămână. */
export async function salveazaCitirea(
  grupaId: number,
  luni: string,
  _stare: StareFoaieCitire,
  formData: FormData,
): Promise<StareFoaieCitire> {
  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis) return { eroare: "Nu ai acces la grupa asta." };

  if (!esteDataValida(luni) || luneaDin(luni) !== luni) {
    return { eroare: "Săptămâna nu e validă. Reîncarcă pagina." };
  }
  if (luni > dataAzi()) {
    return { eroare: "Săptămâna asta n-a început încă." };
  }

  let brut: unknown;
  try {
    brut = JSON.parse(String(formData.get("bife") ?? "{}"));
  } catch {
    return { eroare: "Nu am putut citi bifele. Reîncarcă pagina." };
  }
  const bife = schemaBife.safeParse(brut);
  if (!bife.success) return { eroare: "Bifele nu sunt valide. Reîncarcă pagina." };

  const salvat = await salveazaCitireSaptamana({
    grupaId,
    luni,
    liderId: lider.id,
    bife: bife.data,
  });

  await scrieAudit(lider.id, "citire:saptamana", {
    grupaId,
    saptamana: luni,
    bife: salvat.bife,
    pulsisti: salvat.pulsisti,
    prinInlocuire: acces.prinInlocuire,
  });

  revalidatePath(`/grupe/${grupaId}`, "layout");
  revalidatePath("/statistici");
  return { salvatLa: Date.now() };
}
