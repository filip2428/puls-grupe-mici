/**
 * `npm run formular -- "C:\...\PULS 2026-2027 (Responses).xlsx"`
 *
 * Ia răspunsurile formularului de înscriere (așa cum le scoate Google Forms)
 * și scrie din ele fișierul de import al pulsiștilor.
 *
 * De ce un script și nu copiere de mână: formularul rămâne deschis, deci
 * răspunsurile se tot adună. Rulezi asta din nou pe exportul proaspăt, iar
 * importul sare peste cine e deja în aplicație.
 *
 * Două lucruri nu se pot scoate din formular, așa că rămân rubrici goale:
 *  - GRUPA - formularul nu întreabă cine merge la care grupă. Nu e nevoie s-o
 *    completezi aici: importul primește și rânduri fără grupă, iar împărțirea
 *    se face în aplicație, la „Administrare · Nerepartizați", unde se văd
 *    clasele și vârstele deodată. Rândurile ies oricum sortate pe clasă și pe
 *    băieți/fete, dacă preferi s-o scrii totuși aici.
 *  - BOTEZUL - nici asta nu se întreabă.
 * Restul se scoate din răspunsuri și se curăță: nume scrise cu Caps Lock,
 * telefoane în șapte formate, aceeași biserică scrisă în trei feluri. Ce nu se
 * înțelege ajunge în coloana „De verificat", nu în baza de date.
 */
import { basename, dirname, resolve } from "node:path";

import ExcelJS from "exceljs";

import { COLOANE } from "../lib/import-coloane";
import { faraBiserica } from "../lib/util/biserica-text";
import { emailValid } from "../lib/util/email";

/* ------------------------------------------------------------------ *
 * Ajutoare
 * ------------------------------------------------------------------ */

/** Fără diacritice, fără spații în plus, litere mici. */
function normalizeaza(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function textDinCelula(valoare: ExcelJS.CellValue): string {
  if (valoare === null || valoare === undefined) return "";
  if (valoare instanceof Date) return valoare.toISOString().slice(0, 10);
  if (typeof valoare === "object") {
    if ("text" in valoare && typeof valoare.text === "string") return valoare.text;
    if ("richText" in valoare && Array.isArray(valoare.richText)) {
      return valoare.richText.map((r) => r.text).join("");
    }
    if ("result" in valoare) return String(valoare.result ?? "");
    return "";
  }
  return String(valoare);
}

/**
 * „BOLD" / „bătrâna " -> „Bold" / „Bătrâna"
 *
 * Unii completează formularul cu Caps Lock pornit. În listele din aplicație
 * numele acelea ar țipa, așa că le aducem la forma celorlalte.
 */
function numeFrumos(brut: string): string {
  return brut
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*-\s*/g, "-")
    .toLocaleLowerCase("ro-RO")
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_, inainte: string, litera: string) => inainte + litera.toLocaleUpperCase("ro-RO"),
    );
}

/**
 * Orice a scris omul în căsuța de telefon -> 07xxxxxxxx.
 *
 * În primele 52 de răspunsuri au ieșit șapte formate: cu prefix de țară, cu
 * paranteze, cu cratime, cu spații, unul fără zeroul de la început. Le aducem
 * la aceeași formă, altfel căutarea după număr nu găsește nimic.
 */
function telefonCurat(brut: string): { numar: string | null; nota?: string } {
  const text = brut.replace(/\s+/g, " ").trim();
  if (!text || text === "-") return { numar: null };

  let cifre = text.replace(/[^\d+]/g, "");
  if (cifre.startsWith("+40")) cifre = "0" + cifre.slice(3);
  else if (cifre.startsWith("0040")) cifre = "0" + cifre.slice(4);
  else if (cifre.startsWith("40") && cifre.length === 11) cifre = "0" + cifre.slice(2);
  else if (/^7\d{8}$/.test(cifre)) cifre = "0" + cifre;

  if (/^07\d{8}$/.test(cifre)) return { numar: cifre };
  return { numar: text, nota: `Telefonul „${text}" nu arată ca un număr de mobil.` };
}

