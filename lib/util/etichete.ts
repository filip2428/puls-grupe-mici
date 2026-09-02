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
