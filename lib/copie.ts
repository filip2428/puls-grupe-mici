import "server-only";

import type { InStatement } from "@libsql/client";
import { and, desc, eq, gte, like } from "drizzle-orm";
import { gunzipSync, gzipSync } from "node:zlib";

import { db } from "@/lib/db";
import { audit, lideri } from "@/lib/db/schema";
import { emailActiv, trimiteEmail } from "@/lib/email";
import { dataAzi, dataNumerica, momentLizibil } from "@/lib/util/date";

/**
 * Copia de siguranță a bazei de date.
 *
 * Copia e un singur fișier `.json.gz`: toate tabelele, rând cu rând, exact
 * cum sunt în baza de date, comprimate. Nu depinde de Turso sau de vreun
 * serviciu anume - se poate ține pe un laptop, într-un email, pe un stick.
 *
 * La restaurare se golește tot și se pune la loc ce e în copie. O copie mai
 * veche decât aplicația merge și ea: coloanele adăugate între timp primesc
 * valoarea lor implicită, iar tabelele noi rămân goale.
 */

const APLICATIA = "puls-grupe-mici";
const VERSIUNE = 1;

/** Tabelele pe care nu le atingem: jurnalul migrărilor ține de cod, nu de date. */
function esteTabelDeDate(nume: string): boolean {
  return (
    !nume.startsWith("sqlite_") &&
    !nume.startsWith("_") &&
    !nume.startsWith("libsql_")
  );
}

type Valoare = string | number | null;

type TabelCopiat = { coloane: string[]; randuri: Valoare[][] };

export type ContinutCopie = {
  aplicatie: string;
  versiune: number;
  /** Momentul copiei, ISO. */
  creatLa: string;
  tabele: Record<string, TabelCopiat>;
};

async function tabeleleBazei(): Promise<string[]> {
  const r = await db.$client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  return r.rows.map((x) => String(x.name)).filter(esteTabelDeDate);
}

async function coloaneleTabelului(tabel: string): Promise<string[]> {
  const r = await db.$client.execute(`PRAGMA table_info("${tabel}")`);
  return r.rows.map((x) => String(x.name));
}

/** Valoarea dintr-o celulă, într-o formă care încape în JSON. */
function caValoare(v: unknown): Valoare {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return String(v);
}

/** Face copia întregii baze. */
export async function faCopie(): Promise<{
  nume: string;
  continut: Buffer;
  rezumat: RezumatCopie;
}> {
  const tabele: Record<string, TabelCopiat> = {};
  for (const tabel of await tabeleleBazei()) {
    const r = await db.$client.execute(`SELECT * FROM "${tabel}"`);
    tabele[tabel] = {
      coloane: r.columns,
      randuri: r.rows.map((rand) => r.columns.map((_, i) => caValoare(rand[i]))),
    };
  }

  const copie: ContinutCopie = {
    aplicatie: APLICATIA,
    versiune: VERSIUNE,
    creatLa: new Date().toISOString(),
    tabele,
  };
  return {
    nume: `puls-copie-${dataAzi()}.json.gz`,
    continut: gzipSync(Buffer.from(JSON.stringify(copie))),
    rezumat: rezuma(copie),
  };
}

export type RezumatCopie = {
  creatLa: string;
  /** Câte rânduri are fiecare tabel important, pentru previzualizare. */
  numere: { eticheta: string; cate: number }[];
  totalRanduri: number;
};

const ETICHETE: Record<string, string> = {
  membri: "pulsiști",
  grupe: "grupe",
  lideri: "lideri",
  intalniri: "întâlniri",
  prezente: "bife de prezență",
  programari_slujire: "programări de slujire",
  citiri: "zile de citit bifate",
  plan_citire: "zile în planul de citire",
  ani_arhivati: "ani arhivați",
};

function rezuma(copie: ContinutCopie): RezumatCopie {
  const numere = Object.entries(ETICHETE)
    .filter(([tabel]) => copie.tabele[tabel])
    .map(([tabel, eticheta]) => ({
      eticheta,
      cate: copie.tabele[tabel].randuri.length,
    }));
  const totalRanduri = Object.values(copie.tabele).reduce(
    (s, t) => s + t.randuri.length,
    0,
  );
  return { creatLa: copie.creatLa, numere, totalRanduri };
}

/** Citește un fișier de copie și verifică dacă e chiar o copie de-a noastră. */
export function citesteCopia(
  fisier: Buffer,
): { copie: ContinutCopie; rezumat: RezumatCopie } | { eroare: string } {
  let text: string;
  try {
    text = gunzipSync(fisier).toString("utf-8");
  } catch {
    // Poate cineva a dezarhivat-o între timp - primim și JSON-ul simplu.
    text = fisier.toString("utf-8");
  }

  let copie: ContinutCopie;
  try {
    copie = JSON.parse(text);
  } catch {
    return { eroare: "Fișierul nu e o copie de siguranță a aplicației." };
  }
  if (copie?.aplicatie !== APLICATIA || typeof copie.tabele !== "object") {
    return { eroare: "Fișierul nu e o copie de siguranță a aplicației Puls." };
  }
  if (copie.versiune > VERSIUNE) {
    return {
      eroare:
        "Copia e făcută de o versiune mai nouă a aplicației. Actualizează întâi aplicația.",
    };
  }
  return { copie, rezumat: rezuma(copie) };
}

/**
 * Pune în baza de date exact ce e în copie. Tot ce era înainte dispare.
 *
 * Totul merge într-o singură tranzacție: dacă ceva nu merge la jumătate,
 * baza rămâne cum era. Cheile străine se verifică abia la sfârșit
 * (`defer_foreign_keys`), ca ordinea tabelelor să nu conteze.
 */
