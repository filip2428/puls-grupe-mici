"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { delegari, grupe, membri } from "@/lib/db/schema";
import { verificaAccesGrupa } from "@/lib/interogari/acces";
import { esteDataValida } from "@/lib/util/date";
import { acelasiNume } from "@/lib/util/text";

export type StareFormular = { eroare?: string; reusit?: boolean };

/**
 * Starea formularului de pulsist nou.
 *
 * `cereConfirmare` apare când numele scris există deja în aplicație. Nu e o
 * eroare, ci o întrebare: sunt frați, veri, sau doi colegi care chiar se
 * numesc la fel? Liderul răspunde bifând, și atunci se scrie fișa nouă.
 */
export type StareMembruNou = StareFormular & { cereConfirmare?: boolean };

/** Starea butonului prin care intră în grupă cineva care există deja. */
export type StarePulsistExistent = { eroare?: string; adaugat?: string };

const schemaMembru = z.object({
  nume: z.string().trim().min(2, "Numele e prea scurt.").max(80),
  telefon: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : null)),
  dataNasterii: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || esteDataValida(v), "Data nașterii nu e validă."),
  sex: z
    .string()
    .optional()
    .transform((v) => (v === "baiat" || v === "fata" ? v : null)),
  clasa: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (v >= 1 && v <= 13), "Clasa nu e validă."),
});

/** Adaugă un pulsist nou în grupă (liderul grupei sau adminul). */
export async function adaugaMembru(
  grupaId: number,
  _stare: StareMembruNou,
  formData: FormData,
): Promise<StareMembruNou> {
  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis) return { eroare: "Nu ai acces la grupa asta." };

  const rezultat = schemaMembru.safeParse({
    nume: formData.get("nume"),
    telefon: formData.get("telefon"),
    dataNasterii: formData.get("dataNasterii"),
    sex: formData.get("sex"),
    clasa: formData.get("clasa"),
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  /*
    Un om scris de două ori e mai greu de reparat decât de prevenit: prezența
    se împarte între cele două fișe, iar datele strânse de la înscriere rămân
    pe cea veche. Așa că, dacă numele există deja, ne oprim și întrebăm.
  */
  if (formData.get("confirmDuplicat") !== "da") {
    const omonim = await omonimul(rezultat.data.nume);
    if (omonim) {
      return { eroare: omonim, cereConfirmare: true };
    }
  }

  const [creat] = await db
    .insert(membri)
    .values({ grupaId, ...rezultat.data })
    .returning({ id: membri.id });

  await scrieAudit(lider.id, "membru:adaugat", {
    grupaId,
    membruId: creat.id,
    nume: rezultat.data.nume,
  });

  revalidatePath(`/grupe/${grupaId}`);
  return { reusit: true };
}

/**
 * Dacă mai e cineva cu numele ăsta, întoarce fraza care spune unde e.
 *
 * Comparăm în aplicație, nu în SQL, ca să nu conteze diacriticele: cel care
 * s-a înscris prin formular e scris „Ștefan Ioneț", iar liderul tastează de
 * pe telefon „Stefan Ionet" - și tocmai ăsta e cazul pe care vrem să-l
 * prindem. Sunt câteva sute de nume, deci se citesc o dată și se compară.
 */
async function omonimul(nume: string): Promise<string | null> {
  const toti = await db
    .select({ nume: membri.nume, grupaNume: grupe.nume })
    .from(membri)
    .leftJoin(grupe, eq(grupe.id, membri.grupaId));

  const gasit = toti.find((m) => acelasiNume(m.nume, nume));
  if (!gasit) return null;

  return gasit.grupaNume
    ? `${gasit.nume} e deja în aplicație, în grupa ${gasit.grupaNume}.`
    : `${gasit.nume} e deja în aplicație, fără grupă - îl iei din lista de sus, cu tot ce s-a strâns despre el.`;
}

/**
 * Ia în grupă un pulsist care e deja în aplicație, dar n-are grupă.
 *
 * E drumul obișnuit la începutul anului: omul s-a înscris prin formular
 * demult, cu telefon, părinți și biserică, și abia acum ajunge la o grupă.
 */
export async function adaugaPulsistExistent(
  grupaId: number,
  _stare: StarePulsistExistent,
  formData: FormData,
): Promise<StarePulsistExistent> {
  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis) return { eroare: "Nu ai acces la grupa asta." };

  const membruId = Number(formData.get("membruId"));
  if (!Number.isInteger(membruId) || membruId <= 0) {
    return { eroare: "Alege întâi pulsistul." };
  }

  const [m] = await db
    .select({ nume: membri.nume, grupaId: membri.grupaId })
    .from(membri)
    .where(eq(membri.id, membruId));
  if (!m) return { eroare: "Pulsistul nu mai există." };

  /*
    Doar cine chiar n-are grupă. Lista putea sta deschisă de dimineață, iar
    între timp să-l fi luat altcineva - a-l muta de acolo pe tăcute ar fi o
    hotărâre luată peste liderul lui.
  */
  const rezultat = await db
    .update(membri)
    .set({ grupaId })
    .where(and(eq(membri.id, membruId), isNull(membri.grupaId)));
  if (rezultat.rowsAffected === 0) {
    return { eroare: `${m.nume} a primit între timp altă grupă.` };
  }

  await scrieAudit(lider.id, "membru:repartizat", {
    grupaId,
    membruId,
    nume: m.nume,
  });

  revalidatePath(`/grupe/${grupaId}`);
  revalidatePath(`/membri/${membruId}`);
  revalidatePath("/admin/nerepartizati");
  revalidatePath("/admin");
  revalidatePath("/pulsisti");
  return { adaugat: m.nume };
}

