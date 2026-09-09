import "server-only";

import ExcelJS from "exceljs";

import { COLOANE, type CheieColoana } from "@/lib/import-coloane";
import { faraBiserica } from "@/lib/util/biserica-text";
import { esteDataValida } from "@/lib/util/date";
import { emailValid } from "@/lib/util/email";
import { normalizeaza } from "@/lib/util/text";
import type { Biserica, Botez } from "@/lib/util/etichete";

/**
 * Importul pulsiștilor dintr-un fișier Excel.
 *
 * Fișierul are o formă fixă (vezi `COLOANE`), pe care o poți lua gata făcută
 * de la butonul „Descarcă modelul". Ordinea coloanelor nu contează - ne uităm
 * după numele lor din primul rând - iar coloanele în plus sunt ignorate.
 *
 * Singura coloană obligatorie e numele. Grupa se poate lăsa goală: omul intră
 * nerepartizat și i se dă grupa din aplicație, unde se văd clasele și vârstele
 * deodată - e mai ușor decât ghicită rând cu rând într-un tabel.
 *
 * Importul are două etape: întâi verificăm și îți arătăm ce urmează să intre
 * și ce n-a mers, abia apoi scriem în baza de date.
 */

export { COLOANE };

export type RandPregatit = {
  /** Rândul din fișier, ca să știi unde să te uiți dacă e o problemă. */
  rand: number;
  nume: string;
  /** Gol dacă rândul n-a spus în ce grupă merge. */
  grupaId: number | null;
  grupaNume: string | null;
  status: "membru" | "musafir";
  sex: "baiat" | "fata" | null;
  clasa: number | null;
  dataNasterii: string | null;
  biserica: Biserica | null;
  bisericaNume: string | null;
  botez: Botez | null;
  botezatLa: string | null;
  telefon: string | null;
  email: string | null;
  parinte1Nume: string | null;
  parinte1Telefon: string | null;
  parinte1Email: string | null;
  parinte2Nume: string | null;
  parinte2Telefon: string | null;
  parinte2Email: string | null;
};

export type ProblemaRand = { rand: number; nume: string; mesaj: string };

export type RezultatAnaliza = {
  eroare?: string;
  deImportat: RandPregatit[];
  /** Cei care există deja în aceeași grupă - îi sărim. */
  existenti: ProblemaRand[];
  probleme: ProblemaRand[];
};

/** Textul dintr-o celulă, oricum ar fi fost scris acolo. */
function textDinCelula(valoare: ExcelJS.CellValue): string {
  if (valoare === null || valoare === undefined) return "";
  if (valoare instanceof Date) return dataDinValoare(valoare) ?? "";
  if (typeof valoare === "object") {
    if ("text" in valoare && typeof valoare.text === "string") return valoare.text;
    if ("result" in valoare) return String(valoare.result ?? "");
    if ("richText" in valoare && Array.isArray(valoare.richText)) {
      return valoare.richText.map((r) => r.text).join("");
    }
    return "";
  }
  return String(valoare);
}

/** Data nașterii, din celulă-dată sau din text scris de om. */
function dataDinValoare(valoare: unknown): string | null {
  if (valoare instanceof Date) {
    // Excel ține datele la miezul nopții UTC; le luăm ca atare.
    return valoare.toISOString().slice(0, 10);
  }
  const text = String(valoare ?? "").trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const curat = text.slice(0, 10);
    return esteDataValida(curat) ? curat : null;
  }

  // 23.04.2011 / 23-04-2011 / 23/04/2011
  const potrivire = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (potrivire) {
    const [, zi, luna, an] = potrivire;
    const curat = `${an}-${luna.padStart(2, "0")}-${zi.padStart(2, "0")}`;
    return esteDataValida(curat) ? curat : null;
  }

  return null;
}

const CLASE_ROMANE: Record<string, number> = {
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
};

/** "9", "a IX-a", "clasa 9" -> 9 */
function clasaDinText(text: string): number | null {
  const curat = normalizeaza(text).replace(/clasa/g, "").replace(/-a\b/g, "").trim();
  if (!curat) return null;

  const numar = Number(curat.replace(/[^0-9]/g, ""));
  if (numar >= 1 && numar <= 13) return numar;

  const roman = curat.replace(/^a\s+/, "").replace(/[^ivx]/g, "");
  return CLASE_ROMANE[roman] ?? null;
}

