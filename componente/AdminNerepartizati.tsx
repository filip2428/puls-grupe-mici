"use client";

import { useActionState } from "react";

import {
  repartizeaza,
  type StareRepartizare,
} from "@/app/(aplicatie)/admin/nerepartizati/actions";
import { InsignaBiserica } from "@/componente/InsignaBiserica";
import { etichetaClasaScurta, type Biserica } from "@/lib/util/etichete";

export type PulsistNerepartizat = {
  id: number;
  nume: string;
  clasa: number | null;
  varsta: number | null;
  sex: "baiat" | "fata" | null;
  status: "membru" | "musafir";
  activ: boolean;
  biserica: Biserica | null;
  bisericaNume: string | null;
};

export type GrupaDeAles = { id: number; nume: string };

/**
 * Un bloc de repartizat: toți cei dintr-o clasă, de același fel.
 *
 * Bifele vin gata puse, iar grupa se alege o dată pentru tot blocul. Așa,
 * cazul obișnuit - „toți băieții de a VI-a merg la grupa lui Filip" - e o
 * alegere și o apăsare, iar excepțiile se debifează. Invers, cu toate căsuțele
 * goale, ar fi însemnat cincizeci de atingeri pe telefon.
 */
export function FormularRepartizare({
  titlu,
  pulsisti,
  grupe,
}: {
  titlu: string;
  pulsisti: PulsistNerepartizat[];
  grupe: GrupaDeAles[];
}) {
  const [stare, actiune, seTrimite] = useActionState<StareRepartizare, FormData>(
    repartizeaza,
    {},
  );

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-sm font-bold">{titlu}</h2>
        <span className="text-xs text-cenusiu">
          {pulsisti.length} {pulsisti.length === 1 ? "pulsist" : "pulsiști"}
        </span>
      </div>

      <form action={actiune} className="mt-3">
        <ul className="flex flex-col divide-y divide-[#eef1f7] border-t border-[#eef1f7]">
          {pulsisti.map((p) => (
            <li key={p.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
                <input
                  type="checkbox"
                  name="pulsist"
                  value={p.id}
                  defaultChecked
                  className="size-5 shrink-0 accent-[#2b328d]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {p.nume}
                  </span>
                  <span className="block text-xs text-cenusiu">
                    {[
                      etichetaClasaScurta(p.clasa),
                      p.varsta !== null ? `${p.varsta} ani` : "",
                      p.status === "musafir" ? "musafir" : "",
                      p.activ ? "" : "inactiv",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <InsignaBiserica
                  biserica={p.biserica}
                  bisericaNume={p.bisericaNume}
                />
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[#eef1f7] pt-3">
          <div className="min-w-40 flex-1">
            <label className="eticheta" htmlFor={`grupa-${titlu}`}>
              Pune-i în
            </label>
            <select
              id={`grupa-${titlu}`}
              name="grupaId"
              className="camp"
              defaultValue=""
            >
              <option value="">- alege grupa -</option>
              {grupe.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nume}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={seTrimite}
            className="buton buton-principal"
          >
            {seTrimite ? "Repartizez..." : "Repartizează bifații"}
          </button>
        </div>

        {stare.eroare && (
          <p className="mt-2 text-sm text-red-700">{stare.eroare}</p>
        )}
        {stare.repartizati !== undefined && (
          <p className="mt-2 text-sm text-green-700">
            {stare.repartizati === 1
              ? "Un pulsist a primit grupă."
              : `${stare.repartizati} pulsiști au primit grupă.`}
          </p>
        )}
      </form>
    </section>
  );
}
