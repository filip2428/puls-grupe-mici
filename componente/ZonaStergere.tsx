"use client";

import { useActionState, useState } from "react";

type Stare = { eroare?: string; reusit?: boolean };

/**
 * Ștergerea definitivă, ascunsă sub un „details" ca să nu fie apăsată din
 * greșeală. Ca să meargă butonul, trebuie scris numele exact - același gest
 * pe care îl cer și alte aplicații înainte de ceva ireversibil.
 */
export function ZonaStergere({
  actiune,
  nume,
  titlu,
  avertisment,
  textButon,
}: {
  actiune: (stare: Stare, formData: FormData) => Promise<Stare>;
  nume: string;
  titlu: string;
  avertisment: string;
  textButon: string;
}) {
  const [stare, trimite, seTrimite] = useActionState<Stare, FormData>(
    actiune,
    {},
  );
  const [scris, setScris] = useState("");
  const potrivit = fara(scris) === fara(nume);

  return (
    <details className="rounded-xl border border-red-200 bg-red-50/50 p-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-red-800">
        {titlu}
      </summary>

      <form action={trimite} className="flex flex-col gap-3 pt-2">
        <p className="text-xs text-red-800/90">{avertisment}</p>

        <div>
          <label className="eticheta" htmlFor="confirmare">
            Scrie „{nume}” ca să confirmi
          </label>
          <input
            id="confirmare"
            name="confirmare"
            className="camp"
            value={scris}
            onChange={(e) => setScris(e.target.value)}
            autoComplete="off"
            placeholder={nume}
          />
        </div>

        {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}

        <button
          type="submit"
          disabled={!potrivit || seTrimite}
          className="buton self-start bg-red-700 text-white"
        >
          {seTrimite ? "Șterg..." : textButon}
        </button>
      </form>
    </details>
  );
}

/** Comparăm fără diacritice și fără spații în plus. */
function fara(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
