import "server-only";

import { asc, eq } from "drizzle-orm";

import { genereazaCod, hashCod } from "@/lib/auth/cod";
import { db } from "@/lib/db";
import { grupe, lideri, lideriGrupe } from "@/lib/db/schema";

/** Găsește o parte publică de cod care nu e deja folosită. */
async function codUnic() {
  for (let incercare = 0; incercare < 25; incercare++) {
    const cod = genereazaCod();
    const [existent] = await db
      .select({ id: lideri.id })
      .from(lideri)
      .where(eq(lideri.codPublic, cod.partePublica));
    if (!existent) return cod;
  }
  throw new Error("Nu am reușit să generez un cod unic.");
}

/** Creează un lider și întoarce codul lui (singura dată când e vizibil). */
export async function creeazaLiderCuCod(date: {
  nume: string;
  rol: "admin" | "lider";
  telefon: string | null;
}) {
  const cod = await codUnic();
  const [creat] = await db
    .insert(lideri)
    .values({
      nume: date.nume,
      rol: date.rol,
      telefon: date.telefon,
      codPublic: cod.partePublica,
      codHash: await hashCod(cod.parteSecreta),
    })
    .returning({ id: lideri.id });
  return { id: creat.id, cod: cod.codIntreg };
}

/** Generează un cod nou pentru un lider și îi închide sesiunile vechi. */
export async function regenereazaCodLider(liderId: number) {
  const [lider] = await db.select().from(lideri).where(eq(lideri.id, liderId));
  if (!lider) return null;

  const cod = await codUnic();
  await db
    .update(lideri)
    .set({
      codPublic: cod.partePublica,
      codHash: await hashCod(cod.parteSecreta),
      versiuneSesiuni: lider.versiuneSesiuni + 1,
    })
    .where(eq(lideri.id, liderId));

  return { nume: lider.nume, cod: cod.codIntreg };
}

export type LiderCuGrupe = {
  id: number;
  nume: string;
  telefon: string | null;
  rol: "admin" | "lider";
  activ: boolean;
  ultimaAutentificare: Date | null;
  grupe: { id: number; nume: string }[];
};

/** Toți liderii, cu grupele la care sunt repartizați. */
export async function listaLideri(): Promise<LiderCuGrupe[]> {
  const toti = await db.select().from(lideri).orderBy(asc(lideri.nume));

  const legaturi = await db
    .select({
      liderId: lideriGrupe.liderId,
      grupaId: grupe.id,
      grupaNume: grupe.nume,
    })
    .from(lideriGrupe)
    .innerJoin(grupe, eq(grupe.id, lideriGrupe.grupaId));

  const peLider = new Map<number, { id: number; nume: string }[]>();
  for (const l of legaturi) {
    const lista = peLider.get(l.liderId) ?? [];
    lista.push({ id: l.grupaId, nume: l.grupaNume });
    peLider.set(l.liderId, lista);
  }

  return toti.map((l) => ({
    id: l.id,
    nume: l.nume,
    telefon: l.telefon,
    rol: l.rol,
    activ: l.activ,
    ultimaAutentificare: l.ultimaAutentificare,
    grupe: peLider.get(l.id) ?? [],
  }));
}

/** Toate grupele, pentru listele de selecție. */
export async function toateGrupele() {
  return db
    .select({ id: grupe.id, nume: grupe.nume, activa: grupe.activa })
    .from(grupe)
    .orderBy(asc(grupe.nume));
}
