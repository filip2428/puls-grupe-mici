import Link from "next/link";

import { FormularInchidereAn } from "@/componente/FormularInchidereAn";
import { aniiArhivati, anulDeInchis, previzualizareInchidere } from "@/lib/arhiva";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { dataNumerica, momentLizibil } from "@/lib/util/date";

export const metadata = { title: "Anul bisericesc · Puls" };

export default async function PaginaAn() {
  await ceruteAdmin();
  const [ani, previzualizare] = await Promise.all([
    aniiArhivati(),
    previzualizareInchidere(),
  ]);
  const propus = anulDeInchis();
  const dejaInchis = ani.some((a) => a.nume === propus.nume);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-sm text-cenusiu">
          ← Administrare
        </Link>
        <h1 className="mt-2 text-xl font-bold">Anul bisericesc</h1>
        <p className="text-sm text-cenusiu">
          La sfârșit de an, anul se arhivează - statisticile rămân cum au fost -
          și aplicația se pregătește pentru anul nou.
        </p>
      </div>

      {ani.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Anii arhivați</h2>
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {ani.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/an/${a.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 py-2.5"
                >
                  <span>
                    <span className="block text-sm font-semibold text-albastru">
                      {a.nume}
                    </span>
                    <span className="text-xs text-cenusiu">
                      {dataNumerica(a.deLa)} – {dataNumerica(a.panaLa)} · închis{" "}
                      {momentLizibil(a.creatLa)}
                      {a.creatDe ? ` de ${a.creatDe}` : ""}
                    </span>
                  </span>
                  <span className="text-cenusiu">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <h2 className="text-base font-bold">Închide anul</h2>
        {dejaInchis && (
          <p className="mt-1 rounded-xl bg-lime/25 px-3 py-2 text-xs">
            Anul {propus.nume} e deja arhivat. Închide-l din nou doar dacă știi de
            ce - se face încă o arhivă și se aplică din nou schimbările bifate.
          </p>
        )}
      </div>

      <FormularInchidereAn
        deLa={propus.deLa}
        panaLa={propus.panaLa}
        ies={previzualizare.ies}
        urca={previzualizare.urca}
        faraClasa={previzualizare.faraClasa}
        grupe={previzualizare.grupe}
        cuGrupa={previzualizare.cuGrupa}
        zilePlan={previzualizare.zilePlan}
      />
    </div>
  );
}