const schemaInlocuire = z.object({
  liderId: z.coerce.number().int().positive(),
  deLa: z.string().refine(esteDataValida, "Data de început nu e validă."),
  panaLa: z.string().refine(esteDataValida, "Data de sfârșit nu e validă."),
  motiv: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
});

/**
 * Cere unui alt lider să țină locul la grupă o perioadă.
 * Îl pot face liderii grupei și adminul - nu și cineva care e deja înlocuitor.
 */
export async function creeazaInlocuire(
  grupaId: number,
  _stare: StareFormular,
  formData: FormData,
): Promise<StareFormular> {
  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis || (acces.prinInlocuire && !acces.esteAdmin)) {
    return { eroare: "Doar liderii grupei pot cere o înlocuire." };
  }

  const rezultat = schemaInlocuire.safeParse({
    liderId: formData.get("liderId"),
    deLa: formData.get("deLa"),
    panaLa: formData.get("panaLa"),
    motiv: formData.get("motiv"),
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }
  if (rezultat.data.panaLa < rezultat.data.deLa) {
    return { eroare: "Data de sfârșit e înaintea celei de început." };
  }

  await db.insert(delegari).values({
    grupaId,
    liderId: rezultat.data.liderId,
    deLa: rezultat.data.deLa,
    panaLa: rezultat.data.panaLa,
    motiv: rezultat.data.motiv,
    creatDeId: lider.id,
  });

  await scrieAudit(lider.id, "inlocuire:creata", {
    grupaId,
    ...rezultat.data,
  });

  revalidatePath(`/grupe/${grupaId}`);
  return { reusit: true };
}

/**
 * Șterge o înlocuire.
 *
 * Rândul dispare de tot - o înlocuire anulată n-are ce să mai spună nimănui,
 * iar urma rămâne în jurnal. Prezențele completate în perioada respectivă nu
 * se ating: ele știu deja că au fost făcute prin înlocuire.
 */
export async function anuleazaInlocuire(grupaId: number, delegareId: number) {
  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis || (acces.prinInlocuire && !acces.esteAdmin)) return;

  await db
    .delete(delegari)
    .where(and(eq(delegari.id, delegareId), eq(delegari.grupaId, grupaId)));

  await scrieAudit(lider.id, "inlocuire:stearsa", { grupaId, delegareId });
  revalidatePath(`/grupe/${grupaId}`);
  revalidatePath(`/admin/grupe/${grupaId}`);
}