/**
 * „Harvest Arad", „Betel", „-", „Ortodoxă" -> de unde vine.
 *
 * Un fișier scris de om n-are trei căsuțe de bifat: unii scriu numele
 * bisericii, alții o liniuță, alții nimic. Luăm ce e scris - ce seamănă a
 * Harvest e de la noi, ce spune „fără" (sau doar o denominațiune, vezi
 * `faraBiserica`) e fără, iar orice alt nume e altă biserică, cu numele
 * păstrat exact cum a fost scris.
 */
function bisericaDinText(text: string): {
  biserica: Biserica | null;
  bisericaNume: string | null;
} {
  const curat = normalizeaza(text);
  if (!curat) return { biserica: null, bisericaNume: null };
  if (curat.includes("harvest")) return { biserica: "harvest", bisericaNume: null };
  if (faraBiserica(text)) return { biserica: "fara", bisericaNume: null };
  return { biserica: "alta", bisericaNume: text.trim().slice(0, 80) };
}

/**
 * „botezat", „da", „nu" -> dacă e botezat.
 *
 * Într-un tabel scris de om, coloana asta e de obicei un da/nu. Ce nu se
 * înțelege rămâne nescris - mai bine o întrebare nepusă decât un răspuns
 * inventat.
 */
const BOTEZAT = ["botezat", "botezata", "da", "d", "x", "y", "yes", "true", "1"];
const NEBOTEZAT = ["nebotezat", "nebotezata", "nu", "n", "-", "no", "false", "0"];

function botezDinText(text: string): Botez | null {
  const curat = normalizeaza(text);
  if (!curat) return null;
  if (BOTEZAT.includes(curat)) return "botezat";
  if (NEBOTEZAT.includes(curat)) return "nebotezat";
  return null;
}

function sexDinText(text: string): "baiat" | "fata" | null {
  const curat = normalizeaza(text);
  if (!curat) return null;
  if (["baiat", "b", "m", "masculin", "băiat"].includes(curat)) return "baiat";
  if (["fata", "f", "feminin", "fată"].includes(curat)) return "fata";
  return null;
}

export type GrupaCunoscuta = { id: number; nume: string };

/** Un pulsist care e deja în aplicație, cu grupa lui (dacă are). */
export type PulsistExistent = { nume: string; grupaNume: string | null };

/**
 * Citește fișierul și verifică fiecare rând, fără să scrie nimic.
 *
 * Cine e deja în aplicație se sare, iar potrivirea se face DUPA NUME, oriunde
 * ar fi el. Motivul: același export de formular se încarcă de mai multe ori
 * peste vară, iar cei din prima tură au primit între timp o grupă - o
 * potrivire pe „nume + grupă" nu i-ar mai recunoaște și i-ar dubla. Doi oameni
 * cu același nume sunt rari; un pulsist dublat e o pacoste sigură.
 */
