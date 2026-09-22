import "server-only";

import ExcelJS from "exceljs";

import { carteDinPortiune, type ZiPlan } from "@/lib/citire";
import { adaugaZile, esteDataValida } from "@/lib/util/date";
import { normalizeaza } from "@/lib/util/text";

/**
 * Citirea planului de citire dintr-un Excel.
 *
 * Planurile vin în două feluri, și le primim pe amândouă:
 *  - cu DATE: fiecare rând are ziua din calendar („01.10.2026 · Ioan 1");
 *  - cu ZILE NUMEROTATE: „Ziua 1 · Ioan 1", cum sunt planurile din aplicațiile
 *    de Biblie. Atunci se cere data la care începe ziua 1.
 *
 * Coloanele se recunosc după numele din primul rând, oricum ar fi scrise.
 * „Carte" e opțională: dacă lipsește, cartea se scoate din porțiune.
 */

const NUME_DATA = ["data", "ziua din calendar", "date"];
const NUME_ZIUA = ["ziua", "zi", "nr", "nr.", "day", "ziua planului"];
const NUME_PORTIUNE = [
  "portiune",
  "portiunea",
  "pasaj",
  "pasaje",
  "citire",
  "citirea",
  "de citit",
  "capitole",
  "reading",
];
const NUME_CARTE = ["carte", "cartea", "book"];

export type ProblemaPlan = { rand: number; mesaj: string };

export type AnalizaPlan = {
  eroare?: string;
  zile: ZiPlan[];
  probleme: ProblemaPlan[];
  /** Adevărat dacă fișierul avea zile numerotate, nu date. */
  cuZileNumerotate?: boolean;
};

function textDinCelula(valoare: ExcelJS.CellValue): string {
  if (valoare === null || valoare === undefined) return "";
  if (valoare instanceof Date) return valoare.toISOString().slice(0, 10);
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

/** „2026-10-01", „01.10.2026", „1/10/2026" sau o celulă-dată -> „2026-10-01". */
function dataDinText(text: string): string | null {
  const curat = text.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(curat)) {
    const d = curat.slice(0, 10);
    return esteDataValida(d) ? d : null;
  }
  const p = curat.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (p) {
    const d = `${p[3]}-${p[2].padStart(2, "0")}-${p[1].padStart(2, "0")}`;
    return esteDataValida(d) ? d : null;
  }
  return null;
}

function indiceColoana(antete: string[], nume: string[]): number {
  return antete.findIndex((a) => nume.includes(a));
}

/**
 * Citește fișierul și întoarce zilele planului, fără să scrie nimic.
 * `incepeLa` e necesar doar pentru planurile cu zile numerotate.
 */
