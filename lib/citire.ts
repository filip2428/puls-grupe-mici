/**
 * Cititul Bibliei: regulile după care se socotește cât a citit cineva.
 *
 * Totul se măsoară în PORȚII, adică în zilele planului care au ceva de citit.
 * O zi fără porție (duminică, recuperare) nu se așteaptă de la nimeni.
 *
 *  - așteptate = porțiile planului de la ziua de start a omului până la ziua
 *    până la care liderul a completat cititul grupei (nu până azi: o
 *    săptămână încă nebifată nu înseamnă că n-a citit, ci că nu s-a întrebat);
 *  - citite = porțiile bifate în același interval;
 *  - în urmă = cât lipsește. Cine recuperează citește mai multe porții
 *    deodată, iar în urmă scade la loc.
 *
 * Fișierul nu atinge baza de date, ca să poată fi folosit oriunde.
 */
import { normalizeaza } from "@/lib/util/text";
import { adaugaZile, ziSaptamanii } from "@/lib/util/date";

/** Până la câte porții lipsă e „puțin în urmă"; peste, e „mult în urmă". */
export const PRAG_PUTIN_IN_URMA = 7;

export type StareCitire = "la_zi" | "putin" | "mult" | "necompletat";

export const ETICHETE_STARE: Record<StareCitire, string> = {
  la_zi: "la zi",
  putin: "puțin în urmă",
  mult: "mult în urmă",
  necompletat: "necompletat",
};

/** Clasele de culoare pentru fiecare stare, aceleași peste tot. */
export const CULORI_STARE: Record<StareCitire, string> = {
  la_zi: "bg-albastru text-white",
  putin: "bg-lime text-carbune",
  mult: "bg-red-100 text-red-800",
  necompletat: "bg-fundal text-cenusiu",
};

/**
 * Cartea din care e o porțiune: „1 Samuel 3-4" -> „1 Samuel",
 * „Ioan 1:1-18; Psalmi 2" -> „Ioan".
 *
 * Contează doar prima parte: planurile care amestecă mai multe cărți pe zi
 * au de obicei una „principală" pusă prima.
 */
export function carteDinPortiune(portiune: string): string {
  const prima = portiune.split(/[;,]/)[0].trim();
  const potrivire = prima.match(/^((?:[1-4]\s*)?[^\d]+)/);
  const carte = (potrivire ? potrivire[1] : prima).replace(/[\s.:-]+$/, "").trim();
  return carte || prima;
}

/** Aceeași carte, oricum ar fi scrisă („Faptele" / „faptele "). */
function aceeasiCarte(a: string, b: string): boolean {
  return normalizeaza(a) === normalizeaza(b);
}

export type ZiPlan = { data: string; portiune: string; carte: string };

/**
 * Ziua din care i se socotește cititul unui pulsist.
 *
 *  - dacă adminul a scris-o de mână, aceea;
 *  - dacă a intrat înainte să înceapă planul, ziua 1 a planului;
 *  - altfel, începutul cărții la care era planul când a intrat. Dacă
 *    voi sunteți la Ioan 18, el începe cu Ioan 1 - n-are sens să înceapă
 *    o carte de la mijloc, iar tot ce e înainte de Ioan nu i se cere.
 *
 * `plan` trebuie să fie în ordinea datelor. Întoarce null dacă planul e gol.
 */
export function ziuaDeStart(
  plan: ZiPlan[],
  intratLa: string,
  citireDeLa: string | null,
): string | null {
  if (plan.length === 0) return null;
  if (citireDeLa) return citireDeLa;
  if (intratLa <= plan[0].data) return plan[0].data;

  // Porția la care era planul când a intrat: ultima de până atunci inclusiv.
  let i = plan.findLastIndex((z) => z.data <= intratLa);
  if (i < 0) return plan[0].data;

  const carte = plan[i].carte;
  while (i > 0 && aceeasiCarte(plan[i - 1].carte, carte)) i--;
  return plan[i].data;
}

export type Avans = {
  /** De la ce zi i se socotește. */
  deLa: string | null;
  /** Până la ce zi s-a completat cititul la grupa lui (null = niciodată). */
  panaLa: string | null;
  asteptate: number;
  citite: number;
  inUrma: number;
  /** Cât la sută din porțiile așteptate a citit; null dacă nu s-a așteptat nimic încă. */
  procent: number | null;
  stare: StareCitire;
};

/** Starea după câte porții lipsesc. */
export function stareDupaRestanta(inUrma: number): StareCitire {
  if (inUrma <= 0) return "la_zi";
  if (inUrma <= PRAG_PUTIN_IN_URMA) return "putin";
  return "mult";
}

/**
 * Cât a citit un pulsist, până la o zi anume.
 *
 * `datePlan` sunt datele planului, în ordine; `citite` - zilele bifate.
 * Bifele de dinainte de start rămân în baza de date, dar nu se socotesc:
 * n-au fost cerute, deci nu sunt nici restanță, nici bonus.
 */
export function socotesteAvans(
  datePlan: string[],
  deLa: string | null,
  panaLa: string | null,
  citite: Set<string>,
): Avans {
  if (deLa === null || panaLa === null || panaLa < deLa) {
    return {
      deLa,
      panaLa,
      asteptate: 0,
      citite: 0,
      inUrma: 0,
      procent: null,
      stare: panaLa === null ? "necompletat" : "la_zi",
    };
  }

  let asteptate = 0;
  let bifate = 0;
  for (const d of datePlan) {
    if (d < deLa) continue;
    if (d > panaLa) break;
    asteptate++;
    if (citite.has(d)) bifate++;
  }

  const inUrma = Math.max(0, asteptate - bifate);
  return {
    deLa,
    panaLa,
    asteptate,
    citite: bifate,
    inUrma,
    procent: asteptate > 0 ? Math.round((bifate / asteptate) * 100) : null,
    stare: stareDupaRestanta(inUrma),
  };
}

/** Lunea săptămânii în care e o dată. */
export function luneaDin(data: string): string {
  return adaugaZile(data, -((ziSaptamanii(data) + 6) % 7));
}

/** Cele șapte zile ale săptămânii care începe lunea dată. */
export function zileleSaptamanii(luni: string): string[] {
  return Array.from({ length: 7 }, (_, i) => adaugaZile(luni, i));
}
