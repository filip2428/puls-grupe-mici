"use client";

import { useState, useTransition } from "react";

import { emailDeProba } from "@/app/(aplicatie)/setari/actions";

/**
 * „Trimite-mi un email de probă".
 *
 * Stă în afara formularului de setări, nu în el: HTML-ul nu permite formulare
 * unul în altul, iar butonul ar fi trimis din greșeală și setările.
 *
 * Când Resend refuză, arătăm motivul lui întreg, nu un „n-a mers". Motivul e
 * de obicei chiar instrucțiunea: domeniu neverificat, cheie greșită, adresă
 * de expeditor scrisă anapoda.
 */
export function ButonEmailProba({ areAdresa }: { areAdresa: boolean }) {
  const [reusit, setReusit] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [seTrimite, startTransition] = useTransition();

  function trimite() {
    setReusit(null);
    setEroare(null);
    startTransition(async () => {
      const r = await emailDeProba();
      if (r.reusit) setReusit(r.reusit);
      else setEroare(r.eroare ?? "N-a mers, dar nici nu știu de ce.");
    });
  }

  return (
    <div className="mt-4 border-t border-[#eef1f7] pt-4">
      <button
        type="button"
        onClick={trimite}
        disabled={seTrimite || !areAdresa}
        className="buton buton-secundar"
      >
        {seTrimite ? "Trimit..." : "Trimite-mi un email de probă"}
      </button>

      {!areAdresa && (
        <p className="mt-2 text-xs text-cenusiu">
          Scrie-ți adresa mai sus și apasă Salvează, apoi poți proba.
        </p>
      )}

      {reusit && (
        <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
          {reusit}
        </p>
      )}
      {eroare && (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm break-words text-red-800">
          {eroare}
        </p>
      )}
    </div>
  );
}
