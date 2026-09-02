"use client";

import { useOffline } from "next/offline";

/**
 * Bara care apare când pică netul.
 *
 * Nu e doar informativă: Next ține cererile în așteptare și le repetă când
 * revine semnalul, deci mesajul spune exact ce se întâmplă - nu s-a pierdut
 * nimic, doar așteaptă.
 */
export function BaraOffline() {
  const faraSemnal = useOffline();
  if (!faraSemnal) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-30 bg-carbune px-4 py-1.5 text-center text-xs font-medium text-white"
    >
      Nu ai semnal. Ce bifezi acum se trimite singur când revine netul.
    </div>
  );
}
