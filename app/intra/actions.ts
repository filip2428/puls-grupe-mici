"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { despartCod, verificaCod } from "@/lib/auth/cod";
import {
  cheieAnonima,
  inregistreazaIncercare,
  resetLimita,
  textAsteptare,
  verificaLimita,
} from "@/lib/auth/limitare";
import {
  deschideSesiune,
  inchideSesiune,
  ipulCererii,
  sesiuneCurenta,
} from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { lideri } from "@/lib/db/schema";

export type StareAutentificare = { eroare?: string };

/**
 * Autentificarea cu cod de acces.
 *
 * Apărarea împotriva roboților:
 *  - codul are o parte secretă de 6 caractere (peste un miliard de variante);
 *  - maximum 5 încercări greșite la 15 minute, atât pe IP cât și pe cod;
 *  - un câmp-capcană invizibil (roboții îl completează, oamenii nu îl văd);
 *  - orice intrare reușită se scrie în jurnal.
 */
export async function autentifica(
  _stare: StareAutentificare,
  formData: FormData,
): Promise<StareAutentificare> {
  // Câmpul-capcană: dacă e completat, cererea vine aproape sigur de la un robot.
  if ((formData.get("adresa") as string | null)?.trim()) {
    return { eroare: "Cod greșit." };
  }

  const codScris = String(formData.get("cod") ?? "");
  const parti = despartCod(codScris);

  const ip = await ipulCererii();
  const cheieIp = cheieAnonima("ip", ip);
  const chei = [cheieIp];
  if (parti) chei.push(cheieAnonima("cod", parti.partePublica));

  const limita = await verificaLimita(chei);
  if (!limita.permis) {
    return {
      eroare: `Prea multe încercări. Mai încearcă peste ${textAsteptare(limita.asteaptaSecunde)}.`,
    };
  }

  if (!parti) {
    await inregistreazaIncercare([cheieIp], false);
    return { eroare: "Codul are 10 caractere, de forma ABCD-EFGHJK." };
  }

  const [lider] = await db
    .select()
    .from(lideri)
    .where(eq(lideri.codPublic, parti.partePublica));

  const potrivit =
    lider && lider.activ
      ? await verificaCod(parti.parteSecreta, lider.codHash)
      : false;

  if (!potrivit) {
    await inregistreazaIncercare(chei, false);
    const ramase = Math.max(0, limita.incercariRamase - 1);
    return {
      eroare:
        ramase > 0
          ? `Cod greșit. Mai ai ${ramase} ${ramase === 1 ? "încercare" : "încercări"}.`
          : "Cod greșit. Ai epuizat încercările, mai așteaptă puțin.",
    };
  }

  await resetLimita(chei);
  await inregistreazaIncercare([cheieIp], true);
  await db
    .update(lideri)
    .set({ ultimaAutentificare: new Date() })
    .where(eq(lideri.id, lider.id));
  await deschideSesiune(lider);
  await scrieAudit(lider.id, "autentificare");

  redirect(lider.rol === "admin" ? "/admin" : "/grupe");
}

/** Deconectare. */
export async function iesi() {
  const lider = await sesiuneCurenta();
  if (lider) await scrieAudit(lider.id, "deconectare");
  await inchideSesiune();
  redirect("/intra");
}