/**
 * Ce a scris omul în căsuța de email -> o adresă sau nimic.
 *
 * În răspunsuri au apărut și „-", și o adresă cu o paranteză după ea („nu-l
 * prea folosește"), și una cu un spațiu înainte de „.com". Primele două se pot
 * salva; ce rămâne și tot nu seamănă a adresă se lasă gol - o adresă stricată e
 * mai rea decât una lipsă, că anunțul pleacă și nu-l primește nimeni.
 */
function emailCurat(brut: string): { adresa: string | null; nota?: string } {
  const text = brut.trim();
  if (!text || text === "-") return { adresa: null };

  const curat = text
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
  if (emailValid(curat)) return { adresa: curat.slice(0, 120) };
  return { adresa: null, nota: `Emailul „${text}" nu seamănă a adresă - l-am lăsat gol.` };
}

/**
 * Bisericile, scrise la fel de fiecare dată.
 *
 * „Metanoia" și „METANOIA ARAD" sunt o singură biserică; dacă intră așa cum
 * au fost scrise, în statistici ies două. Lista se completează când apare o
 * biserică nouă în formular: în stânga e ce scrie omul (fără diacritice, cu
 * litere mici), în dreapta numele pe care îl ținem noi.
 */
const BISERICI: { potriviri: string[]; nume: string; nota?: string }[] = [
  { potriviri: ["harvest", "harveat", "hervest", "harvset"], nume: "Harvest Arad" },
  { potriviri: ["metanoia"], nume: "Metanoia Arad" },
  { potriviri: ["adoram"], nume: "Adoram Arad" },
  { potriviri: ["betania"], nume: "Betania Arad" },
  { potriviri: ["victory"], nume: "Victory of Christ Arad" },
  { potriviri: ["elim"], nume: "Elim Curtici" },
  { potriviri: ["oastea domnului"], nume: "Oastea Domnului" },
];

/** Cuvintele prin care cineva spune, într-un formular, „nu ține de nicio biserică". */
const FARA_BISERICA = ["-", "--", "fara", "fara biserica", "niciuna", "nicio", "nu", "n/a"];

function bisericaCurata(brut: string): { nume: string; nota?: string } {
  const curat = normalizeaza(brut);
  if (!curat) return { nume: "" };
  if (FARA_BISERICA.includes(curat)) return { nume: "-" };

  /*
    „Ortodoxă", „Biserica catolică" - o denominațiune scrisă în locul unei
    biserici. Înseamnă, aproape întotdeauna, „am fost botezat acolo", nu „merg
    acolo duminica", deci trec la „fără biserică". Cine chiar ține de o parohie
    scrie parohia, iar aceea intră ca orice altă biserică.
  */
  if (faraBiserica(brut)) {
    const scris = brut.replace(/\s+/g, " ").trim();
    return {
      nume: "-",
      nota: `A scris „${scris}" - o denominațiune, nu o biserică anume, deci l-am trecut fără biserică. Dacă totuși ține de o parohie și e implicat acolo, scrie-o pe fișa lui.`,
    };
  }

  const stiuta = BISERICI.find((b) => b.potriviri.some((p) => curat.includes(p)));
  if (stiuta) return { nume: stiuta.nume, nota: stiuta.nota };

  const scris = brut.replace(/\s+/g, " ").trim();
  return {
    nume: scris,
    nota: `Biserică nouă: „${scris}". Verifică numele, apoi pune-i localitatea și denominațiunea în Administrare · Biserici.`,
  };
}

/**
 * Băiat sau fată, după prenume.
 *
 * Formularul nu întreabă, iar aplicația filtrează după asta. Ghicim din listă,
 * nu după cum se termină numele - „Iosua" și „Luca" ne-ar strica regula. Ce nu
 * e în listă rămâne gol și ajunge în „De verificat": mai bine o căsuță goală
 * decât o presupunere trecută ca fapt.
 */
