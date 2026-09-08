/** Texte scurte, folosite peste tot în interfață. */

const ROMANE = [
  "",
  "I",
  "a II-a",
  "a III-a",
  "a IV-a",
  "a V-a",
  "a VI-a",
  "a VII-a",
  "a VIII-a",
  "a IX-a",
  "a X-a",
  "a XI-a",
  "a XII-a",
];

/** 9 -> "clasa a IX-a"; 13 -> "a terminat liceul" */
export function etichetaClasa(clasa: number | null): string {
  if (clasa === null) return "";
  if (clasa >= 13) return "după liceu";
  return `clasa ${ROMANE[clasa] ?? clasa}`;
}

/** Varianta scurtă, pentru liste înghesuite: 9 -> "cl. IX" */
export function etichetaClasaScurta(clasa: number | null): string {
  if (clasa === null) return "";
  if (clasa >= 13) return "după liceu";
  return `cl. ${ROMANE[clasa]?.replace("a ", "").replace("-a", "") ?? clasa}`;
}

/** Clasele care se pot alege în formulare. */
export const CLASE = [5, 6, 7, 8, 9, 10, 11, 12, 13];

export function etichetaSex(sex: "baiat" | "fata" | null): string {
  if (sex === "baiat") return "băiat";
  if (sex === "fata") return "fată";
  return "";
}

export function etichetaStatus(status: "membru" | "musafir"): string {
  return status === "musafir" ? "musafir" : "membru";
}

/** De unde vine pulsistul. Vezi coloana `biserica` din schemă. */
export type Biserica = "harvest" | "alta" | "fara";

/** Cele trei răspunsuri, în ordinea în care se aleg în formular. */
export const BISERICI: {
  valoare: Biserica;
  titlu: string;
  explicatie: string;
}[] = [
  { valoare: "harvest", titlu: "Harvest Arad", explicatie: "e de la noi" },
  { valoare: "alta", titlu: "Altă biserică", explicatie: "vine din altă parte" },
  { valoare: "fara", titlu: "Fără biserică", explicatie: "nu merge nicăieri" },
];

/**
 * Ce scrie pe insigna din liste.
 *
 * Când vine de la altă biserică și îi știm numele, îl scriem pe el - „Betel"
 * spune mai mult decât „altă biserică". Necompletat nu se ascunde: semnul de
 * întrebare e chiar lucrul care ne face să întrebăm.
 */
export function etichetaBiserica(
  biserica: Biserica | null,
  bisericaNume: string | null,
): string {
  if (biserica === "harvest") return "Harvest";
  if (biserica === "alta") return bisericaNume || "altă biserică";
  if (biserica === "fara") return "fără biserică";
  return "biserica ?";
}

/** Varianta lungă, pentru Excel: „altă biserică: Betel". */
export function bisericaPeLarg(
  biserica: Biserica | null,
  bisericaNume: string | null,
): string {
  if (biserica === "harvest") return "Harvest Arad";
  if (biserica === "alta") {
    return bisericaNume ? `altă biserică: ${bisericaNume}` : "altă biserică";
  }
  if (biserica === "fara") return "fără biserică";
  return "";
}