export async function analizeazaFisier(
  continut: ArrayBuffer,
  grupeCunoscute: GrupaCunoscuta[],
  existenti: PulsistExistent[],
): Promise<RezultatAnaliza> {
  const registru = new ExcelJS.Workbook();
  try {
    await registru.xlsx.load(continut);
  } catch {
    return {
      eroare: "N-am putut citi fișierul. Trebuie să fie un .xlsx (Excel).",
      deImportat: [],
      existenti: [],
      probleme: [],
    };
  }

  const foaie = registru.worksheets[0];
  if (!foaie || foaie.rowCount < 2) {
    return {
      eroare: "Fișierul e gol sau nu are decât rândul cu titluri.",
      deImportat: [],
      existenti: [],
      probleme: [],
    };
  }

  // Găsim coloanele după titlurile din primul rând.
  const pozitii = new Map<CheieColoana, number>();
  foaie.getRow(1).eachCell((celula, coloana) => {
    const titlu = normalizeaza(textDinCelula(celula.value));
    const potrivita = COLOANE.find((c) => normalizeaza(c.titlu) === titlu);
    if (potrivita) pozitii.set(potrivita.cheie, coloana);
  });

  const lipsa = COLOANE.filter((c) => c.obligatoriu && !pozitii.has(c.cheie));
  if (lipsa.length > 0) {
    return {
      eroare: `Lipsesc coloanele: ${lipsa.map((c) => c.titlu).join(", ")}. Descarcă modelul și completează-l.`,
      deImportat: [],
      existenti: [],
      probleme: [],
    };
  }

  const dupaNume = new Map(
    grupeCunoscute.map((g) => [normalizeaza(g.nume), g] as const),
  );
  const existente = new Map(
    existenti.map((m) => [normalizeaza(m.nume), m.grupaNume] as const),
  );

  const deImportat: RandPregatit[] = [];
  const gasitiDeja: ProblemaRand[] = [];
  const probleme: ProblemaRand[] = [];
  const dejaInFisier = new Set<string>();

  const valoare = (rand: ExcelJS.Row, cheie: CheieColoana): string => {
    const pozitie = pozitii.get(cheie);
    if (!pozitie) return "";
    return textDinCelula(rand.getCell(pozitie).value).trim();
  };

  /*
    Adresele nu opresc importul dacă sunt scrise greșit: se folosesc doar la
    anunțuri, iar o adresă stricată se vede oricum la prima trimitere. Un „-"
    sau un „nu are" ar intra altfel ca adresă, așa că le lăsăm goale.
  */
  const adresa = (rand: ExcelJS.Row, cheie: CheieColoana): string | null => {
    const scris = valoare(rand, cheie).toLowerCase();
    return scris && emailValid(scris) ? scris.slice(0, 120) : null;
  };

  for (let nrRand = 2; nrRand <= foaie.rowCount; nrRand++) {
    const rand = foaie.getRow(nrRand);
    const nume = valoare(rand, "nume").replace(/\s+/g, " ");
    const numeGrupa = valoare(rand, "grupa");

    if (!nume && !numeGrupa) continue; // rând gol

    if (nume.length < 2) {
      probleme.push({ rand: nrRand, nume: nume || "(fără nume)", mesaj: "Numele lipsește." });
      continue;
    }

    /*
      Grupa e opțională, dar dacă e scrisă trebuie să existe: o grupă scrisă
      greșit nu e același lucru cu o grupă nescrisă, și n-ar fi cinstit să luăm
      un „Băieți 14-16 " tastat aiurea drept „hotărăște tu mai târziu".
    */
    let grupa: GrupaCunoscuta | null = null;
    if (numeGrupa) {
      grupa = dupaNume.get(normalizeaza(numeGrupa)) ?? null;
      if (!grupa) {
        probleme.push({
          rand: nrRand,
          nume,
          mesaj: `Nu există o grupă numită „${numeGrupa}".`,
        });
        continue;
      }
    }

    const cheie = normalizeaza(nume);
    const unde = existente.get(cheie);
    if (unde !== undefined) {
      gasitiDeja.push({
        rand: nrRand,
        nume,
        mesaj: unde ? `E deja în ${unde}.` : "E deja în aplicație, fără grupă.",
      });
      continue;
    }
    if (dejaInFisier.has(cheie)) {
      probleme.push({ rand: nrRand, nume, mesaj: "Apare de două ori în fișier." });
      continue;
    }
    dejaInFisier.add(cheie);

    const textData = valoare(rand, "dataNasterii");
    const dataNasterii = textData ? dataDinValoare(rand.getCell(pozitii.get("dataNasterii")!).value) : null;
    if (textData && !dataNasterii) {
      probleme.push({
        rand: nrRand,
        nume,
        mesaj: `Data nașterii „${textData}" nu se înțelege. Scrie-o ca 2011-04-23.`,
      });
      continue;
    }

    /*
      Data botezului nu oprește importul dacă nu se înțelege: e un amănunt,
      spre deosebire de data nașterii, care se folosește peste tot. O lăsăm
      goală și mergem mai departe - se poate scrie oricând de pe fișă.
    */
    const botez = botezDinText(valoare(rand, "botez"));
    const botezatLa =
      botez === "botezat" && valoare(rand, "botezatLa")
        ? dataDinValoare(rand.getCell(pozitii.get("botezatLa")!).value)
        : null;

    const statutText = normalizeaza(valoare(rand, "statut"));
    const status = statutText.startsWith("musafir") ? "musafir" : "membru";
    const biserica = bisericaDinText(valoare(rand, "biserica"));

    deImportat.push({
      rand: nrRand,
      nume,
      grupaId: grupa?.id ?? null,
      grupaNume: grupa?.nume ?? null,
      status,
      sex: sexDinText(valoare(rand, "sex")),
      clasa: clasaDinText(valoare(rand, "clasa")),
      dataNasterii,
      biserica: biserica.biserica,
      bisericaNume: biserica.bisericaNume,
      botez,
      botezatLa,
      telefon: valoare(rand, "telefon") || null,
      email: adresa(rand, "email"),
      parinte1Nume: valoare(rand, "parinte1Nume") || null,
      parinte1Telefon: valoare(rand, "parinte1Telefon") || null,
      parinte1Email: adresa(rand, "parinte1Email"),
      parinte2Nume: valoare(rand, "parinte2Nume") || null,
      parinte2Telefon: valoare(rand, "parinte2Telefon") || null,
      parinte2Email: adresa(rand, "parinte2Email"),
    });
  }

  if (deImportat.length === 0 && probleme.length === 0 && gasitiDeja.length === 0) {
    return {
      eroare: "N-am găsit niciun rând completat în fișier.",
      deImportat: [],
      existenti: [],
      probleme: [],
    };
  }

  return { deImportat, existenti: gasitiDeja, probleme };
}