const BAIETI = `abel adrian albert alex alexandru alin amos andrei anton aurel beniamin bogdan
calin catalin ciprian claudiu constantin cosmin cristi cristian damian dan daniel darius david
denis dorel dorin dragos eduard edward elias emanuel emil eusebiu fabian filip flavius florin
gabriel george gheorghe horia iacob ianis ilie ioan ion ionut iosif iosua isaac iulian iustin
jhonatan jonathan kevin liviu luca lucas marcel marcu marian marius mark matei mateo matias
mihai mircea moise natan natanael nelu nicolae noe oliver ovidiu patrick paul pavel petru radu
rares raul rawad robert roman samuel samuil sebastian serafino seth silviu simon sorin stefan
teodor tiberiu timotei tudor valentin vasile victor vlad vladimir`;

const FETE = `abbigail abi abigail ada adela adina adriana agnes alesia alessia alexandra alina
alisa amalia ana anca andreea anelisse aneta antonia ariana aurora aylin beatrice bianca camelia
carla carmen casandra catalina cezara clara claudia corina cristina dalia damaris dana daniela
daria debora delia denisa diana doina dorina doris elena eliana elisabeta elisabeth eliza ella
emanuela emma erika estera eva evelina fabiola flavia florina gabriela georgiana gloria hadina
iasmina ileana ilinca ioana iulia iuliana ivona joellin julia karina larisa laura lavinia lea
lidia ligia liliana lois loredana luiza magdalena maia mara maria mariana marta melania mihaela
miriam monica nadia natalia nicoleta noemi oana olivia otilia patricia paula petra rahela raisa
raluca rania rebeca rebecca roberta ruth salma samira sara sarah sefora sidonia silvia simona
sofia sonia sophia sophie stefania tabita teodora tiana timea valentina vanessa veronica
victoria viorica violeta`;

const DUPA_PRENUME = new Map<string, "băiat" | "fată">([
  ...BAIETI.split(/\s+/).map((n) => [n, "băiat"] as const),
  ...FETE.split(/\s+/).map((n) => [n, "fată"] as const),
]);

function sexDinPrenume(prenume: string): "băiat" | "fată" | null {
  for (const bucata of normalizeaza(prenume).split(/[\s-]+/)) {
    const gasit = DUPA_PRENUME.get(bucata);
    if (gasit) return gasit;
  }
  return null;
}

const CLASE_ROMANE: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
};

/** „Clasa a VIII-a", „a 8-a", „8" -> 8 */
function clasaDinText(text: string): number | null {
  const curat = normalizeaza(text).replace(/clasa/g, "").replace(/-a\b/g, "").trim();
  if (!curat) return null;

  const cifre = curat.replace(/[^0-9]/g, "");
  if (cifre && Number(cifre) >= 1 && Number(cifre) <= 13) return Number(cifre);

  const roman = curat.replace(/^a\s+/, "").replace(/[^ivx]/g, "");
  return CLASE_ROMANE[roman] ?? null;
}

/** Data din celulă (dată adevărată sau scrisă de om) -> AAAA-LL-ZZ. */
function dataCurata(valoare: ExcelJS.CellValue): string | null {
  if (valoare instanceof Date) return valoare.toISOString().slice(0, 10);
  const text = textDinCelula(valoare).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const potrivire = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!potrivire) return null;
  const [, zi, luna, an] = potrivire;
  return `${an}-${luna.padStart(2, "0")}-${zi.padStart(2, "0")}`;
}

/** „2013-06-12" -> o dată pe care Excel o înțelege, la miezul nopții UTC. */
function caData(zi: string): Date {
  const [an, luna, data] = zi.split("-").map(Number);
  return new Date(Date.UTC(an, luna - 1, data));
}

