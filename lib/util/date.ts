/**
 * Lucrul cu datele calendaristice.
 *
 * Peste tot în aplicație o dată se scrie ca text "AAAA-LL-ZZ" (ex. 2026-09-04),
 * calculată după ora României, ca să nu apară surprize când serverul e în alt fus.
 */

const FUS = "Europe/Bucharest";

export const ZILE_SAPTAMANA = [
  "duminică",
  "luni",
  "marți",
  "miercuri",
  "joi",
  "vineri",
  "sâmbătă",
] as const;

const LUNI = [
  "ianuarie",
  "februarie",
  "martie",
  "aprilie",
  "mai",
  "iunie",
  "iulie",
  "august",
  "septembrie",
  "octombrie",
  "noiembrie",
  "decembrie",
] as const;

/** Data de azi, ora României, ca text "AAAA-LL-ZZ". */
export function dataAzi(): string {
  return dataDinMoment(new Date());
}

/** Transformă un moment în text "AAAA-LL-ZZ" după ora României. */
export function dataDinMoment(moment: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(moment);
  return p; // en-CA dă exact formatul AAAA-LL-ZZ
}

/** Verifică formatul "AAAA-LL-ZZ" și că data chiar există. */
export function esteDataValida(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [an, luna, zi] = text.split("-").map(Number);
  const d = new Date(Date.UTC(an, luna - 1, zi));
  return (
    d.getUTCFullYear() === an &&
    d.getUTCMonth() === luna - 1 &&
    d.getUTCDate() === zi
  );
}

/** Ziua săptămânii pentru o dată text (0 = duminică). */
export function ziSaptamanii(data: string): number {
  const [an, luna, zi] = data.split("-").map(Number);
  return new Date(Date.UTC(an, luna - 1, zi)).getUTCDay();
}

/** Adună (sau scade, cu număr negativ) zile la o dată text. */
export function adaugaZile(data: string, zile: number): string {
  const [an, luna, zi] = data.split("-").map(Number);
  const d = new Date(Date.UTC(an, luna - 1, zi + zile));
  return d.toISOString().slice(0, 10);
}

/** "2026-09-04" -> "vineri, 4 septembrie 2026" */
export function dataLunga(data: string): string {
  const [an, luna, zi] = data.split("-").map(Number);
  return `${ZILE_SAPTAMANA[ziSaptamanii(data)]}, ${zi} ${LUNI[luna - 1]} ${an}`;
}

/** "2026-09-04" -> "4 sep." */
export function dataScurta(data: string): string {
  const [, luna, zi] = data.split("-").map(Number);
  return `${zi} ${LUNI[luna - 1].slice(0, 3)}.`;
}

/** Formatează un moment (creat la, modificat la) pentru afișare. */
export function momentLizibil(moment: Date | null | undefined): string {
  if (!moment) return "-";
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: FUS,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(moment);
}

/** Vârsta în ani, dacă știm data nașterii. */
export function varsta(dataNasterii: string | null): number | null {
  if (!dataNasterii || !esteDataValida(dataNasterii)) return null;
  const azi = dataAzi();
  let ani = Number(azi.slice(0, 4)) - Number(dataNasterii.slice(0, 4));
  if (azi.slice(5) < dataNasterii.slice(5)) ani -= 1;
  return ani;
}

/* --------------------------------------------------- luni și grile de calendar */

/**
 * Zilele săptămânii, scurte, începând de LUNI.
 *
 * Calendarul începe săptămâna luni, nu duminica: așa arată calendarele în
 * România, și așa e citit fără efort. `ZILE_SAPTAMANA` de mai sus rămâne cu
 * duminica prima, pentru că acolo indicele vine din `Date.getUTCDay()`.
 */
export const ZILE_SCURTE = ["L", "Ma", "Mi", "J", "V", "S", "D"] as const;

/** Luna de acum, ora României, ca text "AAAA-LL". */
export function lunaAcum(): string {
  return dataAzi().slice(0, 7);
}

/** Verifică formatul "AAAA-LL" și că luna chiar există. */
export function esteLunaValida(text: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(text)) return false;
  const an = Number(text.slice(0, 4));
  const luna = Number(text.slice(5));
  return luna >= 1 && luna <= 12 && an >= 2000 && an <= 2100;
}

/** "2026-09" -> "septembrie 2026" */
export function lunaLizibila(luna: string): string {
  return `${LUNI[Number(luna.slice(5)) - 1]} ${luna.slice(0, 4)}`;
}

/** Luna dinainte sau de după ("2026-01" cu -1 dă "2025-12"). */
export function lunaMutata(luna: string, cu: number): string {
  const d = new Date(
    Date.UTC(Number(luna.slice(0, 4)), Number(luna.slice(5)) - 1 + cu, 1),
  );
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Câte zile are luna. */
export function zileInLuna(luna: string): number {
  const an = Number(luna.slice(0, 4));
  const l = Number(luna.slice(5));
  return new Date(Date.UTC(an, l, 0)).getUTCDate();
}

/**
 * Datele care umplu grila unei luni, în ordine, începând de luni.
 *
 * Conține și zilele vecine cu care se întregesc prima și ultima săptămână -
 * altfel grila ar avea colțuri rupte. Ies mereu 28, 35 sau 42 de zile.
 */
export function zileleGrilei(luna: string): string[] {
  const prima = `${luna}-01`;
  // ziSaptamanii dă 0 pentru duminică; noi începem săptămâna de luni.
  const decalaj = (ziSaptamanii(prima) + 6) % 7;
  const total = Math.ceil((decalaj + zileInLuna(luna)) / 7) * 7;
  const start = adaugaZile(prima, -decalaj);
  return Array.from({ length: total }, (_, i) => adaugaZile(start, i));
}
