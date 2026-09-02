import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { lideri, type Lider } from "@/lib/db/schema";
import { cheieSemnatura } from "./secret";

/**
 * Sesiunile liderilor.
 *
 * După ce liderul introduce codul de acces o singură dată, primim un cookie
 * semnat (JWT) valabil 90 de zile. Cookie-ul e httpOnly, deci JavaScript-ul
 * din pagină nu îl poate citi, iar în producție merge doar pe https.
 *
 * Dacă adminul regenerează codul unui lider, `versiuneSesiuni` crește și
 * toate sesiunile vechi ale acelui lider devin invalide.
 */

const NUME_COOKIE = "puls_sesiune";
const DURATA_ZILE = 90;

type ContinutJwt = {
  sub: string;
  ver: number;
};

/** Creează cookie-ul de sesiune pentru un lider. */
export async function deschideSesiune(lider: Lider) {
  const token = await new SignJWT({ ver: lider.versiuneSesiuni })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(lider.id))
    .setIssuedAt()
    .setExpirationTime(`${DURATA_ZILE}d`)
    .sign(cheieSemnatura());

  const cookieStore = await cookies();
  cookieStore.set(NUME_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURATA_ZILE * 24 * 60 * 60,
  });
}

/** Șterge sesiunea (deconectare). */
export async function inchideSesiune() {
  const cookieStore = await cookies();
  cookieStore.delete(NUME_COOKIE);
}

/**
 * Liderul autentificat în cererea curentă, sau null.
 * `cache` face ca verificarea să se întâmple o singură dată per cerere.
 */
export const sesiuneCurenta = cache(async (): Promise<Lider | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(NUME_COOKIE)?.value;
  if (!token) return null;

  let continut: ContinutJwt;
  try {
    const { payload } = await jwtVerify<{ ver: number }>(
      token,
      cheieSemnatura(),
      { algorithms: ["HS256"] },
    );
    continut = { sub: String(payload.sub), ver: payload.ver };
  } catch {
    return null;
  }

  const id = Number(continut.sub);
  if (!Number.isInteger(id)) return null;

  const [lider] = await db.select().from(lideri).where(eq(lideri.id, id));
  if (!lider || !lider.activ) return null;
  if (lider.versiuneSesiuni !== continut.ver) return null;

  return lider;
});

/** Cere un lider autentificat; altfel trimite la pagina de intrare. */
export async function ceruteLider(): Promise<Lider> {
  const lider = await sesiuneCurenta();
  if (!lider) redirect("/intra");
  return lider;
}

/** Cere un administrator; altfel trimite înapoi la grupele lui. */
export async function ceruteAdmin(): Promise<Lider> {
  const lider = await ceruteLider();
  if (lider.rol !== "admin") redirect("/grupe");
  return lider;
}

/** Adresa IP a celui care face cererea (pentru limitarea încercărilor). */
export async function ipulCererii(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "necunoscut";
}
