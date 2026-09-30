"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { scrieAudit } from "@/lib/audit";
import { ceruteLider } from "@/lib/auth/sesiune";
import { db } from "@/lib/db";
import { grupe, membri, prezenteEveniment } from "@/lib/db/schema";
import {
  aBifatDeja,
  arePrezentaPeIntalnire,
  bifeazaLaIntalnire,
  cineAVenit,
  evenimentul,
  type PersoanaLaIntalnire,
} from "@/lib/interogari/prezenta-eveniment";
import { dataAzi } from "@/lib/util/date";
import { acelasiNume } from "@/lib/util/text";

/**
 * Prezența la o întâlnire cu toți.
 *
 * O poate face orice lider: întâlnirea nu e a niciunei grupe, iar la ușă
 * bifează cine ajunge primul. Fiecare bifă e o cerere a ei, deci n-are ce
 * să se piardă dacă liderul închide telefonul la jumătate.
 */

export type RezultatBifa = {
  /** Cine e bifat acum - cu tot cu ce au bifat ceilalți lideri între timp. */
  venit?: number[];
  eroare?: string;
};

/** Verifică dacă la întâlnirea asta se poate bifa acum. */
async function intalnireaDeBifat(evenimentId: number) {
  const e = await evenimentul(evenimentId);
  if (!e) return { eroare: "Întâlnirea nu mai e în calendar." } as const;
  if (e.data > dataAzi()) {
    return { eroare: "Întâlnirea n-a avut loc încă." } as const;
  }
  if (e.peGrupeMici) {
    const veniti = await cineAVenit(evenimentId);
    if (!arePrezentaPeIntalnire(e, veniti.length)) {
      return {
        eroare: "În seara asta se stă pe grupe mici - prezența se face pe grupe.",
      } as const;
    }
  }
  return { eveniment: e } as const;
}

/** Pune sau scoate bifa „a venit" a unui pulsist. */
export async function bifeaza(
  evenimentId: number,
  membruId: number,
  aVenit: boolean,
): Promise<RezultatBifa> {
  const lider = await ceruteLider();
  if (!Number.isInteger(evenimentId) || !Number.isInteger(membruId)) {
    return { eroare: "Date invalide." };
  }

  const verificare = await intalnireaDeBifat(evenimentId);
  if ("eroare" in verificare) return { eroare: verificare.eroare };
  const e = verificare.eveniment;

  const [pulsist] = await db
    .select({ id: membri.id, nume: membri.nume })
    .from(membri)
    .where(eq(membri.id, membruId));
  if (!pulsist) return { eroare: "Pulsistul nu mai e în aplicație." };

  /*
    În jurnal intră doar ce spune ceva: prima bifă a fiecărui lider la o
    întâlnire („X a făcut prezența la Gamenight") și bifele scoase după ce le
    pusese altcineva. O sută de rânduri pe seară, câte unul de fiecare copil,
    ar îngropa tot restul jurnalului - iar cine a pus fiecare bifă stă oricum
    scris lângă ea.
  */
  const primaLui = aVenit && !(await aBifatDeja(evenimentId, lider.id));
  const [bifaVeche] = aVenit
    ? []
    : await db
        .select({ marcatDeId: prezenteEveniment.marcatDeId })
        .from(prezenteEveniment)
        .where(
          and(
            eq(prezenteEveniment.evenimentId, evenimentId),
            eq(prezenteEveniment.membruId, membruId),
          ),
        );

  const venit = await bifeazaLaIntalnire({
    evenimentId,
    membruId,
    aVenit,
    liderId: lider.id,
  });

  if (primaLui) {
    await scrieAudit(lider.id, "intalnire:prezenta", {
      evenimentId,
      titlu: e.titlu,
      data: e.data,
    });
    /*
      Calendarul și pagina grupelor arată dacă s-a făcut prezența. Le
      împrospătăm doar aici, la prima bifă: la fiecare atingere ar însemna ca
      toată lista să vină din nou de la server, de o sută de ori pe seară.
    */
    revalidatePath("/calendar");
    revalidatePath("/grupe");
  } else if (bifaVeche && bifaVeche.marcatDeId !== lider.id) {
    await scrieAudit(lider.id, "intalnire:bifa-scoasa", {
      evenimentId,
      titlu: e.titlu,
      data: e.data,
      pulsist: pulsist.nume,
    });
  }

  return { venit };
}