export async function analizeazaPlan(
  continut: ArrayBuffer,
  incepeLa: string | null,
): Promise<AnalizaPlan> {
  const registru = new ExcelJS.Workbook();
  try {
    await registru.xlsx.load(continut);
  } catch {
    return {
      eroare: "N-am putut citi fișierul. Trebuie să fie un .xlsx (Excel).",
      zile: [],
      probleme: [],
    };
  }

  const foaie = registru.worksheets[0];
  if (!foaie) return { eroare: "Fișierul n-are nicio foaie.", zile: [], probleme: [] };

  const antete: string[] = [];
  foaie.getRow(1).eachCell({ includeEmpty: true }, (celula, coloana) => {
    antete[coloana - 1] = normalizeaza(textDinCelula(celula.value)).replace(/:$/, "");
  });

  const colData = indiceColoana(antete, NUME_DATA);
  const colZiua = indiceColoana(antete, NUME_ZIUA);
  const colPortiune = indiceColoana(antete, NUME_PORTIUNE);
  const colCarte = indiceColoana(antete, NUME_CARTE);

  if (colPortiune < 0) {
    return {
      eroare: "Nu găsesc coloana „Porțiune” în primul rând al fișierului.",
      zile: [],
      probleme: [],
    };
  }
  if (colData < 0 && colZiua < 0) {
    return {
      eroare: "Nu găsesc nici coloana „Data”, nici „Ziua”. Una dintre ele trebuie să fie.",
      zile: [],
      probleme: [],
    };
  }
  const cuZileNumerotate = colData < 0;
  if (cuZileNumerotate && !incepeLa) {
    return {
      eroare:
        "Planul are zile numerotate, nu date. Alege mai sus data la care începe ziua 1.",
      zile: [],
      probleme: [],
      cuZileNumerotate,
    };
  }

  const zile = new Map<string, ZiPlan & { rand: number }>();
  const probleme: ProblemaPlan[] = [];

  foaie.eachRow((rand, numar) => {
    if (numar === 1) return;
    const celula = (col: number) => (col < 0 ? "" : textDinCelula(rand.getCell(col + 1).value).trim());

    const portiune = celula(colPortiune).replace(/\s+/g, " ");
    const dataBruta = cuZileNumerotate ? celula(colZiua) : celula(colData);
    if (!portiune && !dataBruta) return; // rând gol

    let data: string | null;
    if (cuZileNumerotate) {
      const ziua = Number(dataBruta.replace(/[^0-9]/g, ""));
      data = Number.isInteger(ziua) && ziua >= 1 ? adaugaZile(incepeLa!, ziua - 1) : null;
      if (!data) {
        probleme.push({ rand: numar, mesaj: `nu înțeleg numărul zilei „${dataBruta}”` });
        return;
      }
    } else {
      data = dataDinText(dataBruta);
      if (!data) {
        probleme.push({ rand: numar, mesaj: `nu înțeleg data „${dataBruta}”` });
        return;
      }
    }

    // O zi fără porție e o zi liberă - pur și simplu nu intră în plan.
    if (!portiune || portiune === "-") return;
    if (portiune.length > 200) {
      probleme.push({ rand: numar, mesaj: "porțiunea e prea lungă" });
      return;
    }

    const existenta = zile.get(data);
    if (existenta) {
      probleme.push({
        rand: numar,
        mesaj: `ziua ${data} apare deja la rândul ${existenta.rand} - păstrez primul`,
      });
      return;
    }

    const carte = celula(colCarte) || carteDinPortiune(portiune);
    zile.set(data, { data, portiune, carte: carte.slice(0, 60), rand: numar });
  });

  const lista = [...zile.values()]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(({ data, portiune, carte }) => ({ data, portiune, carte }));

  if (lista.length === 0 && probleme.length === 0) {
    return { eroare: "N-am găsit nicio zi cu porție în fișier.", zile: [], probleme };
  }
  return { zile: lista, probleme, cuZileNumerotate };
}

/** Modelul de Excel pentru plan: coloanele, câteva rânduri de exemplu și explicații. */
export async function fisierModelPlan(): Promise<Buffer> {
  const registru = new ExcelJS.Workbook();
  registru.creator = "Puls · Grupe mici";

  const foaie = registru.addWorksheet("Plan");
  foaie.columns = [
    { header: "Data", key: "data", width: 14, style: { numFmt: "dd.mm.yyyy" } },
    { header: "Porțiune", key: "portiune", width: 30 },
    { header: "Carte", key: "carte", width: 18 },
  ];
  const exemple = [
    ["2026-10-01", "Ioan 1", ""],
    ["2026-10-02", "Ioan 2", ""],
    ["2026-10-03", "Ioan 3", ""],
    ["2026-10-05", "Ioan 4", ""],
  ];
  for (const [data, portiune, carte] of exemple) {
    const [an, luna, zi] = data.split("-").map(Number);
    foaie.addRow({ data: new Date(Date.UTC(an, luna - 1, zi)), portiune, carte });
  }
  const antet = foaie.getRow(1);
  antet.font = { bold: true, color: { argb: "FFFFFFFF" } };
  antet.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2B328D" } };
  });
  foaie.views = [{ state: "frozen", ySplit: 1 }];

  const despre = registru.addWorksheet("Cum se completează");
  despre.columns = [{ width: 100 }];
  for (const rand of [
    "Planul de citire a Bibliei - un rând pentru fiecare zi care are ceva de citit.",
    "",
    "Data - ziua din calendar. Se poate scrie ca dată Excel sau ca text: 01.10.2026.",
    "Porțiune - ce se citește în ziua aia, exact cum vreți să apară în aplicație (ex. Ioan 1-2).",
    "Carte - opțională. Dacă o lași goală, o scot din porțiune (din „1 Samuel 3” iese „1 Samuel”).",
    "",
    "Zilele libere (duminică, recuperare) nu se scriu deloc - în exemplul din prima foaie, 4 octombrie lipsește.",
    "",
    "Ai un plan cu zile numerotate (Ziua 1, Ziua 2...)? Pune coloana „Ziua” în loc de „Data”",
    "și alege în aplicație data la care începe ziua 1.",
    "",
    "Cartea contează pentru cine intră mai târziu: el începe de la începutul cărții la care e planul atunci.",
  ]) {
    despre.addRow([rand]);
  }
  despre.getRow(1).font = { bold: true, size: 13 };

  return Buffer.from(await registru.xlsx.writeBuffer());
}
