import "server-only";

import ExcelJS from "exceljs";

/**
 * Cum arată fișierele Excel pe care le scoate aplicația.
 *
 * Un export nu e o groapă de date, e o foaie pe care cineva chiar o citește:
 * de obicei coordonatorul, pe laptop, căutând ceva anume. Deci antetul stă pe
 * loc când derulezi, coloanele au lățimea potrivită, datele sunt date
 * adevărate (se pot sorta și filtra pe interval), iar câteva coloane sunt
 * colorate ca să se vadă din fugă ce e bine și ce nu.
 *
 * Tot ce ține de aspect stă aici, ca ambele exporturi să arate la fel.
 */

/** Culorile lucrării, în forma cerută de Excel: AARRGGBB. */
const CULOARE = {
  albastru: "FF2B328D",
  alb: "FFFFFFFF",
  /** Dunga deschisă a rândurilor pare - ochiul nu sare de pe rând. */
  dunga: "FFF7F9FC",
  linie: "FFE3E7F2",
  cenusiu: "FF6B7280",
  verdeText: "FF1B6B33",
  verdeFundal: "FFE7F4EA",
  chihlimbarText: "FF8A5B00",
  chihlimbarFundal: "FFFBF0D9",
  rosuText: "FFA8291C",
  rosuFundal: "FFFBEAE7",
  limeText: "FF3F4A0B",
  limeFundal: "FFF1F6D4",
} as const;

/**
 * Tonul unei celule.
 *
 * „aparte" nu înseamnă nici bine, nici rău - doar altfel: musafirii, de
 * exemplu, care nu se numără la fel ca membrii.
 */
export type Ton = "bine" | "atentie" | "slab" | "stins" | "aparte";

const TONURI: Record<
  Ton,
  { text: string; fundal?: string; cursiv?: boolean }
> = {
  bine: { text: CULOARE.verdeText, fundal: CULOARE.verdeFundal },
  atentie: { text: CULOARE.chihlimbarText, fundal: CULOARE.chihlimbarFundal },
  slab: { text: CULOARE.rosuText, fundal: CULOARE.rosuFundal },
  aparte: { text: CULOARE.limeText, fundal: CULOARE.limeFundal },
  stins: { text: CULOARE.cenusiu, cursiv: true },
};

export type ColoanaExcel = {
  antet: string;
  cheie: string;
  latime: number;
  /**
   * "data" scrie o dată adevărată, nu text - altfel Excel n-ar ști s-o sorteze
   * și nici să filtreze „între 1 și 30 septembrie".
   */
  format?: "data" | "procent";
  /** Textul lung (note, subiecte) se rupe pe mai multe rânduri. */
  rupeTextul?: boolean;
  /** Ce ton capătă celula, după valoarea din ea. */
  ton?: (valoare: unknown) => Ton | null;
};

/** "2026-09-04" -> o dată pe care Excel o înțelege. Orice altceva rămâne cum e. */
function caData(valoare: unknown): Date | unknown {
  if (typeof valoare !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valoare)) {
    return valoare;
  }
  const [an, luna, zi] = valoare.split("-").map(Number);
  // Miezul nopții UTC: fără ore, Excel n-are cum s-o mute cu o zi.
  return new Date(Date.UTC(an, luna - 1, zi));
}

