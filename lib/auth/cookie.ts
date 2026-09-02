/**
 * Ce știu despre cookie-ul de sesiune și `lib/auth/sesiune.ts`, și `proxy.ts`.
 *
 * Stau separat, fără `server-only` și fără nicio legătură cu baza de date,
 * pentru că `proxy.ts` rulează la marginea rețelei, unde driverul de bază de
 * date nu există. Dacă pui aici ceva care importă `@/lib/db`, proxy-ul crapă.
 */

export const NUME_COOKIE = "puls_sesiune";

/** Cât ține o sesiune, din clipa în care a fost emisă sau reînnoită. */
export const DURATA_ZILE = 90;

/**
 * După câte zile de la emitere merită reînnoit cookie-ul.
 *
 * Nu-l reînnoim la fiecare cerere: semnarea costă, iar un antet `Set-Cookie`
 * pe fiecare răspuns strică memorarea paginilor. O dată pe săptămână e destul
 * ca un lider care intră chiar și rar să nu ajungă niciodată la 90 de zile.
 */
export const REINNOIESTE_DUPA_ZILE = 7;

/** Opțiunile cookie-ului. Trebuie să fie identice peste tot, altfel se dublează. */
export function optiuniCookie(inProductie: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: inProductie,
    path: "/",
    maxAge: DURATA_ZILE * 24 * 60 * 60,
  };
}