export async function restaureazaCopia(copie: ContinutCopie): Promise<void> {
  const existente = await tabeleleBazei();
  const coloaneExistente = new Map<string, Set<string>>();
  for (const t of existente) {
    coloaneExistente.set(t, new Set(await coloaneleTabelului(t)));
  }

  // O copie cu tabele sau coloane pe care aplicația nu le mai știe nu se
  // poate pune la loc fără să pierdem ceva din ea - mai bine refuzăm.
  for (const [tabel, date] of Object.entries(copie.tabele)) {
    if (!esteTabelDeDate(tabel)) continue;
    const coloane = coloaneExistente.get(tabel);
    if (!coloane) {
      throw new Error(`Copia are tabelul „${tabel}”, pe care aplicația nu-l mai are.`);
    }
    const necunoscute = date.coloane.filter((c) => !coloane.has(c));
    if (necunoscute.length > 0) {
      throw new Error(
        `Copia are în „${tabel}” coloane pe care aplicația nu le mai are: ${necunoscute.join(", ")}.`,
      );
    }
  }

  const comenzi: InStatement[] = ["PRAGMA defer_foreign_keys = ON"];
  for (const t of existente) comenzi.push(`DELETE FROM "${t}"`);

  for (const [tabel, date] of Object.entries(copie.tabele)) {
    if (!esteTabelDeDate(tabel) || date.randuri.length === 0) continue;
    const coloane = date.coloane.map((c) => `"${c}"`).join(", ");
    const semne = `(${date.coloane.map(() => "?").join(", ")})`;
    // Câte rânduri într-o comandă, ca să nu trecem de limita de parametri.
    const peComanda = Math.max(1, Math.floor(4000 / date.coloane.length));
    for (let i = 0; i < date.randuri.length; i += peComanda) {
      const bucata = date.randuri.slice(i, i + peComanda);
      comenzi.push({
        sql: `INSERT INTO "${tabel}" (${coloane}) VALUES ${bucata.map(() => semne).join(", ")}`,
        args: bucata.flat(),
      });
    }
  }

  await db.$client.batch(comenzi, "write");
}

/* ------------------------------------------------------ trimiterea pe email */

/** Administratorii activi cu adresă de email - cei care primesc copia. */
async function adminiiCuEmail() {
  const toti = await db
    .select({ nume: lideri.nume, email: lideri.email })
    .from(lideri)
    .where(and(eq(lideri.rol, "admin"), eq(lideri.activ, true)));
  return toti.filter((a): a is { nume: string; email: string } => !!a.email);
}

export async function destinatariiCopiei() {
  return (await adminiiCuEmail()).map((a) => a.email);
}

/** Când a plecat ultima copie pe email, dacă a plecat vreuna. */
export async function ultimaCopieTrimisa(): Promise<Date | null> {
  const [rand] = await db
    .select({ creatLa: audit.creatLa })
    .from(audit)
    .where(eq(audit.actiune, "copie:trimisa"))
    .orderBy(desc(audit.creatLa))
    .limit(1);
  return rand?.creatLa ?? null;
}

export type RezultatTrimitereCopie = {
  trimise: number;
  eroare?: string;
};

/**
 * Face o copie și o trimite pe email tuturor administratorilor care au adresă.
 * `motiv` apare în subiect: „săptămânală", „înainte de restaurare"...
 */
export async function trimiteCopiaPeEmail(
  motiv: string,
  liderId: number | null,
): Promise<RezultatTrimitereCopie> {
  if (!emailActiv()) {
    return { trimise: 0, eroare: "Trimiterea pe email nu e pornită." };
  }
  const admini = await adminiiCuEmail();
  if (admini.length === 0) {
    return { trimise: 0, eroare: "Niciun administrator nu are adresa de email scrisă." };
  }

  const { nume, continut, rezumat } = await faCopie();
  let trimise = 0;
  let eroare: string | undefined;
  for (const a of admini) {
    const r = await trimiteEmail({
      catre: a.email,
      subiect: `Puls · copia de siguranță din ${dataNumerica(dataAzi())} (${motiv})`,
      text: `Salut, ${a.nume}!

Atașat e copia de siguranță a aplicației Puls, făcută ${momentLizibil(new Date(rezumat.creatLa))}.
${rezumat.numere.map((n) => `- ${n.cate} ${n.eticheta}`).join("\n")}

Păstreaz-o. Dacă se întâmplă ceva cu datele, o încarci din Administrare · Siguranța datelor și totul revine cum era în momentul copiei.

—
Puls · grupe mici`,
      atasamente: [{ nume, continut }],
    });
    if (r.trimis) trimise++;
    else eroare = r.motiv;
  }

  if (trimise > 0) {
    await db.insert(audit).values({
      liderId,
      actiune: "copie:trimisa",
      detalii: JSON.stringify({ motiv, trimise, marime: continut.length }),
    });
  }
  return { trimise, eroare };
}

/**
 * Copia săptămânală, pentru cronul de dimineață: pleacă duminica, o singură
 * dată pe săptămână, oricâte ori ar rula cronul în ziua aia.
 */
export async function copiaSaptamanala(azi: string, ziSaptamanii: number) {
  if (ziSaptamanii !== 0) return null;
  const [dejaTrimisa] = await db
    .select({ id: audit.id })
    .from(audit)
    .where(
      and(
        like(audit.actiune, "copie:trimisa"),
        gte(audit.creatLa, new Date(`${azi}T00:00:00Z`)),
      ),
    )
    .limit(1);
  if (dejaTrimisa) return null;
  return trimiteCopiaPeEmail("săptămânală", null);
}