/* ------------------------------------------------------------------ *
 * Găsirea coloanelor în exportul din Google Forms
 * ------------------------------------------------------------------ */

/**
 * Întrebările din formular sunt propoziții întregi, nu titluri de coloană, și
 * se reformulează de la un an la altul. Așa că nu căutăm titluri exacte, ci
 * cuvintele care nu pot lipsi din întrebare.
 */
const INTREBARI = {
  nume: ["nume adolescent", "numele adolescent"],
  prenume: ["prenume adolescent", "prenumele adolescent"],
  dataNasterii: ["nasterii"],
  clasa: ["clasa"],
  telefon: ["telefon al adolescent", "telefonul adolescent"],
  email: ["email a adolescent", "email al adolescent", "emailul adolescent"],
  biserica: ["biserica din care face parte"],
  frecventa: ["frecventeaza"],
} as const;

type CheieIntrebare = keyof typeof INTREBARI;

/** Un părinte, așa cum stă în formular: patru coloane una după alta. */
type BlocParinte = {
  nume: number;
  prenume: number;
  relatie: number;
  telefon: number;
  email: number;
};

function gasesteColoane(antet: ExcelJS.Row) {
  const titluri = new Map<number, string>();
  antet.eachCell({ includeEmpty: false }, (celula, coloana) => {
    titluri.set(coloana, normalizeaza(textDinCelula(celula.value)));
  });

  const gasite = new Map<CheieIntrebare, number>();
  for (const [cheie, bucati] of Object.entries(INTREBARI) as [
    CheieIntrebare,
    readonly string[],
  ][]) {
    for (const [coloana, titlu] of titluri) {
      if (gasite.has(cheie)) break;
      if (bucati.some((b) => titlu.includes(b))) gasite.set(cheie, coloana);
    }
  }

  /*
    Părinții sunt altă poveste: cele două blocuri au aceleași titluri („Nume",
    „Prenume", „Număr de telefon"), deosebite doar de un spațiu sau de un „2"
    pus de Google. Ne agățăm de întrebarea care apare o dată în fiecare bloc -
    „Cine ești pentru adolescent?" - și luăm coloanele de lângă ea.
  */
  const parinti: BlocParinte[] = [];
  for (const [coloana, titlu] of titluri) {
    if (!titlu.startsWith("cine esti pentru adolescent")) continue;
    const bloc = {
      nume: coloana - 2,
      prenume: coloana - 1,
      relatie: coloana,
      telefon: coloana + 1,
      email: coloana + 2,
    };
    const arataBine =
      (titluri.get(bloc.nume) ?? "").includes("nume") &&
      (titluri.get(bloc.prenume) ?? "").includes("prenume") &&
      (titluri.get(bloc.telefon) ?? "").includes("telefon") &&
      (titluri.get(bloc.email) ?? "").includes("email");
    if (!arataBine) {
      console.warn(
        `  Atenție: coloanele părintelui din jurul coloanei ${coloana} nu arată cum mă așteptam. Verifică-le în fișierul scos.`,
      );
    }
    parinti.push(bloc);
  }

  return { gasite, parinti };
}

/* ------------------------------------------------------------------ *
 * Conversia
 * ------------------------------------------------------------------ */

type RandIesire = {
  /** Rândul din formular, ca să știi unde să te uiți dacă e ceva de lămurit. */
  randFormular: number;
  nume: string;
  clasa: number | null;
  sex: "băiat" | "fată" | null;
  dataNasterii: string | null;
  biserica: string;
  telefon: string | null;
  email: string | null;
  parinte1Nume: string | null;
  parinte1Telefon: string | null;
  parinte1Email: string | null;
  parinte2Nume: string | null;
  parinte2Telefon: string | null;
  parinte2Email: string | null;
  frecventa: string;
  note: string[];
};

/**
 * 1 septembrie al anului școlar în curs.
 *
 * Vârstele se socotesc de la ziua aceea, nu de la ziua de azi: altfel un
 * formular deschis în februarie ar spune că toți copiii sunt cu un an mai mari
 * decât clasa în care sunt.
 */
