"use client";

import { useActionState } from "react";

import {
  analizeazaFisierPlan,
  salveazaPlanul,
  type StareAnalizaPlan,
  type StarePlan,
} from "@/app/(aplicatie)/admin/citire/actions";
import { dataScurta } from "@/lib/util/date";

/**
 * Încărcarea planului de citire, în doi pași: întâi arătăm ce am înțeles din
 * fișier, abia apoi planul ia locul celui vechi.
 */
export function ImportPlanCitire({ existaPlan }: { existaPlan: boolean }) {
  const [analiza, verifica, seVerifica] = useActionState<StareAnalizaPlan, FormData>(
    analizeazaFisierPlan,
    { zile: [], probleme: [] },
  );
  const [rezultat, salveaza, seSalveaza] = useActionState<StarePlan, FormData>(
    salveazaPlanul,
    {},
  );

  if (rezultat.zile) {
    return (
      <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
        Gata: planul are acum {rezultat.zile} de porții. Liderii îl văd pe
        foaia de citit a grupei.
      </div>
    );
  }

  const zile = analiza.zile;
  const carti = [...new Set(zile.map((z) => z.carte))];

  return (
    <div className="flex flex-col gap-4">
      <form action={verifica} className="flex flex-col gap-3">
        <div>
          <label className="eticheta" htmlFor="fisier">
            Fișierul cu planul
          </label>
          <input
            id="fisier"
            name="fisier"
            type="file"
            accept=".xlsx"
            required
            className="camp py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-albastru file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
        </div>
        <div>
          <label className="eticheta" htmlFor="incepeLa">
            Ziua 1 începe la (doar pentru planurile cu zile numerotate)
          </label>
          <input id="incepeLa" name="incepeLa" type="date" className="camp" />
        </div>

        {analiza.eroare && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {analiza.eroare}
          </p>
        )}

        <button
          type="submit"
          disabled={seVerifica}
          className="buton buton-secundar self-start"
        >
          {seVerifica ? "Citesc fișierul..." : "Verifică fișierul"}
        </button>
      </form>

      {analiza.gata && !analiza.eroare && (
        <div className="flex flex-col gap-4 border-t border-[#eef1f7] pt-4">
          {zile.length > 0 && (
            <p className="text-sm">
              <strong>{zile.length}</strong> porții, de la{" "}
              <strong>{dataScurta(zile[0].data)} {zile[0].data.slice(0, 4)}</strong>{" "}
              până la{" "}
              <strong>
                {dataScurta(zile[zile.length - 1].data)}{" "}
                {zile[zile.length - 1].data.slice(0, 4)}
              </strong>
              , în {carti.length} {carti.length === 1 ? "carte" : "cărți"}.
            </p>
          )}

          {carti.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-cenusiu">
                Cărțile, în ordinea planului. Dacă vreuna arată ciudat, scrie
                cartea de mână în coloana „Carte”.
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {carti.map((c) => (
                  <li key={c} className="rounded-full bg-fundal px-2 py-1 text-xs">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {zile.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e3e7f2] text-xs text-cenusiu">
                    <th className="py-2 pr-3 font-semibold">Ziua</th>
                    <th className="py-2 pr-3 font-semibold">Porțiune</th>
                    <th className="py-2 font-semibold">Carte</th>
                  </tr>
                </thead>
                <tbody>
                  {zile.slice(0, 10).map((z) => (
                    <tr key={z.data} className="border-b border-[#eef1f7]">
                      <td className="py-2 pr-3 text-cenusiu">{dataScurta(z.data)}</td>
                      <td className="py-2 pr-3">{z.portiune}</td>
                      <td className="py-2 text-cenusiu">{z.carte}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {zile.length > 10 && (
                <p className="mt-2 text-xs text-cenusiu">
                  ...și încă {zile.length - 10}.
                </p>
              )}
            </div>
          )}

          {analiza.probleme.length > 0 && (
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">
                {analiza.probleme.length === 1
                  ? "Un rând pe care l-am sărit"
                  : `${analiza.probleme.length} rânduri pe care le-am sărit`}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-red-800/90">
                {analiza.probleme.slice(0, 30).map((p) => (
                  <li key={p.rand}>
                    rândul {p.rand}: {p.mesaj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {zile.length > 0 && (
            <form action={salveaza}>
              <input type="hidden" name="zile" value={JSON.stringify(zile)} />
              {rezultat.eroare && (
                <p className="mb-2 text-sm text-red-700">{rezultat.eroare}</p>
              )}
              {existaPlan && (
                <p className="mb-2 text-xs text-cenusiu">
                  Planul de acum se înlocuiește cu ăsta. Bifele deja făcute
                  rămân pe zilele lor.
                </p>
              )}
              <button
                type="submit"
                disabled={seSalveaza}
                className="buton buton-principal"
              >
                {seSalveaza
                  ? "Salvez..."
                  : existaPlan
                    ? "Înlocuiește planul"
                    : "Salvează planul"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