/** Fișierul-model, cu titlurile potrivite și un rând de exemplu. */
export async function fisierModel(grupe: GrupaCunoscuta[]): Promise<Buffer> {
  const registru = new ExcelJS.Workbook();
  registru.creator = "Puls · grupe mici";

  const foaie = registru.addWorksheet("Pulsiști");
  foaie.columns = COLOANE.map((c) => ({
    header: c.titlu,
    key: c.cheie,
    width: Math.max(14, c.titlu.length + 4),
  }));
  foaie.getRow(1).font = { bold: true };
  foaie.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEEF1F7" },
  };

  const exemplu: Record<string, string> = {};
  for (const c of COLOANE) exemplu[c.cheie] = c.exemplu;
  if (grupe.length > 0) exemplu.grupa = grupe[0].nume;
  foaie.addRow(exemplu);
  foaie.getRow(2).font = { italic: true, color: { argb: "FF6B7280" } };

  const ajutor = registru.addWorksheet("Cum se completează");
  ajutor.columns = [
    { header: "Coloană", key: "coloana", width: 22 },
    { header: "Obligatorie", key: "obligatorie", width: 14 },
    { header: "Ce se scrie acolo", key: "explicatie", width: 60 },
  ];
  ajutor.getRow(1).font = { bold: true };

  const explicatii: Record<CheieColoana, string> = {
    nume: "Numele și prenumele, ca în catalog.",
    grupa:
      "Numele exact al unei grupe din aplicație. Se poate lăsa gol: intră nerepartizat și îi dai grupa din Administrare · Nerepartizați.",
    statut: "membru sau musafir. Dacă lași gol, intră ca membru.",
    sex: "băiat sau fată (merge și B / F).",
    clasa: "Un număr de la 5 la 13, sau a IX-a. 13 înseamnă după liceu.",
    dataNasterii: "2011-04-23 sau 23.04.2011.",
    biserica:
      "De unde vine: Harvest (Arad) pentru ai noștri, numele bisericii pentru ceilalți, o liniuță dacă nu ține de nicio biserică.",
    botez: "botezat sau nebotezat (merge și da / nu). Gol = nu știm încă.",
    botezatLa: "Când s-a botezat, dacă știi: 2024-05-12. Se ia doar la botezat.",
    telefon: "Telefonul pulsistului.",
    email: "Adresa lui de email, pentru anunțuri. Ce nu e o adresă se lasă goală.",
    parinte1Nume: "Cum îl salvezi în agendă, ex. mama, Maria.",
    parinte1Telefon: "Telefonul primului părinte.",
    parinte1Email: "Adresa lui de email - de multe ori singura cale bună pentru un anunț lung.",
    parinte2Nume: "Al doilea părinte, dacă îl ai.",
    parinte2Telefon: "Telefonul celui de-al doilea părinte.",
    parinte2Email: "Adresa celui de-al doilea părinte.",
  };

  for (const c of COLOANE) {
    ajutor.addRow({
      coloana: c.titlu,
      obligatorie: c.obligatoriu ? "da" : "nu",
      explicatie: explicatii[c.cheie],
    });
  }

  if (grupe.length > 0) {
    ajutor.addRow({});
    ajutor.addRow({ coloana: "Grupele existente", obligatorie: "", explicatie: "" });
    ajutor.lastRow!.font = { bold: true };
    for (const g of grupe) {
      ajutor.addRow({ coloana: g.nume, obligatorie: "", explicatie: "" });
    }
  }

  const date = await registru.xlsx.writeBuffer();
  return Buffer.from(date);
}
