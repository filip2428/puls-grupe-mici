"use client";

import { useState, useTransition } from "react";

import {
  ruleazaNotificari,
  type StareNotificari,
} from "@/app/(aplicatie)/admin/actions";

/**
 * Rulează acum notificările, fără să aștepți dimineața.
 * Bun ca să verifici că trimiterea pe email chiar merge.
 */
export function ButonNotificari() {
  const [stare, setStare] = useState<StareNotificari>({});
  const [seLucreaza, incepe] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={seLucreaza}
        onClick={() =>
          incepe(async () => {
            setStare(await ruleazaNotificari());
          })
        }
        className="buton buton-secundar self-start"
      >
        {seLucreaza ? "Rulez..." : "Trimite notificările acum"}
      </button>

      {stare.mesaj && <p className="text-xs text-cenusiu">{stare.mesaj}</p>}
      {stare.eroare && <p className="text-xs text-red-700">{stare.eroare}</p>}
    </div>
  );
}