function inceputulAnuluiScolar(azi: Date): Date {
  const an = azi.getMonth() >= 7 ? azi.getFullYear() : azi.getFullYear() - 1;
  return new Date(Date.UTC(an, 8, 1));
}

async function main() {
  const cale = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!cale) {
    console.error(
      'Lipsește fișierul. Exemplu: npm run formular -- "C:\\Downloads\\PULS (Responses).xlsx"',
    );
    process.exit(1);
  }

  const intrare = resolve(cale);
  const registru = new ExcelJS.Workbook();
  await registru.xlsx.readFile(intrare);
  const foaie = registru.worksheets[0];
  if (!foaie || foaie.rowCount < 2) {
    console.error("Fișierul e gol sau n-are decât rândul cu întrebările.");
    process.exit(1);
  }

  const { gasite, parinti } = gasesteColoane(foaie.getRow(1));
  for (const cheie of ["nume", "prenume"] as const) {
    if (!gasite.has(cheie)) {
      console.error(
        `Nu găsesc în formular coloana cu ${cheie}le adolescentului. S-au schimbat întrebările?`,
      );
      process.exit(1);
    }
  }

  const text = (rand: ExcelJS.Row, cheie: CheieIntrebare): string => {
    const coloana = gasite.get(cheie);
    return coloana ? textDinCelula(rand.getCell(coloana).value).trim() : "";
  };

  const inceputAnul = inceputulAnuluiScolar(new Date());
  const randuri: RandIesire[] = [];
  const vazute = new Map<string, number>();

  for (let nrRand = 2; nrRand <= foaie.rowCount; nrRand++) {
    const rand = foaie.getRow(nrRand);
    const numeFamilie = text(rand, "nume");
    const prenume = text(rand, "prenume");
    if (!numeFamilie && !prenume) continue;

    const note: string[] = [];
    // În aplicație numele se scriu „Prenume Nume", ca într-o agendă de telefon.
    const nume = `${numeFrumos(prenume)} ${numeFrumos(numeFamilie)}`.trim();

    const primaData = vazute.get(normalizeaza(nume));
    if (primaData) {
      note.push(`Apare de două ori în formular (și pe rândul ${primaData}). Șterge un rând.`);
    } else {
      vazute.set(normalizeaza(nume), nrRand);
    }

    const clasa = clasaDinText(text(rand, "clasa"));
    if (!clasa) note.push("Nu se înțelege clasa.");

    const coloanaData = gasite.get("dataNasterii");
    const brutData = text(rand, "dataNasterii");
    const dataNasterii = coloanaData ? dataCurata(rand.getCell(coloanaData).value) : null;
    if (brutData && !dataNasterii) {
      note.push(`Data nașterii „${brutData}" nu se înțelege.`);
    } else if (dataNasterii && clasa) {
      /*
        Cea mai frecventă greșeală din formular e anul nașterii: cine completează
        de pe telefon nimerește alt an în calendarul care se deschide. Se prinde
        punând vârsta lângă clasă - un elev de clasa a VIII-a are 14 ani, nu 5.
      */
      const ani =
        (inceputAnul.getTime() - caData(dataNasterii).getTime()) /
        (365.2425 * 24 * 3600 * 1000);
      const asteptat = clasa + 6;
      if (ani < 0) {
        note.push(`Data nașterii e în viitor: ${dataNasterii}.`);
      } else if (Math.abs(ani - asteptat) > 1.5) {
        note.push(
          `Data nașterii pare greșită: ar avea ${Math.round(ani)} ani în clasa a ${clasa}-a, unde ceilalți au ${asteptat}.`,
        );
      }
    }

    const sex = sexDinPrenume(prenume);
    if (!sex) note.push("Nu-mi dau seama dacă e băiat sau fată - completează coloana Sex.");

    const biserica = bisericaCurata(text(rand, "biserica"));
    if (biserica.nota) note.push(biserica.nota);

    const telefon = telefonCurat(text(rand, "telefon"));
    if (telefon.nota) note.push(telefon.nota);

    const email = emailCurat(text(rand, "email"));
    if (email.nota) note.push(email.nota);

    /*
      Un părinte intră doar dacă are nume. Al doilea bloc din formular e des
      lăsat pe jumătate - un prenume și nimic altceva - iar un „părinte" fără
      nume întreg și fără telefon n-ajută la nimic pe fișă.
    */
    const contacte: {
      nume: string;
      numeGol: string;
      telefon: string | null;
      email: string | null;
    }[] = [];
    for (const bloc of parinti) {
      const numeP = numeFrumos(textDinCelula(rand.getCell(bloc.nume).value));
      const prenumeP = numeFrumos(textDinCelula(rand.getCell(bloc.prenume).value));
      const relatie = textDinCelula(rand.getCell(bloc.relatie).value).trim();
      const telefonP = telefonCurat(textDinCelula(rand.getCell(bloc.telefon).value));
      if (telefonP.nota) note.push(`Părinte: ${telefonP.nota}`);
      const emailP = emailCurat(textDinCelula(rand.getCell(bloc.email).value));
      if (emailP.nota) note.push(`Părinte: ${emailP.nota}`);

      const numeIntreg = `${prenumeP} ${numeP}`.replace(/\s+/g, " ").trim();
      if (!numeIntreg) continue;

      /*
        Al doilea bloc e des lăsat pe jumătate: numai un prenume, care e chiar
        prenumele mamei scris a doua oară. De-aia nu comparăm numele întregi, ci
        ne uităm dacă unul e bucată din celălalt.
      */
      const laFel = contacte.some(
        (c) =>
          normalizeaza(c.numeGol).includes(normalizeaza(numeIntreg)) ||
          normalizeaza(numeIntreg).includes(normalizeaza(c.numeGol)),
      );
      if (laFel && !telefonP.numar) {
        note.push(
          `Al doilea părinte are același nume ca primul („${numeIntreg}") și n-are telefon - în formular a rămas pe jumătate completat.`,
        );
        continue;
      }
      if (laFel) {
        note.push(`Cei doi părinți au același nume („${numeIntreg}"). Verifică-l pe al doilea.`);
      }
      if (!telefonP.numar && !emailP.adresa) {
        note.push(`${numeIntreg} n-are nici telefon, nici email în formular.`);
      }

      contacte.push({
        // „Mama, Patricia Bătrâna" - așa cum ai salva contactul în telefon.
        nume: relatie ? `${numeFrumos(relatie)}, ${numeIntreg}` : numeIntreg,
        numeGol: numeIntreg,
        telefon: telefonP.numar,
        email: emailP.adresa,
      });
    }

    if (telefon.numar && contacte.some((c) => c.telefon === telefon.numar)) {
      note.push(
        "Telefonul pulsistului e același cu al unui părinte - probabil n-are telefon al lui.",
      );
    }

    randuri.push({
      randFormular: nrRand,
      nume,
      clasa,
      sex,
      dataNasterii,
      biserica: biserica.nume,
      telefon: telefon.numar,
      email: email.adresa,
      parinte1Nume: contacte[0]?.nume ?? null,
      parinte1Telefon: contacte[0]?.telefon ?? null,
      parinte1Email: contacte[0]?.email ?? null,
      parinte2Nume: contacte[1]?.nume ?? null,
      parinte2Telefon: contacte[1]?.telefon ?? null,
      parinte2Email: contacte[1]?.email ?? null,
      frecventa: text(rand, "frecventa"),
      note,
    });
  }

  if (randuri.length === 0) {
    console.error("N-am găsit niciun răspuns completat în fișier.");
    process.exit(1);
  }

  /*
    Ordinea în care se completează grupa: pe clase, iar în clasă băieții
    separat de fete. Așa se poate selecta un bloc întreg și trage în jos.
  */
  randuri.sort(
    (a, b) =>
      (a.clasa ?? 99) - (b.clasa ?? 99) ||
      (a.sex ?? "z").localeCompare(b.sex ?? "z", "ro") ||
      a.nume.localeCompare(b.nume, "ro"),
  );

  const iesire = new ExcelJS.Workbook();
  iesire.creator = "Puls · grupe mici";
  iesire.created = new Date();
  scriePulsisti(iesire, randuri);
  scrieCeMaiTrebuie(iesire, randuri);

  const indiceIese = process.argv.indexOf("--iese");
  const numeIesire =
    indiceIese === -1
      ? resolve(dirname(intrare), "pulsisti-pentru-import.xlsx")
      : resolve(process.argv[indiceIese + 1]);
  await iesire.xlsx.writeFile(numeIesire);

  raporteaza(basename(intrare), numeIesire, randuri);
}

