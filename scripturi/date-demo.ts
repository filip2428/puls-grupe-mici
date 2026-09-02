/**
 * `npm run date:demo`
 *
 * Umple baza de date locală cu date de test (lideri, grupe, pulsiști și
 * prezențe pe ultimele săptămâni), ca să poți vedea cum arată aplicația plină.
 *
 * NU rula scriptul ăsta pe baza de date reală.
 */
import { and, desc, eq } from "drizzle-orm";

import { genereazaCod, hashCod } from "../lib/auth/cod";
import { db } from "../lib/db";
import {
  echipeSlujire,
  grupe,
  intalniri,
  lideri,
  lideriGrupe,
  membri,
  membriEchipe,
  prezente,
  programariSlujire,
  type StarePrezenta,
} from "../lib/db/schema";
import { adaugaZile, dataAzi, ziSaptamanii } from "../lib/util/date";

type NumeDemo = { nume: string; sex: "baiat" | "fata" };

const NUME: NumeDemo[] = [
  { nume: "Andrei Munteanu", sex: "baiat" },
  { nume: "Maria Ilie", sex: "fata" },
  { nume: "David Pop", sex: "baiat" },
  { nume: "Rebeca Stan", sex: "fata" },
  { nume: "Timotei Roman", sex: "baiat" },
  { nume: "Estera Dinu", sex: "fata" },
  { nume: "Samuel Ivan", sex: "baiat" },
  { nume: "Debora Marin", sex: "fata" },
  { nume: "Iosif Toma", sex: "baiat" },
  { nume: "Ana Voicu", sex: "fata" },
  { nume: "Beniamin Radu", sex: "baiat" },
  { nume: "Priscila Neagu", sex: "fata" },
  { nume: "Daniel Cristea", sex: "baiat" },
  { nume: "Lidia Barbu", sex: "fata" },
  { nume: "Matei Suciu", sex: "baiat" },
  { nume: "Sara Enache", sex: "fata" },
  { nume: "Luca Preda", sex: "baiat" },
  { nume: "Rut Anghel", sex: "fata" },
  { nume: "Filip Dobre", sex: "baiat" },
  { nume: "Noemi Sava", sex: "fata" },
  { nume: "Petru Lazar", sex: "baiat" },
  { nume: "Hana Croitoru", sex: "fata" },
  { nume: "Marcu Antonescu", sex: "baiat" },
  { nume: "Tabita Vlad", sex: "fata" },
];

