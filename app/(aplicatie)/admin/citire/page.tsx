import Link from "next/link";

import { ImportPlanCitire } from "@/componente/ImportPlanCitire";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { planulDeCitire } from "@/lib/interogari/citire";
import { dataAzi, dataCuAn, dataLunga, dataScurta } from "@/lib/util/date";
import { scoatePlanul } from "./actions";

export const metadata = { title: "Planul de citire · Puls" };

export default async function PaginaPlanCitire() {
  await ceruteAdmin();
  const plan = await planulDeCitire();
  const azi = dataAzi();

  const deAzi = plan.find((z) => z.data === azi) ?? null;
  const urmatoarele = plan.filter((z) => z.data >= azi).slice(0, 7);
  const carti = [...new Set(plan.map((z) => z.carte))];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-sm text-cenusiu">
          ← Administrare
        </Link>
        <h1 className="mt-2 text-xl font-bold">Planul de citire</h1>
        <p className="text-sm text-cenusiu">
          Un singur plan, comun pentru toată lucrarea. Liderii bifează săptămânal
          cine a citit, iar avansul fiecăruia se socotește față de el.
        </p>
      </div>

      {plan.length === 0 ? (
        <section className="card bg-lime/25 p-4 text-sm">
          Nu e încărcat încă niciun plan. Până nu e, liderii nu au ce bifa.
        </section>
      ) : (
        <section className="card p-4">
          <h2 className="mb-1 text-sm font-bold">Planul de acum</h2>
          <p className="text-sm">
            {plan.length} porții, de la {dataCuAn(plan[0].data)} până la{" "}
            {dataCuAn(plan[plan.length - 1].data)}.
          </p>
          <p className="mt-2 text-sm">
            <span className="text-cenusiu">Azi: </span>
            {deAzi ? (
              <strong>{deAzi.portiune}</strong>
            ) : (
              <span className="text-cenusiu">nicio porție</span>
            )}
          </p>

          {urmatoarele.length > 0 && (
            <ul className="mt-3 flex flex-col divide-y divide-[#eef1f7] border-t border-[#eef1f7] text-sm">
              {urmatoarele.map((z) => (
                <li key={z.data} className="flex justify-between gap-3 py-2">
                  <span className="text-cenusiu">
                    {z.data === azi ? "azi" : dataScurta(z.data)}
                  </span>
                  <span className="font-medium">{z.portiune}</span>
                </li>
              ))}
            </ul>
          )}

          <details className="mt-3 border-t border-[#eef1f7] pt-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-albastru">
              Cărțile din plan ({carti.length})
            </summary>
            <p className="mb-2 text-xs text-cenusiu">
              Cine intră în lucrare după ce a început planul pornește de la
              începutul cărții la care e planul în ziua aia.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {carti.map((c) => (
                <li key={c} className="rounded-full bg-fundal px-2 py-1 text-xs">
                  {c}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">
          {plan.length === 0 ? "1. Ia modelul" : "Înlocuiește planul"}
        </h2>
        <p className="mb-3 text-xs text-cenusiu">
          Un rând pentru fiecare zi cu porție: coloanele „Data” și „Porțiune”, plus
          „Carte” dacă vrei s-o scrii tu. Zilele libere nu se scriu deloc. Merge
          și un plan cu „Ziua 1, 2, 3...” în loc de date.
        </p>
        <a href="/api/import/plan-citire" className="buton buton-secundar">
          Descarcă modelul
        </a>

        <div className="mt-4 border-t border-[#eef1f7] pt-4">
          <ImportPlanCitire existaPlan={plan.length > 0} />
        </div>
      </section>

      {plan.length > 0 && (
        <details className="rounded-xl border border-red-200 bg-red-50/50 p-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-red-800">
            Scoate planul
          </summary>
          <form action={scoatePlanul} className="pt-2">
            <p className="mb-3 text-xs text-red-800/90">
              Liderii nu mai au ce bifa până nu încarci altul. Bifele făcute până
              acum rămân și se socotesc din nou când pui un plan cu aceleași zile.
              Planul de acum începe {dataLunga(plan[0].data)}.
            </p>
            <button type="submit" className="buton bg-red-700 text-white">
              Scoate planul
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
