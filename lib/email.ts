import "server-only";

/**
 * Trimiterea email-urilor, prin Resend.
 *
 * Nu e nevoie de nicio bibliotecă: Resend are un API simplu peste HTTP.
 * Se configurează din două variabile de mediu:
 *   RESEND_API_KEY   - cheia din contul Resend
 *   EMAIL_EXPEDITOR  - de la cine pleacă, ex. "Puls <puls@biserica.ro>"
 *
 * Cât timp cheia lipsește, aplicația merge normal: notificările se generează
 * și se văd în aplicație, doar că nu pleacă pe email.
 */

export type RezultatEmail =
  | { trimis: true }
  | { trimis: false; motiv: string };

export function emailConfigurat(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_EXPEDITOR);
}

/** Adresa aplicației, folosită în legăturile din email-uri. */
export function adresaAplicatiei(): string {
  return (
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}

export async function trimiteEmail(mesaj: {
  catre: string;
  subiect: string;
  text: string;
}): Promise<RezultatEmail> {
  if (!emailConfigurat()) {
    return { trimis: false, motiv: "Trimiterea pe email nu e configurată." };
  }

  try {
    const raspuns = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_EXPEDITOR,
        to: [mesaj.catre],
        subject: mesaj.subiect,
        text: mesaj.text,
      }),
    });

    if (!raspuns.ok) {
      const detaliu = await raspuns.text();
      return { trimis: false, motiv: explicaEroarea(raspuns.status, detaliu) };
    }
    return { trimis: true };
  } catch (eroare) {
    return {
      trimis: false,
      motiv: eroare instanceof Error ? eroare.message : "Eroare necunoscută.",
    };
  }
}

/**
 * Traduce refuzul Resend într-o propoziție din care se înțelege ce ai de făcut.
 *
 * Fără asta, în baza de date rămânea un `Resend a răspuns 403: {...}` pe care
 * trebuia să-l descifreze cineva. Păstrăm și textul brut la sfârșit - când
 * nimerește ceva ce nu știm, tot el e singurul indiciu.
 */
function explicaEroarea(status: number, corp: string): string {
  const jos = corp.toLowerCase();

  if (jos.includes("only send testing emails to your own")) {
    return (
      "Resend te lasă să trimiți doar către adresa cu care ți-ai făcut contul, " +
      "pentru că nu ai încă un domeniu verificat. Intră pe resend.com/domains, " +
      "verifică domeniul lucrării, apoi pune EMAIL_EXPEDITOR pe o adresă de pe " +
      "domeniul acela. " +
      brut(corp)
    );
  }
  if (status === 401 || status === 403) {
    if (jos.includes("api key")) {
      return (
        "Cheia RESEND_API_KEY e greșită sau a fost ștearsă din cont. " +
        "Fă alta pe resend.com și pune-o în variabilele de mediu. " +
        brut(corp)
      );
    }
    if (jos.includes("domain") && jos.includes("verif")) {
      return (
        "Domeniul din EMAIL_EXPEDITOR nu e verificat în Resend. Verifică-l pe " +
        "resend.com/domains - durează cât adaugi două-trei rânduri în DNS. " +
        brut(corp)
      );
    }
    return "Resend a refuzat cererea. " + brut(corp);
  }
  if (status === 422) {
    return (
      "Resend n-a acceptat adresele. De obicei EMAIL_EXPEDITOR e scris greșit: " +
      'trebuie să arate ca "Puls <puls@domeniul-tau.ro>" sau doar ' +
      "puls@domeniul-tau.ro. " +
      brut(corp)
    );
  }
  if (status === 429) {
    return "Prea multe email-uri într-un timp scurt. Mai încearcă peste un minut. " + brut(corp);
  }
  if (status >= 500) {
    return "Resend are o problemă la el. Notificarea rămâne netrimisă și pleacă la următoarea rulare. " + brut(corp);
  }
  return `Resend a răspuns ${status}. ` + brut(corp);
}

function brut(corp: string): string {
  const curat = corp.replace(/\s+/g, " ").trim();
  return curat ? `(Resend a zis: ${curat.slice(0, 200)})` : "";
}

/** Verificare simplă de adresă - cât să prindem greșelile de tastare. */
export function emailValid(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text);
}
