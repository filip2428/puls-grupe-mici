import { SignJWT, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import {
  DURATA_ZILE,
  NUME_COOKIE,
  REINNOIESTE_DUPA_ZILE,
  optiuniCookie,
} from "@/lib/auth/cookie";

/**
 * Reînnoirea sesiunii.
 *
 * Înainte, cookie-ul se punea o singură dată, la intrare, cu 90 de zile. Un
 * lider care folosea aplicația în fiecare săptămână era totuși dat afară fix
 * la 90 de zile de la prima intrare, fără niciun motiv. Acum, dacă a trecut
 * mai mult de o săptămână de când a fost emis, îi punem unul proaspăt. Cine
 * intră măcar o dată la trei luni nu mai vede niciodată ecranul de intrare.
 *
 * Aici NU întrebăm baza de date, dinadins: proxy-ul rulează înaintea paginii
 * și trebuie să fie rapid. Nu e o scăpare de securitate - `sesiuneCurenta()`
 * verifică oricum la fiecare pagină dacă liderul mai e activ și dacă sesiunea
 * n-a fost invalidată. Un cookie proaspăt pentru un lider scos din lucrare
 * rămâne un cookie fără nicio putere.
 */
export async function proxy(request: NextRequest) {
  const raspuns = NextResponse.next();

  const token = request.cookies.get(NUME_COOKIE)?.value;
  if (!token) return raspuns;

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return raspuns;

  try {
    const cheie = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify<{ ver: number }>(token, cheie, {
      algorithms: ["HS256"],
    });

    const emisLa = payload.iat;
    if (typeof emisLa !== "number") return raspuns;

    const zileDeLaEmitere = (Date.now() / 1000 - emisLa) / (24 * 60 * 60);
    if (zileDeLaEmitere < REINNOIESTE_DUPA_ZILE) return raspuns;

    const proaspat = await new SignJWT({ ver: payload.ver })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(payload.sub))
      .setIssuedAt()
      .setExpirationTime(`${DURATA_ZILE}d`)
      .sign(cheie);

    raspuns.cookies.set(
      NUME_COOKIE,
      proaspat,
      optiuniCookie(process.env.NODE_ENV === "production"),
    );
  } catch {
    // Token stricat, expirat sau semnat cu alt secret: nu-l atingem.
    // Pagina va cere oricum autentificarea.
  }

  return raspuns;
}

export const config = {
  /*
    Doar paginile. Fișierele statice, imaginile, service worker-ul și rutele de
    api n-au nevoie de reînnoire, iar un `Set-Cookie` peste ele ar strica
    memorarea lor în browser.
  */
  matcher: [
    "/((?!api|_next/static|_next/image|manifest.webmanifest|.*\.(?:png|svg|ico|webmanifest)$).*)",
  ],
};
