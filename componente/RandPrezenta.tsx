"use client";

import type { StarePrezenta } from "@/lib/db/schema";

/**
 * Un rând de prezență: numele și cele trei butoane.
 *
 * Stă separat pentru că îl folosesc două foi diferite - cea de la grupa mică
 * și cea de la slujire. Dacă ar fi fost copiat în amândouă, s-ar fi despărțit
 * la prima schimbare de aspect.
 */

export const OPTIUNI: {
  valoare: StarePrezenta;
  eticheta: string;
  clase: string;
}[] = [
  {
    valoare: "prezent",
    eticheta: "Prezent",
    clase: "bg-albastru text-white border-albastru",
  },
  {
    valoare: "motivat",
    eticheta: "Anunțat",
    clase: "bg-lime text-carbune border-lime",
  },
  {
    valoare: "absent",
    eticheta: "Absent",
    clase: "bg-carbune text-white border-carbune",
  },
];

export function RandPrezenta({
  nume,
  detaliu,
  aleasa,
  punctat,
  onAlege,
}: {
  nume: string;
  /** Rând mic sub nume, ex. echipa din care vine. */
  detaliu?: string;
  aleasa: StarePrezenta | undefined;
  /** Chenar punctat: cineva care nu e membru deplin (musafir, om din echipă). */
  punctat?: boolean;
  onAlege: (valoare: StarePrezenta) => void;
}) {
  return (
    <li className={`card p-3 ${punctat ? "border-dashed" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-base font-medium">{nume}</span>
          {detaliu && (
            <span className="block truncate text-xs text-cenusiu">
              {detaliu}
            </span>
          )}
        </span>
        {aleasa === undefined && !punctat && (
          <span className="shrink-0 text-xs text-red-600">nemarcat</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIUNI.map((o) => {
          const activa = aleasa === o.valoare;
          return (
            <button
              key={o.valoare}
              type="button"
              onClick={() => onAlege(o.valoare)}
              aria-pressed={activa}
              className={`min-h-11 rounded-lg border px-2 text-sm font-semibold transition ${
                activa ? o.clase : "border-[#e3e7f2] bg-fundal text-cenusiu"
              }`}
            >
              {o.eticheta}
            </button>
          );
        })}
      </div>
    </li>
  );
}
