"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { membri, noteMembru } from "@/lib/db/schema";
import { verificaAccesGrupa } from "@/lib/interogari/acces";
import { creeazaBiserica, iaBiserica } from "@/lib/interogari/biserici";
import { desfaPrietenia, leagaPrietenii } from "@/lib/interogari/prietenii";
import {
  numeConfirmat,
  pierderiMembru,
  stergeMembruDefinitiv,
} from "@/lib/interogari/stergere";
import { dataAzi, esteDataValida } from "@/lib/util/date";
import { emailValid } from "@/lib/util/email";

export type StareFormular = { eroare?: string; reusit?: boolean };

/** Verifică dreptul de a lucra cu un anumit pulsist. */
async function accesLaMembru(membruId: number) {
  const lider = await ceruteLider();
  const [m] = await db
    .select({ id: membri.id, grupaId: membri.grupaId })
    .from(membri)
    .where(eq(membri.id, membruId));
  if (!m) return null;
  const acces = await verificaAccesGrupa(lider, m.grupaId);
  if (!acces.permis) return null;
  return { lider, membru: m };
}

/** Adaugă o notă despre un pulsist. */
export async function adaugaNota(
  membruId: number,
  _stare: StareFormular,
  formData: FormData,
): Promise<StareFormular> {
  const acces = await accesLaMembru(membruId);
  if (!acces) return { eroare: "Nu ai acces la pulsistul ăsta." };

  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 2) return { eroare: "Scrie ceva mai întâi." };
  if (text.length > 2000) return { eroare: "Nota e prea lungă." };

  await db.insert(noteMembru).values({
    membruId,
    autorId: acces.lider.id,
    text,
  });
  await scrieAudit(acces.lider.id, "nota:adaugata", { membruId });

  revalidatePath(`/membri/${membruId}`);
  return { reusit: true };
}

/** Șterge o notă (doar autorul ei sau un admin). */
export async function stergeNota(membruId: number, notaId: number) {
  const acces = await accesLaMembru(membruId);
  if (!acces) return;

  const [nota] = await db
    .select()
    .from(noteMembru)
    .where(and(eq(noteMembru.id, notaId), eq(noteMembru.membruId, membruId)));
  if (!nota) return;
  if (nota.autorId !== acces.lider.id && acces.lider.rol !== "admin") return;

  await db.delete(noteMembru).where(eq(noteMembru.id, notaId));
  await scrieAudit(acces.lider.id, "nota:stearsa", { membruId, notaId });
  revalidatePath(`/membri/${membruId}`);
}

const textOptional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/*
  Adresa se scrie cu litere mici, ca să nu ajungă același om de două ori în
  listă dacă unul o scrie cu majusculă. Golul e îngăduit; ce nu e gol trebuie
  să semene a adresă, altfel anunțul pleacă în neant fără să afle nimeni.
*/
const emailOptional = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || emailValid(v), "Adresa de email nu e validă.");

const schemaMembru = z.object({
  nume: z.string().trim().min(2, "Numele e prea scurt.").max(80),
  telefon: textOptional(30),
  email: emailOptional,
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
  biserica: z
    .string()
    .optional()
    .transform((v) =>
      v === "harvest" || v === "alta" || v === "fara" ? v : null,
    ),
  /* Biserica aleasă din listă. Gol = niciuna. */
  bisericaId: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || Number.isInteger(v), "Biserica nu e validă."),
  botez: z
    .string()
    .optional()
    .transform((v) => (v === "botezat" || v === "nebotezat" ? v : null)),
  botezatLa: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || esteDataValida(v), "Data botezului nu e validă."),
  /* Biserica scrisă pe loc, când nu era în listă. Are prioritate. */
  bisericaNouaNume: textOptional(80),
  bisericaNouaLocalitate: textOptional(60),
  bisericaNouaDenominatiune: textOptional(60),
  parinte1Nume: textOptional(80),
  parinte1Telefon: textOptional(30),
  parinte1Email: emailOptional,
  parinte2Nume: textOptional(80),
  parinte2Telefon: textOptional(30),
  parinte2Email: emailOptional,
}).transform((date) => ({
  ...date,
  /*
    Biserica anume are sens doar la „altă biserică". În rest o golim, ca să
    nu rămână agățat un „Betel" lângă un răspuns care spune „Harvest" -
    câmpurile din formular se văd oricum tot timpul.
  */
  bisericaId: date.biserica === "alta" ? date.bisericaId : null,
  bisericaNouaNume: date.biserica === "alta" ? date.bisericaNouaNume : null,
  // Data botezului n-are ce căuta lângă „nebotezat" sau lângă un răspuns nedat.
  botezatLa: date.botez === "botezat" ? date.botezatLa : null,
}));

