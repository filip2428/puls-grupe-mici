"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { scrieAudit } from "@/lib/audit";
import { ceruteLider } from "@/lib/auth/sesiune";
import {
  programareCuPrezenta,
  salveazaPrezentaSlujire,
  verificaAccesProgramare,
} from "@/lib/interogari/prezenta-slujire";
import { dataAzi } from "@/lib/util/date";

export type StareFoaieSlujire = {
  eroare?: string;
  salvatLa?: number;
  prezenti?: number;
  total?: number;
};

const schema = z.object({
  nota: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
  stari: z.record(z.string(), z.enum(["prezent", "absent", "motivat"])),
});

/** Salvează cine a venit la o slujire. */
export async function salveazaFoaiaSlujirii(
  programareId: number,
  _stare: StareFoaieSlujire,
  formData: FormData,
): Promise<StareFoaieSlujire> {
  const lider = await ceruteLider();

  const programare = await programareCuPrezenta(programareId);
  if (!programare) return { eroare: "Slujirea asta nu mai există." };

  const acces = await verificaAccesProgramare(lider, programare);
  if (!acces.permis) return { eroare: "Nu ai acces la slujirea asta." };

  if (programare.data > dataAzi()) {
    return { eroare: "Slujirea nu a avut loc încă." };
  }

  let stariBrute: unknown;
  try {
    stariBrute = JSON.parse(String(formData.get("stari") ?? "{}"));
  } catch {
    return { eroare: "Nu am putut citi prezența. Reîncarcă pagina." };
  }

  const rezultat = schema.safeParse({
    nota: formData.get("nota"),
    stari: stariBrute,
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  const salvat = await salveazaPrezentaSlujire({
    programareId,
    liderId: lider.id,
    nota: rezultat.data.nota,
    stari: rezultat.data.stari,
  });

  await scrieAudit(
    lider.id,
    salvat.eraNoua ? "prezenta-slujire:creata" : "prezenta-slujire:modificata",
    {
      programareId,
      data: programare.data,
      prezenti: salvat.prezenti,
      total: salvat.total,
      prinInlocuire: acces.prinInlocuire,
    },
  );

  revalidatePath(`/slujiri/programare/${programareId}/prezenta`);
  revalidatePath("/slujiri");
  if (programare.grupaId !== null) {
    revalidatePath(`/grupe/${programare.grupaId}`);
  }
  revalidatePath("/grupe");

  return {
    salvatLa: Date.now(),
    prezenti: salvat.prezenti,
    total: salvat.total,
  };
}
