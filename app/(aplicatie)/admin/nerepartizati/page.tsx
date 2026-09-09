import Link from "next/link";

import {
  FormularRepartizare,
  type PulsistNerepartizat,
} from "@/componente/AdminNerepartizati";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { grupeActive } from "@/lib/interogari/grupe";
import { cautaPulsisti } from "@/lib/interogari/pulsisti";
import { etichetaClasa } from "@/lib/util/etichete";

export const metadata = { title: "Nerepartizați · Puls" };

/**
 * Pulsiștii care încă n-au grupă.
 *
 * Aici ajung cei importați fără grupă și cei rămași după o grupă desființată.
 * Nu e o listă de greșeli de reparat: e coada firească dintre înscriere și
 * împărțire, iar la începutul anului bisericesc se umple dintr-o dată.
 *
 * Sunt strânși pe clase și pe băieți/fete pentru că așa se ia hotărârea în
 * realitate - nu om cu om.
 */
export default async function PaginaNerepartizati() {
  await ceruteAdmin();

  const [lista, grupe] = await Promise.all([
    cautaPulsisti({ faraGrupa: true, activi: "toti" }),
    grupeActive(),
  ]);

  const blocuri = peBlocuri(lista);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-sm text-cenusiu">
          ← Administrare
        </Link>
        <h1 className="mt-2 text-xl font-bold">Nerepartizați</h1>
        <p className="text-sm text-cenusiu">
          Pulsiștii care încă n-au grupă. Până primesc una nu apar pe nicio
          foaie de prezență și nu intră în statistici, dar datele lor sunt
          toate scrise.
        </p>
      </div>

      {lista.length === 0 ? (
        <section className="card p-4">
          <p className="text-sm">Toată lumea are grupă.</p>
          <p className="mt-1 text-sm text-cenusiu">
            Aici ajung cei importați fără grupă și cei rămași după ce o grupă a
            fost desființată.
          </p>
        </section>
      ) : grupe.length === 0 ? (
        <section className="card p-4">
          <p className="text-sm">
            Sunt {lista.length} de repartizat, dar n-ai nicio grupă activă.
          </p>
          <Link href="/admin/grupe" className="buton buton-principal mt-3">
            Fă o grupă
          </Link>
        </section>
      ) : (
        <>
          <p className="text-sm text-cenusiu">
            {lista.length === 1
              ? "Un pulsist așteaptă o grupă."
              : `${lista.length} pulsiști așteaptă o grupă.`}{" "}
            Bifele vin gata puse - alege grupa pentru un bloc întreg și
            debifează excepțiile.
          </p>
          {blocuri.map((b) => (
            <FormularRepartizare
              key={b.titlu}
              titlu={b.titlu}
              pulsisti={b.pulsisti}
              grupe={grupe}
            />
          ))}
        </>
      )}
    </div>
  );
}

/** Îi strânge pe clase, iar în clasă băieții separat de fete. */
function peBlocuri(
  lista: PulsistNerepartizat[],
): { titlu: string; pulsisti: PulsistNerepartizat[] }[] {
  const dupaBloc = new Map<string, PulsistNerepartizat[]>();

  for (const p of lista) {
    const clasa = etichetaClasa(p.clasa) || "fără clasă scrisă";
    const fel =
      p.sex === "baiat" ? "băieți" : p.sex === "fata" ? "fete" : "sex nescris";
    const titlu = `${clasa} · ${fel}`;
    dupaBloc.set(titlu, [...(dupaBloc.get(titlu) ?? []), p]);
  }

  return [...dupaBloc.entries()]
    .map(([titlu, pulsisti]) => ({
      titlu,
      pulsisti: pulsisti.sort((a, b) => a.nume.localeCompare(b.nume, "ro")),
    }))
    .sort((a, b) => cheieOrdine(a.pulsisti[0]) - cheieOrdine(b.pulsisti[0]));
}

/** Clasele mici întâi; cei fără clasă scrisă la coadă, ca să nu se piardă. */
function cheieOrdine(p: PulsistNerepartizat): number {
  return (p.clasa ?? 99) * 10 + (p.sex === "baiat" ? 0 : p.sex === "fata" ? 1 : 2);
}