const NUME_PARINTI = ["Ioan", "Elena", "Vasile", "Ana", "Mihai", "Rodica"];

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
  for (const [index, grupaId] of idGrupe.entries()) {
    const ids: number[] = [];
    // Grupele 0 si 1 sunt de 14-16 ani, 2 si 3 de 17-19 ani.
    const clasaDeBaza = index < 2 ? 9 : 11;
    for (let i = 0; i < 6; i++) {
      const persoana = numeAmestecate[cursor++ % numeAmestecate.length];
      const clasa = clasaDeBaza + (i % 2);
      const anNasterii = 2026 - (6 + clasa);
      const [creat] = await db
        .insert(membri)
        .values({
          grupaId,
          nume: persoana.nume,
          sex: persoana.sex,
          clasa,
          status: "membru",
          telefon: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
          dataNasterii: `${anNasterii}-0${1 + Math.floor(Math.random() * 9)}-1${Math.floor(Math.random() * 9)}`,
          parinte1Nume: `${alege(NUME_PARINTI)} ${persoana.nume.split(" ")[1]}`,
          parinte1Telefon: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
          parinte2Nume:
            Math.random() < 0.6
              ? `${alege(NUME_PARINTI)} ${persoana.nume.split(" ")[1]}`
              : null,
          parinte2Telefon:
            Math.random() < 0.6
              ? `07${Math.floor(10000000 + Math.random() * 89999999)}`
              : null,
        })
        .returning({ id: membri.id });
      ids.push(creat.id);
    }
    membriPeGrupa.set(grupaId, ids);
  }

  // Doi musafiri, ca sa se vada diferenta fata de membri.
  const musafiri: number[] = [];
  for (const [index, grupaId] of idGrupe.slice(0, 2).entries()) {
    const [creat] = await db
      .insert(membri)
      .values({
        grupaId,
        nume: index === 0 ? "Vlad Ionescu" : "Alexandra Neamt",
        sex: index === 0 ? "baiat" : "fata",
        clasa: 10,
        status: "musafir",
        telefon: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      })
      .returning({ id: membri.id });
    musafiri.push(creat.id);
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

  // Musafirii au fost prezenti la ultima intalnire a grupei lor.
  for (const musafirId of musafiri) {
    const [m] = await db
      .select({ grupaId: membri.grupaId })
      .from(membri)
      .where(eq(membri.id, musafirId));
    const [ultima] = await db
      .select({ id: intalniri.id })
      .from(intalniri)
      .where(eq(intalniri.grupaId, m.grupaId))
      .orderBy(desc(intalniri.data))
      .limit(1);
    if (ultima) {
      await db
        .insert(prezente)
        .values({ intalnireId: ultima.id, membruId: musafirId, stare: "prezent" });
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

  // Echipe de slujire, cu câțiva pulsiști din grupe diferite în fiecare.
  const ECHIPE = [
    {
      nume: "Harvest Kids",
      descriere: "Lucrarea cu copiii, duminica dimineața",
      roluri: ["la grupa mică", "la joacă", "la povestire"],
    },
    {
      nume: "Cafenea",
      descriere: "Cafeneaua de la intrare, înainte și după program",
      roluri: ["la espressor", "la casă"],
    },
    {
      nume: "Laudă și închinare",
      descriere: "Trupa care conduce închinarea vineri seara",
      roluri: ["chitară", "voce", "tobe", "clape"],
    },
    {
      nume: "Media",
      descriere: "Sunet, proiecție și filmare",
      roluri: ["sunet", "proiecție", "cameră"],
    },
  ];

  const totiMembrii = [...membriPeGrupa.values()].flat();
  const idEchipe: number[] = [];
  let cursorEchipa = 0;
  for (const [index, e] of ECHIPE.entries()) {
    const [creata] = await db
      .insert(echipeSlujire)
      .values({
        nume: e.nume,
        descriere: e.descriere,
        responsabilId: idLideri[index],
      })
      .returning({ id: echipeSlujire.id });
    idEchipe.push(creata.id);

    for (const rol of e.roluri) {
      const membruId = totiMembrii[cursorEchipa++ % totiMembrii.length];
      await db
        .insert(membriEchipe)
        .values({ echipaId: creata.id, membruId, rol })
        .onConflictDoNothing();
    }
  }

  // Calendarul slujirilor: fiecare grupă are ceva în următoarele săptămâni.
  const SLUJIRI = [
    { titlu: "Protocol la slujba de duminică", ora: "09:30", locatie: "Intrarea principală" },
    { titlu: "Program de tineret", ora: "18:00", locatie: "Sala mare" },
    { titlu: "Curățenie la biserică", ora: "10:00", locatie: "Toată clădirea" },
    { titlu: "Vizită la azilul de bătrâni", ora: "16:00", locatie: "Azilul Sf. Maria" },
  ];
  for (const [index, grupaId] of idGrupe.entries()) {
    const s = SLUJIRI[index];
    await db.insert(programariSlujire).values({
      data: adaugaZile(azi, 4 + index * 7),
      titlu: s.titlu,
      ora: s.ora,
      locatie: s.locatie,
      grupaId,
      detalii: index === 0 ? "Venim cu 30 de minute înainte." : null,
    });
  }
  // Și o slujire a unei echipe, nu a unei grupe.
  await db.insert(programariSlujire).values({
    data: adaugaZile(azi, 9),
    titlu: "Laudă la seara de rugăciune",
    ora: "19:00",
    locatie: "Sala mare",
    echipaId: idEchipe[0],
  });

  console.log("\nDate de test create. Coduri de acces:\n");
  for (const linie of coduri) console.log("  " + linie);
  console.log("\nAdministratorul are codul primit la `npm run pregatire`.\n");
}

main().catch((eroare) => {
  console.error(eroare);
  process.exit(1);
});
