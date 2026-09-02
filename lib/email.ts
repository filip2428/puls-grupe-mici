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
      return {
        trimis: false,
        motiv: `Resend a răspuns ${raspuns.status}: ${detaliu.slice(0, 200)}`,
      };
    }
    return { trimis: true };
  } catch (eroare) {
    return {
      trimis: false,
      motiv: eroare instanceof Error ? eroare.message : "Eroare necunoscută.",
    };
  }
}

/** Verificare simplă de adresă - cât să prindem greșelile de tastare. */
export function emailValid(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text);
}
