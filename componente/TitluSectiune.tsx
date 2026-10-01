import type { ReactNode } from "react";

import { Icoana, type NumeIcoana } from "@/componente/Icoane";

const TONURI = {
  albastru: "bg-albastru-pal text-albastru",
  lime: "bg-lime-pal text-carbune ring-1 ring-lime/60",
  rosu: "bg-red-100 text-red-700",
  gri: "bg-fundal text-cenusiu",
} as const;

/**
 * Titlul unei secțiuni, cu iconița ei într-un pătrățel colorat. Iconița nu e
 * podoabă: pe o pagină lungă (grupa, fișa pulsistului) o recunoști derulând,
 * înainte să citești titlul.
 */
export function TitluSectiune({
  icoana,
  ton = "albastru",
  children,
  dreapta,
  className = "",
}: {
  icoana: NumeIcoana;
  ton?: keyof typeof TONURI;
  children: ReactNode;
  /** Ce stă în dreapta titlului: un link, un număr. */
  dreapta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className={`icoana-sectiune ${TONURI[ton]}`}>
        <Icoana nume={icoana} marime={18} />
      </span>
      <h2 className="titlu-sectiune min-w-0 flex-1">{children}</h2>
      {dreapta}
    </div>
  );
}
