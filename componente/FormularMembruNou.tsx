"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  adaugaMembru,
  type StareFormular,
} from "@/app/(aplicatie)/grupe/[id]/actions";
import { CLASE, etichetaClasa } from "@/lib/util/etichete";

/** Formularul prin care liderul adaugă un pulsist nou în grupă. */
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
          <label className="eticheta" htmlFor="sex">
            Sex
          </label>
          <select id="sex" name="sex" className="camp" defaultValue="">
            <option value="">-</option>
            <option value="baiat">băiat</option>
            <option value="fata">fată</option>
          </select>
        </div>
        <div>
          <label className="eticheta" htmlFor="clasa">
            Clasa
          </label>
          <select id="clasa" name="clasa" className="camp" defaultValue="">
            <option value="">-</option>
            {CLASE.map((c) => (
              <option key={c} value={c}>
                {etichetaClasa(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eticheta" htmlFor="telefon">
            Telefon
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
            Data nașterii
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
        <p className="text-sm text-green-700">Pulsistul a fost adăugat.</p>
      )}

      <button
        type="submit"
        disabled={seTrimite}
        className="buton buton-principal self-start"
      >
        {seTrimite ? "Salvez..." : "Adaugă în grupă"}
      </button>

      <p className="text-xs text-cenusiu">
        Datele părinților se completează pe pagina pulsistului.
      </p>
    </form>
  );
}
