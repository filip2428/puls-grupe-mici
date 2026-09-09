/**
 * Compararea textelor scrise de oameni.
 *
 * Nimeni nu tastează la fel de două ori: „Ștefan Ioneț", „stefan ionet" și
 * „Ștefan  Ioneț" sunt același om, iar „Clasa a VII-a" e aceeași clasă
 * oriunde ar fi scrisă. Peste tot unde comparăm ce a scris cineva - la
 * import, la confirmarea unei ștergeri, la căutarea unui omonim - ne uităm
 * la intenție, nu la tastatură.
 */

/** „Ștefan  Ioneț" -> „stefan ionet" */
export function normalizeaza(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Același nume, oricum ar fi scris? Gol nu se potrivește cu nimic. */
export function acelasiNume(unul: string, altul: string): boolean {
  const a = normalizeaza(unul);
  return a !== "" && a === normalizeaza(altul);
}
