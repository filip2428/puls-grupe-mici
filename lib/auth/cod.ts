import {
  randomBytes,
  randomInt,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * Codurile de acces ale liderilor.
 *
 * Un cod arată așa:  7QF4-M2KPX9
 *                    └┬─┘ └──┬──┘
 *                     │      └── partea SECRETĂ (6 caractere) - se salvează doar hash-uită
 *                     └───────── partea PUBLICĂ (4 caractere) - identifică liderul în baza de date
 *
 * Partea secretă are 32^6 ≈ 1 miliard de variante. Împreună cu limitarea
 * încercărilor (vezi lib/auth/limitare.ts), un bot nu are cum să o ghicească.
 *
 * Alfabetul nu conține 0, 1, I, O - ca să nu existe confuzii când liderul
 * citește codul de pe hârtie sau de pe telefon.
 */
const ALFABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LUNGIME_PUBLICA = 4;
const LUNGIME_SECRETA = 6;

/** scrypt cu promisiuni (varianta cu opțiuni, pe care promisify o pierde). */
function scryptAsync(
  parola: string,
  sare: Buffer,
  lungime: number,
  optiuni: ScryptOptions,
): Promise<Buffer> {
  return new Promise((rezolva, respinge) => {
    scrypt(parola, sare, lungime, optiuni, (eroare, cheie) => {
      if (eroare) respinge(eroare);
      else rezolva(cheie as Buffer);
    });
  });
}

function sirAleator(lungime: number): string {
  let rezultat = "";
  for (let i = 0; i < lungime; i++) {
    rezultat += ALFABET[randomInt(ALFABET.length)];
  }
  return rezultat;
}

export type CodGenerat = {
  /** Codul complet, cu liniuță - singura dată când există în clar. */
  codIntreg: string;
  partePublica: string;
  parteSecreta: string;
};

/** Generează un cod nou de acces. */
export function genereazaCod(): CodGenerat {
  const partePublica = sirAleator(LUNGIME_PUBLICA);
  const parteSecreta = sirAleator(LUNGIME_SECRETA);
  return {
    partePublica,
    parteSecreta,
    codIntreg: `${partePublica}-${parteSecreta}`,
  };
}

/** Scoate spațiile, liniuțele și literele mici dintr-un cod scris de om. */
export function normalizeazaCod(text: string): string {
  return text
    .toUpperCase()
    .split("")
    .filter((c) => ALFABET.includes(c))
    .join("");
}

/**
 * Desparte codul scris de utilizator în partea publică și cea secretă.
 * Întoarce null dacă nu are lungimea corectă.
 */
export function despartCod(
  text: string,
): { partePublica: string; parteSecreta: string } | null {
  const curat = normalizeazaCod(text);
  if (curat.length !== LUNGIME_PUBLICA + LUNGIME_SECRETA) return null;
  return {
    partePublica: curat.slice(0, LUNGIME_PUBLICA),
    parteSecreta: curat.slice(LUNGIME_PUBLICA),
  };
}

/** Afișează codul frumos: 7QF4M2KPX9 -> 7QF4-M2KPX9 */
export function formateazaCod(partePublica: string, parteSecreta: string) {
  return `${partePublica}-${parteSecreta}`;
}

const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const LUNGIME_HASH = 32;

/** Transformă partea secretă în hash (scrypt). Formatul: scrypt$N$r$p$sare$hash */
export async function hashCod(parteSecreta: string): Promise<string> {
  const sare = randomBytes(16);
  const hash = await scryptAsync(parteSecreta, sare, LUNGIME_HASH, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_r,
    SCRYPT_p,
    sare.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/** Verifică partea secretă față de hash-ul salvat, în timp constant. */
export async function verificaCod(
  parteSecreta: string,
  hashSalvat: string,
): Promise<boolean> {
  const parti = hashSalvat.split("$");
  if (parti.length !== 6 || parti[0] !== "scrypt") return false;
  const [, n, r, p, sareB64, hashB64] = parti;
  const sare = Buffer.from(sareB64, "base64");
  const asteptat = Buffer.from(hashB64, "base64");
  try {
    const calculat = await scryptAsync(parteSecreta, sare, asteptat.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return timingSafeEqual(calculat, asteptat);
  } catch {
    return false;
  }
}
