import "server-only";

import ExcelJS from "exceljs";

import { esteDataValida } from "@/lib/util/date";

/**
 * Importul pulsiștilor dintr-un fișier Excel.
 *
 * Fișierul are o formă fixă (vezi `COLOANE`), pe care o poți lua gata făcută
 * de la butonul „Descarcă modelul". Ordinea coloanelor nu contează - ne uităm
 * după numele lor din primul rând - iar coloanele în plus sunt ignorate.
 *
 * Importul are două etape: întâi verificăm și îți arătăm ce urmează să intre
 * și ce n-a mers, abia apoi scriem în baza de date.
 */

export const COLOANE = [
  { cheie: "nume", titlu: "Nume", obligatoriu: true, exemplu: "Andrei Popa" },
  { cheie: "grupa", titlu: "Grupa", obligatoriu: true, exemplu: "Băieți 14-16" },
  { cheie: "statut", titlu: "Statut", obligatoriu: false, exemplu: "membru" },
  { cheie: "sex", titlu: "Sex", obligatoriu: false, exemplu: "băiat" },
  { cheie: "clasa", titlu: "Clasa", obligatoriu: false, exemplu: "9" },
  {
    cheie: "dataNasterii",
    titlu: "Data nașterii",
    obligatoriu: false,
    exemplu: "2011-04-23",
  },
  { cheie: "telefon", titlu: "Telefon", obligatoriu: false, exemplu: "0722000111" },
  { cheie: "parinte1Nume", titlu: "Părinte 1", obligatoriu: false, exemplu: "Maria Popa" },
  {
    cheie: "parinte1Telefon",
    titlu: "Telefon părinte 1",
    obligatoriu: false,
    exemplu: "0722000112",
  },
  { cheie: "parinte2Nume", titlu: "Părinte 2", obligatoriu: false, exemplu: "Ion Popa" },
  {
    cheie: "parinte2Telefon",
    titlu: "Telefon părinte 2",
    obligatoriu: false,
    exemplu: "0722000113",
  },
] as const;

type CheieColoana = (typeof COLOANE)[number]["cheie"];

export type RandPregatit = {
  /** Rândul din fișier, ca să știi unde să te uiți dacă e o problemă. */
  rand: number;
  nume: string;
  grupaId: number;
  grupaNume: string;
  status: "membru" | "musafir";
  sex: "baiat" | "fata" | null;
  clasa: number | null;
  dataNasterii: string | null;
  telefon: string | null;
  parinte1Nume: string | null;
  parinte1Telefon: string | null;
  parinte2Nume: string | null;
  parinte2Telefon: string | null;
};

export type ProblemaRand = { rand: number; nume: string; mesaj: string };

export type RezultatAnaliza = {
  eroare?: string;
  deImportat: RandPregatit[];
  /** Cei care există deja în aceeași grupă - îi sărim. */
  existenti: ProblemaRand[];
  probleme: ProblemaRand[];
};

/** Fără diacritice, fără spații în plus, litere mici. */
function normalizeaza(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

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

function sexDinText(text: string): "baiat" | "fata" | null {
  const curat = normalizeaza(text);
  if (!curat) return null;
  if (["baiat", "b", "m", "masculin", "băiat"].includes(curat)) return "baiat";
  if (["fata", "f", "feminin", "fată"].includes(curat)) return "fata";
  return null;
}

export type GrupaCunoscuta = { id: number; nume: string };

/**
 * Citește fișierul și verifică fiecare rând, fără să scrie nimic.
 * `existente` = numele pulsiștilor deja din baza de date, ca `grupaId|nume`.
 */
export async function analizeazaFisier(
  continut: ArrayBuffer,
  grupeCunoscute: GrupaCunoscuta[],
  existente: Set<string>,
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

  const deImportat: RandPregatit[] = [];
  const existenti: ProblemaRand[] = [];
  const probleme: ProblemaRand[] = [];
  const dejaInFisier = new Set<string>();

  const valoare = (rand: ExcelJS.Row, cheie: CheieColoana): string => {
    const pozitie = pozitii.get(cheie);
    if (!pozitie) return "";
    return textDinCelula(rand.getCell(pozitie).value).trim();
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

    const grupa = dupaNume.get(normalizeaza(numeGrupa));
    if (!grupa) {
      probleme.push({
        rand: nrRand,
        nume,
        mesaj: numeGrupa
          ? `Nu există o grupă numită „${numeGrupa}".`
          : "Grupa lipsește.",
      });
      continue;
    }

    const cheie = `${grupa.id}|${normalizeaza(nume)}`;
    if (existente.has(cheie)) {
      existenti.push({ rand: nrRand, nume, mesaj: `E deja în ${grupa.nume}.` });
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

    const statutText = normalizeaza(valoare(rand, "statut"));
    const status = statutText.startsWith("musafir") ? "musafir" : "membru";

    deImportat.push({
      rand: nrRand,
      nume,
      grupaId: grupa.id,
      grupaNume: grupa.nume,
      status,
      sex: sexDinText(valoare(rand, "sex")),
      clasa: clasaDinText(valoare(rand, "clasa")),
      dataNasterii,
      telefon: valoare(rand, "telefon") || null,
      parinte1Nume: valoare(rand, "parinte1Nume") || null,
      parinte1Telefon: valoare(rand, "parinte1Telefon") || null,
      parinte2Nume: valoare(rand, "parinte2Nume") || null,
      parinte2Telefon: valoare(rand, "parinte2Telefon") || null,
    });
  }

  if (deImportat.length === 0 && probleme.length === 0 && existenti.length === 0) {
    return {
      eroare: "N-am găsit niciun rând completat în fișier.",
      deImportat: [],
      existenti: [],
      probleme: [],
    };
  }

  return { deImportat, existenti, probleme };
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
    grupa: "Numele exact al unei grupe care există deja în aplicație.",
    statut: "membru sau musafir. Dacă lași gol, intră ca membru.",
    sex: "băiat sau fată (merge și B / F).",
    clasa: "Un număr de la 5 la 13, sau a IX-a. 13 înseamnă după liceu.",
    dataNasterii: "2011-04-23 sau 23.04.2011.",
    telefon: "Telefonul pulsistului.",
    parinte1Nume: "Cum îl salvezi în agendă, ex. mama, Maria.",
    parinte1Telefon: "Telefonul primului părinte.",
    parinte2Nume: "Al doilea părinte, dacă îl ai.",
    parinte2Telefon: "Telefonul celui de-al doilea părinte.",
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
