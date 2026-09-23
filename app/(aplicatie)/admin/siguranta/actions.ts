"use server";

import { revalidatePath } from "next/cache";

import { scrieAudit } from "@/lib/audit";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import {
  citesteCopia,
  restaureazaCopia,
  trimiteCopiaPeEmail,
  type RezumatCopie,
} from "@/lib/copie";
import { numeConfirmat } from "@/lib/interogari/stergere";

const MARIME_MAXIMA = 4 * 1024 * 1024;

/** Cuvântul care trebuie scris ca să pornească restaurarea. */
const CONFIRMARE = "restaurează";

export type StareTrimitere = { eroare?: string; mesaj?: string };

/** Trimite acum o copie pe email administratorilor. */
export async function trimiteCopiaAcum(): Promise<StareTrimitere> {
  const admin = await ceruteAdmin();
  const r = await trimiteCopiaPeEmail("trimisă de mână", admin.id);
  revalidatePath("/admin/siguranta");
  if (r.trimise === 0) return { eroare: r.eroare ?? "Copia n-a plecat." };
  return {
    mesaj:
      r.trimise === 1
        ? "Copia a plecat pe email."
        : `Copia a plecat pe email la ${r.trimise} administratori.`,
    eroare: r.eroare,
  };
}

export type StareVerificare = { eroare?: string; rezumat?: RezumatCopie };

async function fisierDinFormular(
  formData: FormData,
): Promise<Buffer | { eroare: string }> {
  const fisier = formData.get("copie");
  if (!(fisier instanceof File) || fisier.size === 0) {
    return { eroare: "Alege fișierul copiei (.json.gz)." };
  }
  if (fisier.size > MARIME_MAXIMA) {
    return { eroare: "Fișierul e prea mare (peste 4 MB)." };
  }
  return Buffer.from(await fisier.arrayBuffer());
}

/** Prima etapă: citim copia și spunem ce e în ea. Nu se schimbă nimic. */
export async function verificaCopia(
  _stare: StareVerificare,
  formData: FormData,
): Promise<StareVerificare> {
  await ceruteAdmin();
  const fisier = await fisierDinFormular(formData);
  if ("eroare" in fisier) return fisier;

  const citita = citesteCopia(fisier);
  if ("eroare" in citita) return { eroare: citita.eroare };
  return { rezumat: citita.rezumat };
}

export type StareRestaurare = { eroare?: string; reusit?: boolean; copieTrimisa?: boolean };

/**
 * A doua etapă: baza de date se înlocuiește cu ce e în copie.
 *
 * Înainte de orice, starea de acum pleacă pe email la administratori - dacă
 * s-a încărcat copia greșită, tot se mai poate da înapoi.
 */
export async function restaureaza(
  _stare: StareRestaurare,
  formData: FormData,
): Promise<StareRestaurare> {
  const admin = await ceruteAdmin();

  if (!numeConfirmat(String(formData.get("confirmare") ?? ""), CONFIRMARE)) {
    return { eroare: `Scrie „${CONFIRMARE}”, exact așa, ca să confirmi.` };
  }

  const fisier = await fisierDinFormular(formData);
  if ("eroare" in fisier) return fisier;
  const citita = citesteCopia(fisier);
  if ("eroare" in citita) return { eroare: citita.eroare };

  const inainte = await trimiteCopiaPeEmail("înainte de restaurare", admin.id);

  try {
    await restaureazaCopia(citita.copie);
  } catch (e) {
    return {
      eroare: `Restaurarea n-a mers și baza a rămas cum era. ${e instanceof Error ? e.message : ""}`,
    };
  }

  // Jurnalul a venit și el din copie; scriem peste el că s-a restaurat.
  // Dacă în copie nu exista încă adminul ăsta, rândul rămâne fără nume.
  const detalii = {
    copiaDin: citita.copie.creatLa,
    randuri: citita.rezumat.totalRanduri,
    restauratDe: admin.nume,
  };
  try {
    await scrieAudit(admin.id, "copie:restaurata", detalii);
  } catch {
    await scrieAudit(null, "copie:restaurata", detalii);
  }

  revalidatePath("/", "layout");
  return { reusit: true, copieTrimisa: inainte.trimise > 0 };
}
