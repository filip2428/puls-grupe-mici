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