/** Salvează datele unui pulsist. */
export async function salveazaMembru(
  membruId: number,
  _stare: StareFormular,
  formData: FormData,
): Promise<StareFormular> {
  const acces = await accesLaMembru(membruId);
  if (!acces) return { eroare: "Nu ai acces la pulsistul ăsta." };

  const rezultat = schemaMembru.safeParse({
    nume: formData.get("nume"),
    telefon: formData.get("telefon"),
    email: formData.get("email"),
    dataNasterii: formData.get("dataNasterii"),
    sex: formData.get("sex"),
    clasa: formData.get("clasa"),
    // Radio nebifat ar da `null`, iar zod l-ar citi ca valoare greșită.
    biserica: formData.get("biserica") ?? undefined,
    bisericaId: formData.get("bisericaId"),
    botez: formData.get("botez") ?? undefined,
    botezatLa: formData.get("botezatLa"),
    bisericaNouaNume: formData.get("bisericaNouaNume"),
    bisericaNouaLocalitate: formData.get("bisericaNouaLocalitate"),
    bisericaNouaDenominatiune: formData.get("bisericaNouaDenominatiune"),
    parinte1Nume: formData.get("parinte1Nume"),
    parinte1Telefon: formData.get("parinte1Telefon"),
    parinte1Email: formData.get("parinte1Email"),
    parinte2Nume: formData.get("parinte2Nume"),
    parinte2Telefon: formData.get("parinte2Telefon"),
    parinte2Email: formData.get("parinte2Email"),
  });
  if (!rezultat.success) {
    return { eroare: rezultat.error.issues[0]?.message ?? "Date invalide." };
  }

  const {
    bisericaNouaNume,
    bisericaNouaLocalitate,
    bisericaNouaDenominatiune,
    ...date
  } = rezultat.data;

  /*
    Dacă a scris o biserică nouă, ea bate ce era ales în listă: omul tocmai
    ne-a spus că niciuna din listă nu era bună. O creăm aici, ca să nu fie
    nevoit să plece de pe fișă și să se întoarcă.
  */
  if (bisericaNouaNume) {
    const creata = await creeazaBiserica({
      nume: bisericaNouaNume,
      localitate: bisericaNouaLocalitate,
      denominatiune: bisericaNouaDenominatiune,
    });
    if ("eroare" in creata) return { eroare: creata.eroare };
    date.bisericaId = creata.id;
  } else if (date.bisericaId !== null && !(await iaBiserica(date.bisericaId))) {
    // Cineva a șters biserica între timp, din administrare.
    return { eroare: "Biserica aleasă nu mai există. Alege alta din listă." };
  }

  await db.update(membri).set(date).where(eq(membri.id, membruId));
  await scrieAudit(acces.lider.id, "membru:modificat", { membruId });

  // Lista de biserici s-a putut lungi - se vede și în administrare.
  revalidatePath("/admin/biserici");
  revalidatePath(`/membri/${membruId}`);
  return { reusit: true };
}

/**
 * Marchează un pulsist ca inactiv (nu mai vine) sau îl reactivează.
 * Istoricul lui rămâne intact - doar nu mai apare pe foaia de prezență.
 */
export async function schimbaActiv(membruId: number, activ: boolean) {
  const acces = await accesLaMembru(membruId);
  if (!acces) return;

  await db.update(membri).set({ activ }).where(eq(membri.id, membruId));
  await scrieAudit(acces.lider.id, activ ? "membru:reactivat" : "membru:inactivat", {
    membruId,
  });

  revalidatePath(`/membri/${membruId}`);
  revalidatePath(`/grupe/${acces.membru.grupaId}`);
}

/**
 * Primește un musafir în grupă (după procedura internă a lucrării).
 * Din momentul ăsta intră în statistici și în alertele de absență.
 */
