"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { membri } from "@/lib/db/schema";
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

export type StareMusafir = {
  eroare?: string;
  /** Musafirul creat, ca să apară imediat pe foaie, fără reîncărcare. */
  musafir?: { id: number; nume: string };
};

/**
 * Adaugă un musafir (cineva venit în vizită) la o grupă.
 *
 * Musafirul NU devine membru al grupei: apare separat pe foaia de prezență,
 * nu intră în statistici și nu declanșează alerte de absență. Când grupa
 * hotărăște că e parte din ea, se apasă „Primește în grupă".
 */
export async function adaugaMusafir(
  grupaId: number,
  _stare: StareMusafir,
  formData: FormData,
): Promise<StareMusafir> {
  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis) return { eroare: "Nu ai acces la grupa asta." };

  const nume = String(formData.get("nume") ?? "").trim();
  if (nume.length < 2) return { eroare: "Scrie numele musafirului." };
  if (nume.length > 80) return { eroare: "Numele e prea lung." };

  const telefonScris = String(formData.get("telefon") ?? "").trim();

  const [creat] = await db
    .insert(membri)
    .values({
      grupaId,
      nume,
      telefon: telefonScris ? telefonScris.slice(0, 30) : null,
      status: "musafir",
    })
    .returning({ id: membri.id, nume: membri.nume });

  await scrieAudit(lider.id, "musafir:adaugat", {
    grupaId,
    membruId: creat.id,
    nume,
  });

  revalidatePath(`/grupe/${grupaId}`);
  return { musafir: creat };
}

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