export type RezultatMusafir = {
  eroare?: string;
  /**
   * Există deja cineva cu numele ăsta. Nu-l scriem a doua oară fără să
   * întrebăm: de cele mai multe ori e chiar el, venit din nou.
   */
  dublura?: PersoanaLaIntalnire;
  musafir?: PersoanaLaIntalnire;
  venit?: number[];
};

/**
 * A venit cineva nou la o întâlnire cu toți.
 *
 * Primește o fișă de musafir fără grupă și e bifat pe loc. Ajunge astfel la
 * „Nerepartizați", unde coordonatorii îi dau o grupă când e cazul - la fel
 * ca oricine s-a înscris din formular. Dacă mai vine, e deja pe listă.
 */
export async function adaugaMusafirLaIntalnire(
  evenimentId: number,
  date: { nume: string; telefon: string; oricum: boolean },
): Promise<RezultatMusafir> {
  const lider = await ceruteLider();

  const verificare = await intalnireaDeBifat(evenimentId);
  if ("eroare" in verificare) return { eroare: verificare.eroare };
  const e = verificare.eveniment;

  const nume = date.nume.replace(/\s+/g, " ").trim();
  if (nume.length < 2) return { eroare: "Scrie numele musafirului." };
  if (nume.length > 80) return { eroare: "Numele e prea lung." };
  const telefon = date.telefon.trim().slice(0, 30) || null;

  if (!date.oricum) {
    const activi = await db
      .select({
        id: membri.id,
        nume: membri.nume,
        grupaId: membri.grupaId,
        grupaNume: grupe.nume,
        status: membri.status,
      })
      .from(membri)
      .leftJoin(grupe, eq(grupe.id, membri.grupaId))
      .where(eq(membri.activ, true));
    const acelasi = activi.find((m) => acelasiNume(m.nume, nume));
    if (acelasi) {
      const { status, ...p } = acelasi;
      return { dublura: { ...p, musafir: status === "musafir" } };
    }
  }

  const [creat] = await db
    .insert(membri)
    .values({ grupaId: null, nume, telefon, status: "musafir" })
    .returning({ id: membri.id, nume: membri.nume });

  const venit = await bifeazaLaIntalnire({
    evenimentId,
    membruId: creat.id,
    aVenit: true,
    liderId: lider.id,
  });

  await scrieAudit(lider.id, "musafir:adaugat", {
    evenimentId,
    intalnire: e.titlu,
    data: e.data,
    membruId: creat.id,
    nume,
  });

  // Musafirul nou apare la Nerepartizați; calendarul arată câți au venit.
  revalidatePath("/", "layout");

  return {
    musafir: {
      id: creat.id,
      nume: creat.nume,
      grupaId: null,
      grupaNume: null,
      musafir: true,
    },
    venit,
  };
}

/**
 * „Gata": înapoi în calendar, pe ziua întâlnirii.
 *
 * Trece prin server ca să ajungă în calendar numărul la zi. Bifele nu
 * împrospătează nimic pe drum (vezi `bifeaza`), iar telefonul ar ține minte
 * altfel calendarul de dinainte.
 */
export async function inchidePrezenta(evenimentId: number) {
  await ceruteLider();
  const e = await evenimentul(evenimentId);
  revalidatePath("/calendar");
  revalidatePath("/grupe");
  redirect(e ? `/calendar?luna=${e.data.slice(0, 7)}&zi=${e.data}` : "/calendar");
}
