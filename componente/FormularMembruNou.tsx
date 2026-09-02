"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  adaugaMembru,
  type StareFormular,
} from "@/app/(aplicatie)/grupe/[id]/actions";

/** Formularul prin care liderul adaugă un adolescent nou în grupă. */
export function FormularMembruNou({ grupaId }: { grupaId: number }) {
  const actiuneLegata = adaugaMembru.bind(null, grupaId);
  const [stare, actiune, seTrimite] = useActionState<StareFormular, FormData>(
    actiuneLegata,
    {},
  );
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (stare.reusit) formular.current?.reset();
  }, [stare]);

  return (
    <form ref={formular} action={actiune} className="flex flex-col gap-3">
      <div>
        <label className="eticheta" htmlFor="nume">
          Nume și prenume
        </label>
        <input id="nume" name="nume" className="camp" required maxLength={80} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eticheta" htmlFor="telefon">
            Telefon (opțional)
          </label>
          <input
            id="telefon"
            name="telefon"
            className="camp"
            inputMode="tel"
            maxLength={30}
          />
        </div>
        <div>
          <label className="eticheta" htmlFor="dataNasterii">
            Data nașterii (opțional)
          </label>
          <input
            id="dataNasterii"
            name="dataNasterii"
            type="date"
            className="camp"
          />
        </div>
      </div>

      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
      {stare.reusit && (
        <p className="text-sm text-green-700">Adolescentul a fost adăugat.</p>
      )}

      <button
        type="submit"
        disabled={seTrimite}
        className="self-start rounded-lg bg-albastru px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {seTrimite ? "Salvez..." : "Adaugă în grupă"}
      </button>
    </form>
  );
}