const ANTET_APLICATIE = "FFEEF1F7";
const ANTET_AJUTOR = "FFFBF0D9";
const DE_COMPLETAT = "FFFBEAE7";
const CHIHLIMBAR = "FF8A5B00";

function scriePulsisti(registru: ExcelJS.Workbook, randuri: RandIesire[]) {
  const foaie = registru.addWorksheet("Pulsiști");

  // Coloanele aplicației, în ordinea din model, plus două de care ea n-are nevoie.
  foaie.columns = [
    ...COLOANE.map((c) => ({
      header: c.titlu,
      key: c.cheie,
      width: Math.max(14, c.titlu.length + 4),
    })),
    { header: "Frecventează PULS", key: "frecventa", width: 18 },
    { header: "De verificat", key: "note", width: 70 },
  ];

  const antet = foaie.getRow(1);
  antet.font = { bold: true };
  for (let i = 1; i <= COLOANE.length + 2; i++) {
    // Ultimele două coloane sunt galbene, ca să se vadă că nu intră în aplicație.
    const culoare = i <= COLOANE.length ? ANTET_APLICATIE : ANTET_AJUTOR;
    antet.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: culoare } };
  }
  foaie.views = [{ state: "frozen", ySplit: 1 }];
  foaie.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLOANE.length + 2 },
  };

  for (const r of randuri) {
    const adaugat = foaie.addRow({
      nume: r.nume,
      grupa: "",
      statut: "membru",
      sex: r.sex ?? "",
      clasa: r.clasa ?? "",
      dataNasterii: r.dataNasterii ? caData(r.dataNasterii) : "",
      biserica: r.biserica,
      botez: "",
      botezatLa: "",
      telefon: r.telefon ?? "",
      email: r.email ?? "",
      parinte1Nume: r.parinte1Nume ?? "",
      parinte1Telefon: r.parinte1Telefon ?? "",
      parinte1Email: r.parinte1Email ?? "",
      parinte2Nume: r.parinte2Nume ?? "",
      parinte2Telefon: r.parinte2Telefon ?? "",
      parinte2Email: r.parinte2Email ?? "",
      frecventa: r.frecventa,
      note: r.note.join(" "),
    });

    adaugat.getCell("dataNasterii").numFmt = "dd.mm.yyyy";
    adaugat.getCell("note").alignment = { wrapText: true, vertical: "top" };
    if (r.note.length > 0) adaugat.getCell("note").font = { color: { argb: CHIHLIMBAR } };
    /*
      Grupa se poate lăsa goală - importul o primește așa - dar rămâne colorată:
      e singura coloană pe care formularul n-are de unde s-o știe, deci merită
      să se vadă că e o alegere, nu o scăpare.
    */
    adaugat.getCell("grupa").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: DE_COMPLETAT },
    };
  }
}

