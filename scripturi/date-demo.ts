/**
 * `npm run date:demo`
 *
 * Umple baza de date locală cu date de test (lideri, grupe, adolescenți și
 * prezențe pe ultimele săptămâni), ca să poți vedea cum arată aplicația plină.
 *
 * NU rula scriptul ăsta pe baza de date reală.
 */
import { and, eq } from "drizzle-orm";

import { genereazaCod, hashCod } from "../lib/auth/cod";
import { db } from "../lib/db";
import {
  grupe,
  intalniri,
  lideri,
  lideriGrupe,
  membri,
  prezente,
  type StarePrezenta,
} from "../lib/db/schema";
import { adaugaZile, dataAzi, ziSaptamanii } from "../lib/util/date";

const NUME = [
  "Andrei Munteanu", "Maria Ilie", "David Pop", "Rebeca Stan", "Timotei Roman",
  "Estera Dinu", "Samuel Ivan", "Debora Marin", "Iosif Toma", "Ana Voicu",
  "Beniamin Radu", "Priscila Neagu", "Daniel Cristea", "Lidia Barbu",
  "Matei Suciu", "Sara Enache", "Luca Preda", "Rut Anghel", "Filip Dobre",
  "Noemi Sava", "Petru Lazar", "Hana Croitoru", "Marcu Antonescu", "Tabita Vlad",
];

const LIDERI = [
  "Adi Bogdan", "Ovidiu Marcu", "Caleb Walker", "Ioana Predescu", "Sergiu Tanase",
];

const GRUPE = [
  { nume: "Băieți 14-16", ziIntalnire: 5, oraIntalnire: "18:00", locatie: "Sala mică" },
  { nume: "Fete 14-16", ziIntalnire: 5, oraIntalnire: "18:00", locatie: "Sala de sus" },
  { nume: "Băieți 17-19", ziIntalnire: 3, oraIntalnire: "19:00", locatie: "Cafeneaua" },
  { nume: "Fete 17-19", ziIntalnire: 3, oraIntalnire: "19:00", locatie: "Biblioteca" },
];

function alege<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

async function main() {
  const existente = await db.select({ id: grupe.id }).from(grupe);
  if (existente.length > 0) {
    console.error("Baza de date are deja grupe. Șterge local.db dacă vrei date noi de test.");
    process.exit(1);
  }

  const coduri: string[] = [];

  // Lideri
  const idLideri: number[] = [];
  for (const nume of LIDERI) {
    const cod = genereazaCod();
    const [creat] = await db
      .insert(lideri)
      .values({
        nume,
        rol: "lider",
        codPublic: cod.partePublica,
        codHash: await hashCod(cod.parteSecreta),
      })
      .returning({ id: lideri.id });
    idLideri.push(creat.id);
    coduri.push(`${nume.padEnd(18)} ${cod.codIntreg}`);
  }

  // Grupe + repartizare (primele două grupe au câte doi lideri)
  const idGrupe: number[] = [];
  for (const [index, g] of GRUPE.entries()) {
    const [creata] = await db.insert(grupe).values(g).returning({ id: grupe.id });
    idGrupe.push(creata.id);

    const aiGrupei = index < 2 ? [idLideri[index], idLideri[index + 3]] : [idLideri[index]];
    for (const liderId of aiGrupei) {
      await db.insert(lideriGrupe).values({ liderId, grupaId: creata.id });
    }
  }

  // Membri
  const numeAmestecate = [...NUME].sort(() => Math.random() - 0.5);
  const membriPeGrupa = new Map<number, number[]>();
  let cursor = 0;
  for (const grupaId of idGrupe) {
    const ids: number[] = [];
    for (let i = 0; i < 6; i++) {
      const nume = numeAmestecate[cursor++ % numeAmestecate.length];
      const [creat] = await db
        .insert(membri)
        .values({
          grupaId,
          nume,
          telefon: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
          dataNasterii: `${2007 + Math.floor(Math.random() * 5)}-0${1 + Math.floor(Math.random() * 9)}-1${Math.floor(Math.random() * 9)}`,
        })
        .returning({ id: membri.id });
      ids.push(creat.id);
    }
    membriPeGrupa.set(grupaId, ids);
  }

  // Prezențe pe ultimele 8 săptămâni
  const azi = dataAzi();
  for (const [index, grupaId] of idGrupe.entries()) {
    const ziua = GRUPE[index].ziIntalnire;
    const idMembri = membriPeGrupa.get(grupaId)!;
    const liderId = idLideri[index];

    for (let saptamana = 8; saptamana >= 1; saptamana--) {
      // Găsim ziua potrivită din săptămâna respectivă.
      let data = adaugaZile(azi, -saptamana * 7);
      while (ziSaptamanii(data) !== ziua) data = adaugaZile(data, 1);
      if (data > azi) continue;

      const [intalnire] = await db
        .insert(intalniri)
        .values({
          grupaId,
          data,
          marcatDeId: liderId,
          subiect: alege(["Rugăciunea", "Identitatea", "Prietenia", "Iertarea", "Slujirea"]),
          numarInvitati: Math.random() < 0.25 ? 1 : 0,
        })
        .returning({ id: intalniri.id });

      for (const membruId of idMembri) {
        const zar = Math.random();
        const stare: StarePrezenta =
          zar < 0.72 ? "prezent" : zar < 0.85 ? "motivat" : "absent";
        await db.insert(prezente).values({ intalnireId: intalnire.id, membruId, stare });
      }
    }
  }

  // Un membru care lipsește constant, ca să apară în alerte.
  const primaGrupa = idGrupe[0];
  const [disparut] = await db
    .select({ id: membri.id, nume: membri.nume })
    .from(membri)
    .where(eq(membri.grupaId, primaGrupa));
  const intalniriGrupa = await db
    .select({ id: intalniri.id })
    .from(intalniri)
    .where(eq(intalniri.grupaId, primaGrupa));
  for (const i of intalniriGrupa.slice(-3)) {
    await db
      .update(prezente)
      .set({ stare: "absent" })
      .where(and(eq(prezente.intalnireId, i.id), eq(prezente.membruId, disparut.id)));
  }
  console.log(`(${disparut.nume} are acum 3 absențe la rând, ca să vezi alertele)`);

  console.log("\nDate de test create. Coduri de acces:\n");
  for (const linie of coduri) console.log("  " + linie);
  console.log("\nAdministratorul are codul primit la `npm run pregatire`.\n");
}

main().catch((eroare) => {
  console.error(eroare);
  process.exit(1);
});