/** O foaie de date: antet albastru, rânduri în dungi, filtre și antet înghețat. */
export function adaugaFoaie(
  registru: ExcelJS.Workbook,
  optiuni: {
    nume: string;
    coloane: ColoanaExcel[];
    randuri: Record<string, unknown>[];
    /** Câte coloane din stânga rămân pe loc când derulezi la dreapta. */
    inghetate?: number;
  },
): ExcelJS.Worksheet {
  const { nume, coloane, randuri, inghetate = 0 } = optiuni;
  const foaie = registru.addWorksheet(nume);

  foaie.columns = coloane.map((c) => ({
    header: c.antet,
    key: c.cheie,
    width: c.latime,
    style: {
      numFmt:
        c.format === "data"
          ? "dd.mm.yyyy"
          : c.format === "procent"
            ? '0"%"'
            : undefined,
      alignment: { vertical: "top", wrapText: c.rupeTextul ?? false },
    },
  })) as ExcelJS.Column[];

  foaie.addRows(
    randuri.map((r) => {
      const iesire: Record<string, unknown> = {};
      for (const c of coloane) {
        const v = r[c.cheie];
        iesire[c.cheie] = c.format === "data" ? caData(v) : v;
      }
      return iesire;
    }),
  );

  // Antetul: albastru Puls, scris alb, mai înalt decât un rând obișnuit.
  const antet = foaie.getRow(1);
  antet.height = 24;
  antet.font = { bold: true, color: { argb: CULOARE.alb }, size: 11 };
  antet.alignment = { vertical: "middle", wrapText: true };
  antet.eachCell((celula) => {
    celula.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: CULOARE.albastru },
    };
  });

  const linie = {
    style: "thin" as const,
    color: { argb: CULOARE.linie },
  };

  for (let i = 0; i < randuri.length; i++) {
    const rand = foaie.getRow(i + 2);
    const inDunga = i % 2 === 1;

    coloane.forEach((c, indice) => {
      const celula = rand.getCell(indice + 1);
      celula.border = { bottom: linie };

      const ton = c.ton?.(randuri[i][c.cheie]) ?? null;
      const stil = ton ? TONURI[ton] : null;

      if (stil?.fundal) {
        celula.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: stil.fundal },
        };
      } else if (inDunga) {
        celula.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: CULOARE.dunga },
        };
      }

      if (stil) {
        celula.font = { color: { argb: stil.text }, italic: stil.cursiv };
      }
    });
  }

  foaie.views = [
    { state: "frozen", xSplit: inghetate, ySplit: 1 },
  ];
  if (randuri.length > 0) {
    foaie.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: coloane.length },
    };
  }

  return foaie;
}

/**
 * Foaia care spune ce e în fișier.
 *
 * Peste trei luni nimeni nu-și mai amintește dacă exportul ăla era pe toate
 * grupele sau doar pe una, și din ce perioadă. Scrie aici, o dată, ca să nu
 * fie nevoie de ghicit.
 */
export function adaugaFoaieDespre(
  registru: ExcelJS.Workbook,
  optiuni: {
    titlu: string;
    detalii: { eticheta: string; valoare: string }[];
    legenda?: { ton: Ton; text: string }[];
  },
) {
  const foaie = registru.addWorksheet("Ce e în fișier");
  foaie.columns = [
    { key: "a", width: 26 },
    { key: "b", width: 60 },
  ] as ExcelJS.Column[];

  const titlu = foaie.addRow([optiuni.titlu]);
  titlu.height = 26;
  titlu.getCell(1).font = {
    bold: true,
    size: 15,
    color: { argb: CULOARE.albastru },
  };

  foaie.addRow(["Puls · Grupe mici"]).getCell(1).font = {
    color: { argb: CULOARE.cenusiu },
  };
  foaie.addRow([]);

  for (const d of optiuni.detalii) {
    const rand = foaie.addRow([d.eticheta, d.valoare]);
    rand.getCell(1).font = { bold: true, color: { argb: CULOARE.cenusiu } };
  }

  if (optiuni.legenda?.length) {
    foaie.addRow([]);
    foaie.addRow(["Ce înseamnă culorile"]).getCell(1).font = {
      bold: true,
      color: { argb: CULOARE.albastru },
    };

    for (const l of optiuni.legenda) {
      const stil = TONURI[l.ton];
      const rand = foaie.addRow(["", l.text]);
      const proba = rand.getCell(1);
      if (stil.fundal) {
        proba.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: stil.fundal },
        };
      }
      proba.font = { color: { argb: stil.text }, italic: stil.cursiv };
      proba.value = "exemplu";
    }
  }

  return foaie;
}

/** Tonurile folosite în mai multe foi, ca să nu fie scrise de două ori. */
export const TON = {
  /** Prezent / a anunțat / absent. */
  stare(valoare: unknown): Ton | null {
    if (valoare === "prezent") return "bine";
    if (valoare === "a anunțat") return "atentie";
    if (valoare === "absent") return "slab";
    return null;
  },

  /** Procentul de prezență: peste 80 e bine, sub 50 e de căutat omul. */
  procent(valoare: unknown): Ton | null {
    if (typeof valoare !== "number") return null;
    if (valoare >= 80) return "bine";
    if (valoare >= 50) return "atentie";
    return "slab";
  },

  /** Musafirii nu sunt o problemă, sunt doar altceva decât membrii. */
  statut(valoare: unknown): Ton | null {
    return valoare === "musafir" ? "aparte" : null;
  },

  /** Cine nu mai vine rămâne în fișier, dar scris stins. */
  activ(valoare: unknown): Ton | null {
    return valoare === "nu" ? "stins" : null;
  },
} as const;