function scrieCeMaiTrebuie(registru: ExcelJS.Workbook, randuri: RandIesire[]) {
  const foaie = registru.addWorksheet("Ce mai trebuie");
  foaie.columns = [
    { header: "Pas", key: "pas", width: 6 },
    { header: "Ce faci", key: "ce", width: 100 },
  ];
  foaie.getRow(1).font = { bold: true };
  foaie.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: ANTET_APLICATIE },
  };

  const deVerificat = randuri.filter((r) => r.note.length > 0).length;
  const pasi = [
    `Coloana „Grupa" (cea roșiatică) se poate lăsa goală. Cine intră fără grupă așteaptă la Administrare · Nerepartizați, unde îi dai grupa pe blocuri - de obicei e mai ușor decât s-o scrii aici, rând cu rând.`,
    `Dacă vrei totuși s-o completezi aici: fă-ți întâi grupele în Administrare · Grupe și scrie numele exact. Rândurile sunt sortate pe clase și pe băieți/fete, deci se poate completa pe blocuri.`,
    deVerificat > 0
      ? `Uită-te la coloana „De verificat": ${deVerificat} rânduri au ceva de lămurit - mai ales ani de naștere care nu se potrivesc cu clasa.`
      : `Coloana „De verificat" e goală - n-am găsit nimic ciudat.`,
    `Cine a răspuns „Nu" la „frecventează PULS" e nou. Dacă vrei să intre ca musafir până e primit în grupă, schimbă-i „Statut" în musafir.`,
    `„Botez" și „Data botezului" nu se întreabă în formular. Le lași goale și le completezi pe fișe, sau le scrii aici dacă le știi.`,
    `Cine a scris în dreptul bisericii doar o denominațiune („Ortodoxă", „Catolică") e trecut fără biserică, iar rândul lui e însemnat la „De verificat". Dacă vreunul chiar ține de o parohie și e implicat acolo, scrie-o pe fișa lui după import.`,
    "Încarcă fișierul la Administrare · Import. Îți arată întâi ce urmează să intre; abia după ce confirmi se scrie ceva în baza de date.",
    "După import, treci prin Administrare · Biserici și pune localitatea și denominațiunea la bisericile nou apărute.",
    "Ultimele două coloane (cele galbene) sunt doar pentru tine - aplicația le ignoră.",
  ];

  for (const [i, ce] of pasi.entries()) {
    const rand = foaie.addRow({ pas: i + 1, ce });
    rand.getCell("ce").alignment = { wrapText: true, vertical: "top" };
  }
}

