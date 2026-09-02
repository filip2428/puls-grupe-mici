import { NextResponse } from "next/server";

import { sesiuneCurenta } from "@/lib/auth/sesiune";
import { emailConfigurat } from "@/lib/email";
import {
  genereazaNotificari,
  trimiteNotificariNetrimise,
} from "@/lib/notificari";

/**
 * Generarea și trimiterea notificărilor.
 *
 * Rulează automat o dată pe zi (vezi `vercel.json`), dar poate fi pornită și
 * de un administrator din pagina de administrare - util ca să vezi imediat
 * dacă merge, fără să aștepți până mâine.
 *
 * Cererile automate se legitimează cu `CRON_SECRET`
 * (antetul `Authorization: Bearer ...`, cum îl trimite Vercel).
 */

export const dynamic = "force-dynamic";

async function areVoie(cerere: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const antet = cerere.headers.get("authorization");
    if (antet === `Bearer ${secret}`) return true;
  }
  const lider = await sesiuneCurenta();
  return lider?.rol === "admin";
}

async function ruleaza(cerere: Request) {
  if (!(await areVoie(cerere))) {
    return NextResponse.json({ eroare: "Nu ai acces." }, { status: 403 });
  }

  const generate = await genereazaNotificari();
  const trimise = await trimiteNotificariNetrimise();

  return NextResponse.json({
    generate,
    trimise,
    emailConfigurat: emailConfigurat(),
  });
}

export async function GET(cerere: Request) {
  return ruleaza(cerere);
}

export async function POST(cerere: Request) {
  return ruleaza(cerere);
}
