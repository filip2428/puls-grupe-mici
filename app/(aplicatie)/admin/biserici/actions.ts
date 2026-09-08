"use server";

import { revalidatePath } from "next/cache";

import { ceruteAdmin } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import {
  creeazaBiserica,
  iaBiserica,
  salveazaBiserica,
  stergeBiserica,
} from "@/lib/interogari/biserici";

export type StareBiserica = { eroare?: string; reusit?: boolean };

/** Ce a scris omul în cele trei câmpuri, oricare dintre formulare ar fi. */
function citesteCampurile(formData: FormData) {
  return {
    nume: String(formData.get("nume") ?? ""),
    localitate: String(formData.get("localitate") ?? ""),
    denominatiune: String(formData.get("denominatiune") ?? ""),
  };
}

/*
  Bisericile ating multe ecrane: fișa fiecărui pulsist, lista de pulsiști și
  statisticile pe biserici. Le împrospătăm pe toate, nu doar pagina de aici.
*/
function improspateaza() {
  revalidatePath("/admin/biserici");
  revalidatePath("/pulsisti");
  revalidatePath("/statistici");
  revalidatePath("/membri", "layout");
}

/** Adaugă o biserică în listă. */
export async function creeazaBisericaNoua(
  _stare: StareBiserica,
  formData: FormData,
): Promise<StareBiserica> {
  const admin = await ceruteAdmin();

  const date = citesteCampurile(formData);
  const rezultat = await creeazaBiserica(date);
  if ("eroare" in rezultat) return { eroare: rezultat.eroare };

  await scrieAudit(admin.id, "biserica:creata", {
    bisericaId: rezultat.id,
    nume: date.nume,
  });
  improspateaza();
  return { reusit: true };
}

/** Schimbă numele, localitatea sau denominațiunea unei biserici. */
export async function salveazaBisericaAdmin(
  bisericaId: number,
  _stare: StareBiserica,
  formData: FormData,
): Promise<StareBiserica> {
  const admin = await ceruteAdmin();

  const date = citesteCampurile(formData);
  const rezultat = await salveazaBiserica(bisericaId, date);
  if ("eroare" in rezultat) return { eroare: rezultat.eroare };

  await scrieAudit(admin.id, "biserica:modificata", {
    bisericaId,
    nume: date.nume,
  });
  improspateaza();
  return { reusit: true };
}

/**
 * Scoate o biserică din listă.
 *
 * Pulsiștii din ea nu se pierd - rămân scriși ca „de la altă biserică", doar
 * că nu mai știm care. Ecranul spune dinainte câți sunt.
 */
export async function stergeBisericaAdmin(bisericaId: number) {
  const admin = await ceruteAdmin();

  const b = await iaBiserica(bisericaId);
  if (!b) return;

  await stergeBiserica(bisericaId);
  await scrieAudit(admin.id, "biserica:stearsa", { bisericaId, nume: b.nume });
  improspateaza();
}
