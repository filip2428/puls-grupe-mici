/**
 * Ce înseamnă, într-un tabel scris de om, răspunsul din căsuța „biserica".
 *
 * Stă aici, nu în import, ca să-l poată folosi și convertorul de formulare din
 * `scripturi/` - acela nu poate atinge codul de server.
 */

/** Fără diacritice, fără spații în plus, litere mici. */
function normalizeaza(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Cuvintele prin care cineva spune, într-un tabel, „nu ține de nicio biserică". */
const FARA_BISERICA = ["fara", "fara biserica", "niciuna", "nicio", "nu", "-", "--", "n/a"];

/**
 * Denominațiunile, scrise în locul unei biserici.
 *
 * Cine răspunde „ortodoxă" sau „catolică" spune de fapt în ce a fost botezat,
 * nu unde merge duminica - de obicei nu merge nicăieri. Îi trecem la „fără
 * biserică", pentru că altfel ar apărea în statistici o „Biserică Ortodoxă"
 * care nu e nicăieri o biserică anume.
 *
 * Cine chiar ține de o parohie și e implicat acolo scrie parohia, iar aceea
 * intră ca orice altă biserică. Cazul se rezolvă atunci pe fișa lui.
 */
const DENOMINATIUNI = [
  "ortodox",
  "ortodoxa",
  "crestin ortodox",
  "crestina ortodoxa",
  "catolic",
  "catolica",
  "romano catolica",
  "romano-catolica",
  "greco catolica",
  "greco-catolica",
  "penticostal",
  "penticostala",
  "baptist",
  "baptista",
  "adventist",
  "adventista",
  "crestin dupa evanghelie",
  "crestina dupa evanghelie",
  "evanghelic",
  "evanghelica",
  "reformata",
  "luterana",
  "protestant",
  "protestanta",
  "neoprotestanta",
];

/**
 * „-", „niciuna", „Ortodoxă", „Biserica catolică" -> nu ține de nicio biserică.
 *
 * Numele de biserică trece neatins: „Biserica Penticostală Betania Arad" e o
 * biserică anume, chiar dacă are denominațiunea în nume. De-aia denominațiunea
 * se caută pe tot răspunsul, după ce i-am scos „biserica" din față, nu ca
 * bucată oriunde în text.
 */
export function faraBiserica(brut: string): boolean {
  const curat = normalizeaza(brut);
  if (!curat) return false;
  if (FARA_BISERICA.includes(curat)) return true;

  const fondul = curat.replace(/^biserica\s+/, "").replace(/^bis\.?\s+/, "");
  return DENOMINATIUNI.includes(fondul);
}
