"use client";

import { Icoana, type NumeIcoana } from "@/componente/Icoane";
import type { StarePrezenta } from "@/lib/db/schema";

/**
 * Un rând de prezență: numele și cele trei butoane.
 *
 * Stă separat pentru că îl folosesc două foi diferite - cea de la grupa mică
 * și cea de la slujire. Dacă ar fi fost copiat în amândouă, s-ar fi despărțit
 * la prima schimbare de aspect.
 *
 * Starea se vede de trei ori, ca să nu depindă de culori: dunga din stânga
 * cardului (o vezi derulând repede), butonul ales (plin, cu iconiță) și, cât
 * timp n-a fost ales nimic, eticheta „nemarcat".
 */

export const OPTIUNI: {
  valoare: StarePrezenta;
  eticheta: string;
  icoana: NumeIcoana;
  clase: string;
  dunga: string;
}[] = [
  {
    valoare: "prezent",
    eticheta: "Prezent",
    icoana: "bifa",
    clase: "bg-albastru text-white shadow-sm",
    dunga: "border-l-albastru",
  },
  {
    valoare: "motivat",
    eticheta: "Anunțat",
    icoana: "mesaj",
    clase: "bg-lime text-carbune shadow-sm",
    dunga: "border-l-lime",
  },
  {
    valoare: "absent",
    eticheta: "Absent",
    icoana: "x",
    clase: "bg-carbune text-white shadow-sm",
    dunga: "border-l-carbune",
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
  const optiuneaAleasa = OPTIUNI.find((o) => o.valoare === aleasa);
  return (
    <li
      className={`card border-l-4 p-3 ${
        optiuneaAleasa ? optiuneaAleasa.dunga : "border-l-linie-tare"
      } ${punctat ? "border-dashed" : ""}`}
    >
      <div className="mb-2 flex min-h-6 items-center justify-between gap-2 pl-0.5">
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold">{nume}</span>
          {detaliu && (
            <span className="block truncate text-xs text-cenusiu">
              {detaliu}
            </span>
          )}
        </span>
        {aleasa === undefined && !punctat && (
          <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            nemarcat
          </span>
        )}
      </div>
      <div
        role="group"
        aria-label={`Prezența pentru ${nume}`}
        className="grid grid-cols-3 gap-1 rounded-[0.875rem] bg-fundal p-1"
      >
        {OPTIUNI.map((o) => {
          const activa = aleasa === o.valoare;
          return (
            <button
              key={o.valoare}
              type="button"
              onClick={() => onAlege(o.valoare)}
              aria-pressed={activa}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-[0.625rem] px-1 text-sm font-semibold transition-colors duration-100 ${
                activa ? o.clase : "text-cenusiu active:bg-hartie"
              }`}
            >
              <Icoana nume={o.icoana} marime={16} grosime={activa ? 2.4 : 2} />
              {o.eticheta}
            </button>
          );
        })}
      </div>
    </li>
  );
}
