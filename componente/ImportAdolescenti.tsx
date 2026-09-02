"use client";

import { useActionState } from "react";

import {
  analizeaza,
  importa,
  type StareAnaliza,
  type StareImport,
} from "@/app/(aplicatie)/admin/import/actions";
import { etichetaClasaScurta } from "@/lib/util/etichete";

/**
 * Importul din Excel, în doi pași:
 *  1. alegi fișierul și îți arătăm ce am înțeles din el;
 *  2. dacă e bine, confirmi și abia atunci se scrie în baza de date.
 */
export function ImportAdolescenti() {
  const [analiza, verifica, seVerifica] = useActionState<StareAnaliza, FormData>(
    analizeaza,
    { deImportat: [], existenti: [], probleme: [] },
  );
  const [rezultat, scrie, seScrie] = useActionState<StareImport, FormData>(
    importa,
    {},
  );

  if (rezultat.adaugati) {
    return (
      <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
        Gata: {rezultat.adaugati}{" "}
        {rezultat.adaugati === 1 ? "adolescent adăugat" : "adolescenți adăugați"}.
        Îi găsești în lista de adolescenți și pe paginile grupelor.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={verifica} className="flex flex-col gap-3">
        <div>
          <label className="eticheta" htmlFor="fisier">
            Fișierul completat
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
          <p className="text-sm">
            <strong>{analiza.deImportat.length}</strong> de adăugat
            {analiza.existenti.length > 0 &&
              ` · ${analiza.existenti.length} există deja`}
            {analiza.probleme.length > 0 &&
              ` · ${analiza.probleme.length} ${analiza.probleme.length === 1 ? "rând" : "rânduri"} cu probleme`}
          </p>

          {analiza.deImportat.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e3e7f2] text-xs text-cenusiu">
                    <th className="py-2 pr-3 font-semibold">Nume</th>
                    <th className="py-2 pr-3 font-semibold">Grupa</th>
                    <th className="py-2 pr-3 font-semibold">Clasa</th>
                    <th className="py-2 pr-3 font-semibold">Născut</th>
                    <th className="py-2 font-semibold">Părinte</th>
                  </tr>
                </thead>
                <tbody>
                  {analiza.deImportat.map((r) => (
                    <tr key={r.rand} className="border-b border-[#eef1f7]">
                      <td className="py-2 pr-3">
                        {r.nume}
                        {r.status === "musafir" && (
                          <span className="ml-2 rounded-full bg-lime/40 px-1.5 py-0.5 text-[10px]">
                            musafir
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-cenusiu">{r.grupaNume}</td>
                      <td className="py-2 pr-3 text-cenusiu">
                        {etichetaClasaScurta(r.clasa) || "-"}
                      </td>
                      <td className="py-2 pr-3 text-cenusiu">
                        {r.dataNasterii ?? "-"}
                      </td>
                      <td className="py-2 text-cenusiu">
                        {r.parinte1Nume ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {analiza.existenti.length > 0 && (
            <details className="rounded-xl bg-fundal p-3">
              <summary className="cursor-pointer text-sm font-medium">
                {analiza.existenti.length === 1
                  ? "Unul e deja în aplicație - îl sar"
                  : `${analiza.existenti.length} sunt deja în aplicație - îi sar`}
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-cenusiu">
                {analiza.existenti.map((p) => (
                  <li key={p.rand}>
                    rândul {p.rand}: {p.nume} - {p.mesaj}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {analiza.probleme.length > 0 && (
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">
                {analiza.probleme.length === 1
                  ? "Un rând pe care nu îl pot importa"
                  : `${analiza.probleme.length} rânduri pe care nu le pot importa`}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-red-800/90">
                {analiza.probleme.map((p) => (
                  <li key={p.rand}>
                    rândul {p.rand}: {p.nume} - {p.mesaj}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-red-800/80">
                Poți importa restul acum și să le repari pe astea în fișier,
                apoi să încarci din nou.
              </p>
            </div>
          )}

          {analiza.deImportat.length > 0 && (
            <form action={scrie}>
              <input
                type="hidden"
                name="date"
                value={JSON.stringify(analiza.deImportat)}
              />
              {rezultat.eroare && (
                <p className="mb-2 text-sm text-red-700">{rezultat.eroare}</p>
              )}
              <button
                type="submit"
                disabled={seScrie}
                className="buton buton-principal"
              >
                {seScrie
                  ? "Import..."
                  : `Importă ${analiza.deImportat.length} ${
                      analiza.deImportat.length === 1
                        ? "adolescent"
                        : "adolescenți"
                    }`}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