function raporteaza(numeIntrare: string, numeIesire: string, randuri: RandIesire[]) {
  const peClase = new Map<string, number>();
  for (const r of randuri) {
    const cheie = `clasa a ${r.clasa ?? "?"}-a, ${r.sex === "băiat" ? "băieți" : r.sex === "fată" ? "fete" : "sex nescris"}`;
    peClase.set(cheie, (peClase.get(cheie) ?? 0) + 1);
  }

  console.log("");
  console.log(`  ${numeIntrare}: ${randuri.length} pulsiști`);
  console.log(`  Scris în: ${numeIesire}`);
  console.log("");
  for (const [cheie, cati] of [...peClase].sort()) {
    console.log(`    ${cheie}: ${cati}`);
  }

  const deVerificat = randuri.filter((r) => r.note.length > 0);
  if (deVerificat.length > 0) {
    console.log("");
    console.log(`  De verificat (${deVerificat.length}):`);
    for (const r of deVerificat) {
      console.log(`    ${r.nume} - rândul ${r.randFormular} din formular`);
      for (const nota of r.note) console.log(`      · ${nota}`);
    }
  }

  console.log("");
  console.log("  Mai departe: încarcă fișierul la Administrare · Import. Grupa se poate");
  console.log(`  lăsa goală - o dai după aceea, la „Nerepartizați". Restul e scris în`);
  console.log(`  foaia „Ce mai trebuie".`);
  console.log("");
}

void main();