export async function primesteInGrupa(membruId: number) {
  const acces = await accesLaMembru(membruId);
  if (!acces) return;

  await db
    .update(membri)
    .set({ status: "membru", devenitMembruLa: dataAzi() })
    .where(eq(membri.id, membruId));
  await scrieAudit(acces.lider.id, "musafir:primit-in-grupa", {
    membruId,
    grupaId: acces.membru.grupaId,
  });

  revalidatePath(`/membri/${membruId}`);
  revalidatePath(`/grupe/${acces.membru.grupaId}`);
}

/**
 * Șterge definitiv un pulsist, cu tot ce ține de el: prezențe, note,
 * echipele de slujire. E ireversibil, deci cerem numele scris de mână.
 *
 * Dacă doar nu mai vine, varianta bună e „Marchează ca inactiv" - acolo
 * istoricul rămâne întreg.
 */
export async function stergeMembru(
  membruId: number,
  _stare: StareFormular,
  formData: FormData,
): Promise<StareFormular> {
  const acces = await accesLaMembru(membruId);
  if (!acces) return { eroare: "Nu ai acces la pulsistul ăsta." };

  const pierderi = await pierderiMembru(membruId);
  if (!pierderi) return { eroare: "Pulsistul nu mai există." };

  const scris = String(formData.get("confirmare") ?? "");
  if (!numeConfirmat(scris, pierderi.nume)) {
    return { eroare: `Scrie exact „${pierderi.nume}" ca să confirmi ștergerea.` };
  }

  await stergeMembruDefinitiv(membruId);
  await scrieAudit(acces.lider.id, "membru:sters", {
    membruId,
    nume: pierderi.nume,
    grupaId: pierderi.grupaId,
    prezente: pierderi.prezente,
    note: pierderi.note,
  });

  // Ștergerea atinge multe pagini deodată (grupa, lista, slujirile, alertele),
  // așa că golim tot ce ține de cadrul aplicației - se întâmplă destul de rar.
  revalidatePath("/", "layout");
  redirect(`/grupe/${pierderi.grupaId}`);
}

/** Îl trece înapoi la musafiri (dacă a fost primit din greșeală). */
export async function treceLaMusafiri(membruId: number) {
  const acces = await accesLaMembru(membruId);
  if (!acces) return;

  await db
    .update(membri)
    .set({ status: "musafir", devenitMembruLa: null })
    .where(eq(membri.id, membruId));
  await scrieAudit(acces.lider.id, "membru:trecut-la-musafiri", { membruId });

  revalidatePath(`/membri/${membruId}`);
  revalidatePath(`/grupe/${acces.membru.grupaId}`);
}

/**
 * Leagă doi pulsiști ca prieteni apropiați.
 *
 * Cerem acces la amândoi, nu doar la cel de pe a cărui fișă suntem: legătura
 * se vede la fel de pe cealaltă fișă, deci n-ar fi cinstit s-o poată scrie
 * cineva care n-are treabă cu celălalt. Coordonatorul are acces peste tot,
 * deci el e cel care poate lega pulsiști din grupe diferite.
 */
export async function adaugaPrieten(membruId: number, formData: FormData) {
  const acces = await accesLaMembru(membruId);
  if (!acces) return;

  const prietenId = Number(formData.get("prietenId"));
  if (!Number.isInteger(prietenId) || prietenId === membruId) return;

  const accesLaPrieten = await accesLaMembru(prietenId);
  if (!accesLaPrieten) return;

  await leagaPrietenii(membruId, prietenId, acces.lider.id);
  await scrieAudit(acces.lider.id, "prieteni:legati", { membruId, prietenId });

  revalidatePath(`/membri/${membruId}`);
  revalidatePath(`/membri/${prietenId}`);
}

/** Desface o prietenie. Ajunge accesul la unul dintre cei doi. */
export async function scoatePrieten(membruId: number, prietenId: number) {
  const acces = await accesLaMembru(membruId);
  if (!acces) return;

  await desfaPrietenia(membruId, prietenId);
  await scrieAudit(acces.lider.id, "prieteni:dezlegati", { membruId, prietenId });

  revalidatePath(`/membri/${membruId}`);
  revalidatePath(`/membri/${prietenId}`);
}
