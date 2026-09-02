import Link from "next/link";

import { ImportAdolescenti } from "@/componente/ImportAdolescenti";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { COLOANE } from "@/lib/import-adolescenti";
import { toateGrupele } from "@/lib/interogari/lideri";

export const metadata = { title: "Import adolescenți · Puls" };

export default async function PaginaImport() {
  await ceruteAdmin();
  const grupe = await toateGrupele();
  const active = grupe.filter((g) => g.activa);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-sm text-cenusiu">
          ← Administrare
        </Link>
        <h1 className="mt-2 text-xl font-bold">Import din Excel</h1>
        <p className="text-sm text-cenusiu">
          Bun când începi anul cu o listă gata făcută, ca să nu îi adaugi pe
          rând.
        </p>
      </div>

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">1. Ia modelul</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Are coloanele potrivite, un rând de exemplu și o foaie cu explicații.
          Completează-l și șterge rândul de exemplu.
        </p>
        <a href="/api/import/model" className="buton buton-secundar">
          Descarcă modelul
        </a>

        <div className="mt-4 border-t border-[#eef1f7] pt-3">
          <p className="text-xs font-bold text-cenusiu uppercase">Coloanele</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {COLOANE.map((c) => (
              <li
                key={c.cheie}
                className={`rounded-full px-2 py-1 text-xs ${
                  c.obligatoriu
                    ? "bg-albastru/10 font-medium text-albastru"
                    : "bg-fundal text-cenusiu"
                }`}
              >
                {c.titlu}
                {c.obligatoriu && " *"}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-cenusiu">
            Cele marcate cu * sunt obligatorii. Ordinea coloanelor nu contează.
          </p>
        </div>
      </section>

      {active.length === 0 ? (
        <section className="card border-red-100 bg-red-50/50 p-4 text-sm text-red-800">
          Nu ai nicio grupă activă. Creează întâi grupele, apoi importă
          adolescenții - în fișier fiecare rând trebuie să spună din ce grupă
          face parte.
        </section>
      ) : (
        <>
          <section className="card p-4">
            <h2 className="mb-1 text-sm font-bold">2. Încarcă fișierul</h2>
            <p className="mb-3 text-xs text-cenusiu">
              Îți arăt întâi ce am înțeles. Nu se scrie nimic până nu confirmi.
            </p>
            <ImportAdolescenti />
          </section>

          <section className="card p-4">
            <h2 className="mb-2 text-sm font-bold">Grupele în care poți importa</h2>
            <p className="mb-2 text-xs text-cenusiu">
              În coloana „Grupa” scrie exact unul dintre numele astea:
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {active.map((g) => (
                <li
                  key={g.id}
                  className="rounded-full bg-fundal px-2 py-1 text-xs"
                >
                  {g.nume}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="text-xs text-cenusiu">
        Cine e deja în aplicație (același nume, aceeași grupă) e sărit
        automat - poți încărca fișierul de mai multe ori fără să se dubleze
        nimeni.
      </p>
    </div>
  );
}
