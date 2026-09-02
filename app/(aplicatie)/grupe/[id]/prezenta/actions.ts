"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { verificaAccesGrupa } from "@/lib/interogari/acces";
import { salveazaPrezenta } from "@/lib/interogari/prezenta";
import { dataAzi, esteDataValida } from "@/lib/util/date";

export type StarePrezentaFormular = {
  eroare?: string;
  salvatLa?: number;
  prezenti?: number;
  total?: number;
};

const schema = z.object({
  data: z.string().refine(esteDataValida, "Data nu e validă."),
  subiect: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : null)),
  nota: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
  numarInvitati: z.coerce.number().int().min(0).max(200).default(0),
  stari: z.record(
    z.string(),
    z.enum(["prezent", "absent", "motivat"]),
  ),
});

/** Salvează foaia de prezență a unei grupe pentru o zi. */
export async function salveazaFoaia(
  grupaId: number,
  _stare: StarePrezentaFormular,
  formData: FormData,
): Promise<StarePrezentaFormular> {
  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis) return { eroare: "Nu ai acces la grupa asta." };

  let stariBrute: unknown;
  try {
    stariBrute = JSON.parse(String(formData.get("stari") ?? "{}"));
  } catch {
    return { eroare: "Nu am putut citi prezența. Reîncarcă pagina." };
  }

  const rezultat = schema.safeParse({
    data: formData.get("data"),
    subiect: formData.get("subiect"),
    nota: formData.get("nota"),
    numarInvitati: formData.get("numarInvitati") || 0,
    stari: stariBrute,
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  if (rezultat.data.data > dataAzi()) {
    return { eroare: "Nu poți face prezența pentru o zi din viitor." };
  }

  const salvat = await salveazaPrezenta({
    grupaId,
    data: rezultat.data.data,
    liderId: lider.id,
    prinInlocuire: acces.prinInlocuire,
    subiect: rezultat.data.subiect,
    nota: rezultat.data.nota,
    numarInvitati: rezultat.data.numarInvitati,
    stari: rezultat.data.stari,
  });

  await scrieAudit(lider.id, salvat.eraNoua ? "prezenta:creata" : "prezenta:modificata", {
    grupaId,
    data: rezultat.data.data,
    prezenti: salvat.prezenti,
    total: salvat.total,
    prinInlocuire: acces.prinInlocuire,
  });

  revalidatePath(`/grupe/${grupaId}`);
  revalidatePath("/grupe");
  revalidatePath("/admin");

  return {
    salvatLa: Date.now(),
    prezenti: salvat.prezenti,
    total: salvat.total,
  };
}
