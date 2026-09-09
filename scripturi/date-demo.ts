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
  biserici,
  echipeSlujire,
  evenimente,
  grupe,
  intalniri,
  lideri,
  lideriGrupe,
  membri,
  membriEchipe,
  prezente,
  prietenii,
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

/*
  Grupele se strâng toate în aceeași seară - cea trecută în calendar - dar
  fiecare în sala și la ora ei.
*/
const GRUPE = [
  { nume: "Băieți 14-16", oraIntalnire: "18:00", locatie: "Sala mică" },
  { nume: "Fete 14-16", oraIntalnire: "18:00", locatie: "Sala de sus" },
  { nume: "Băieți 17-19", oraIntalnire: "19:00", locatie: "Cafeneaua" },
  { nume: "Fete 17-19", oraIntalnire: "19:00", locatie: "Biblioteca" },
];

/** În ce zi a săptămânii e Pulsul: 5 = vineri. */
const ZIUA_PULSULUI = 5;

/** Bisericile din care mai vin pulsiști pe la noi. */
const ALTE_BISERICI = [
  { nume: "Betel", localitate: "Arad", denominatiune: "penticostală" },
  { nume: "Emanuel", localitate: "Arad", denominatiune: "baptistă" },
  { nume: "Speranța", localitate: "Vladimirescu", denominatiune: "penticostală" },
];

/**
 * De unde vine un pulsist, tras la sorți ca să semene cu realitatea: cei mai
 * mulți sunt de la noi, câțiva vin de la alte biserici, câțiva de nicăieri,
 * iar la câțiva n-a apucat nimeni să întrebe.
 */
function deUndeVine(idBiserici: number[]): {
  biserica: "harvest" | "alta" | "fara" | null;
  bisericaId: number | null;
} {
  const zar = Math.random();
  if (zar < 0.6) return { biserica: "harvest", bisericaId: null };
  if (zar < 0.82) return { biserica: "alta", bisericaId: alege(idBiserici) };
  if (zar < 0.93) return { biserica: "fara", bisericaId: null };
  return { biserica: null, bisericaId: null };
}

/**
 * Botezat sau nu, tot la sorți - cu destui la care nu s-a apucat nimeni.
 *
 * La unii botezați lăsăm data goală dinadins: așa arată realitatea, și așa se
 * vede că numărul de botezuri dintr-o perioadă e un minim, nu un total.
 */
function botezat(): {
  botez: "botezat" | "nebotezat" | null;
  botezatLa: string | null;
} {
  const zar = Math.random();
  if (zar < 0.35) {
    const cuData = Math.random() < 0.7;
    const an = 2024 + Math.floor(Math.random() * 3);
    const luna = String(4 + Math.floor(Math.random() * 6)).padStart(2, "0");
    const zi = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
    return { botez: "botezat", botezatLa: cuData ? `${an}-${luna}-${zi}` : null };
  }
  if (zar < 0.8) return { botez: "nebotezat", botezatLa: null };
  return { botez: null, botezatLa: null };
}

function alege<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

/** „Ana Popescu" -> „ana.popescu@exemplu.ro" - adrese care nu duc nicăieri. */
function adresa(nume: string): string {
  const curat = nume
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return `${curat}@exemplu.ro`;
}

/**
 * Un părinte întreg: nume, telefon, email.
 *
 * Cele trei se fac deodată, ca să nu iasă un telefon fără nume - fișele de
 * demonstrație trebuie să arate ca niște fișe adevărate.
 */
function unParinte(numar: 1 | 2, numeCopil: string) {
  const nume = `${alege(NUME_PARINTI)} ${numeCopil.split(" ")[1]}`;
  return {
    [`parinte${numar}Nume`]: nume,
    [`parinte${numar}Telefon`]: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
    [`parinte${numar}Email`]: adresa(nume),
  };
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

  // Bisericile din care ne mai vin pulsiști.
  const idBiserici: number[] = [];
  for (const b of ALTE_BISERICI) {
    const [creata] = await db
      .insert(biserici)
      .values(b)
      .returning({ id: biserici.id });
    idBiserici.push(creata.id);
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
          ...deUndeVine(idBiserici),
          ...botezat(),
          telefon: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
          // Nu toti adolescentii au email; parintii, aproape totdeauna.
          email: Math.random() < 0.6 ? adresa(persoana.nume) : null,
          dataNasterii: `${anNasterii}-0${1 + Math.floor(Math.random() * 9)}-1${Math.floor(Math.random() * 9)}`,
          ...unParinte(1, persoana.nume),
          ...(Math.random() < 0.6 ? unParinte(2, persoana.nume) : {}),
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
        ...deUndeVine(idBiserici),
        telefon: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      })
      .returning({ id: membri.id });
    musafiri.push(creat.id);
  }

  /*
    Câteva prietenii, ca să se vadă la ce folosesc: cele mai multe în aceeași
    grupă, dar și două peste grupe - tocmai felul de legătură pe care nu-l
    vezi din liste, dar de care ai nevoie când împarți camerele în tabără.
  */
  const legaturi: [number, number][] = [];
  for (const ids of membriPeGrupa.values()) {
    legaturi.push([ids[0], ids[1]], [ids[2], ids[3]]);
  }
  const primaGrupaIds = membriPeGrupa.get(idGrupe[0])!;
  const treiaGrupaIds = membriPeGrupa.get(idGrupe[2])!;
  legaturi.push(
    [primaGrupaIds[4], treiaGrupaIds[4]],
    [primaGrupaIds[5], treiaGrupaIds[5]],
  );

  for (const [unul, altul] of legaturi) {
    const [a, b] = unul < altul ? [unul, altul] : [altul, unul];
    await db
      .insert(prietenii)
      .values({ membruAId: a, membruBId: b, creatDeId: idLideri[0] });
  }

  // Calendarul: opt seri în urmă și încă patru înainte, în fiecare vineri.
  const azi = dataAzi();
  let prima = adaugaZile(azi, -8 * 7);
  while (ziSaptamanii(prima) !== ZIUA_PULSULUI) prima = adaugaZile(prima, 1);

  const seri: string[] = [];
  for (let zi = prima; zi <= adaugaZile(azi, 28); zi = adaugaZile(zi, 7)) {
    seri.push(zi);
  }

  for (const data of seri) {
    await db.insert(evenimente).values({
      data,
      titlu: "Puls de vineri",
      ora: "18:00",
      locatie: "Biserica",
      peGrupeMici: true,
      creatDeId: idLideri[0],
    });
  }

  // O seară în care stăm toți împreună: aici nu se ține prezența pe grupe,
  // deci nici notificarea de prezență lipsă n-are ce căuta.
  await db.insert(evenimente).values({
    data: adaugaZile(seri[seri.length - 1], -3),
    titlu: "Gamenight",
    ora: "19:00",
    locatie: "Sala mare",
    peGrupeMici: false,
    creatDeId: idLideri[0],
  });

  // Prezențe la serile care au trecut deja.
  const seriTrecute = seri.filter((zi) => zi < azi);
  for (const [index, grupaId] of idGrupe.entries()) {
    const idMembri = membriPeGrupa.get(grupaId)!;
    const liderId = idLideri[index];

    for (const data of seriTrecute) {
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
    if (m.grupaId === null) continue;
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
