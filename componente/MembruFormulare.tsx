"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  adaugaNota,
  salveazaMembru,
  type StareFormular,
} from "@/app/(aplicatie)/membri/[id]/actions";
import { CLASE, etichetaClasa } from "@/lib/util/etichete";

/** Caseta în care liderul scrie o notă despre pulsist. */
export function FormularNota({ membruId }: { membruId: number }) {
  const [stare, actiune, seTrimite] = useActionState<StareFormular, FormData>(
    adaugaNota.bind(null, membruId),
    {},
  );
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (stare.reusit) formular.current?.reset();
  }, [stare]);

  return (
    <form ref={formular} action={actiune} className="flex flex-col gap-2">
      <textarea
        name="text"
        className="camp min-h-20"
        maxLength={2000}
        placeholder="Ce ai observat, pentru ce te rogi, ce ai vrea să nu uiți..."
        required
      />
      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
      <button
        type="submit"
        disabled={seTrimite}
        className="buton buton-principal self-start"
      >
        {seTrimite ? "Salvez..." : "Adaugă nota"}
      </button>
    </form>
  );
}

export type DateMembru = {
  nume: string;
  telefon: string | null;
  dataNasterii: string | null;
  sex: "baiat" | "fata" | null;
  clasa: number | null;
  parinte1Nume: string | null;
  parinte1Telefon: string | null;
  parinte2Nume: string | null;
  parinte2Telefon: string | null;
};

/** Formularul de editare a datelor unui pulsist, inclusiv părinții. */
export function FormularEditareMembru({
  membruId,
  initial,
}: {
  membruId: number;
  initial: DateMembru;
}) {
  const [stare, actiune, seTrimite] = useActionState<StareFormular, FormData>(
    salveazaMembru.bind(null, membruId),
    {},
  );

  return (
    <form action={actiune} className="flex flex-col gap-3">
      <div>
        <label className="eticheta" htmlFor="nume">
          Nume
        </label>
        <input
          id="nume"
          name="nume"
          className="camp"
          defaultValue={initial.nume}
          maxLength={80}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eticheta" htmlFor="sex">
            Sex
          </label>
          <select
            id="sex"
            name="sex"
            className="camp"
            defaultValue={initial.sex ?? ""}
          >
            <option value="">-</option>
            <option value="baiat">băiat</option>
            <option value="fata">fată</option>
          </select>
        </div>
        <div>
          <label className="eticheta" htmlFor="clasa">
            Clasa
          </label>
          <select
            id="clasa"
            name="clasa"
            className="camp"
            defaultValue={initial.clasa ?? ""}
          >
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
            defaultValue={initial.telefon ?? ""}
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
            defaultValue={initial.dataNasterii ?? ""}
          />
        </div>
      </div>

      <fieldset className="rounded-xl border border-[#e3e7f2] p-3">
        <legend className="px-1 text-xs font-bold text-cenusiu uppercase">
          Părinți
        </legend>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="eticheta" htmlFor="parinte1Nume">
                Părinte 1
              </label>
              <input
                id="parinte1Nume"
                name="parinte1Nume"
                className="camp"
                defaultValue={initial.parinte1Nume ?? ""}
                maxLength={80}
                placeholder="ex. mama, Ana"
              />
            </div>
            <div>
              <label className="eticheta" htmlFor="parinte1Telefon">
                Telefon
              </label>
              <input
                id="parinte1Telefon"
                name="parinte1Telefon"
                className="camp"
                inputMode="tel"
                defaultValue={initial.parinte1Telefon ?? ""}
                maxLength={30}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="eticheta" htmlFor="parinte2Nume">
                Părinte 2
              </label>
              <input
                id="parinte2Nume"
                name="parinte2Nume"
                className="camp"
                defaultValue={initial.parinte2Nume ?? ""}
                maxLength={80}
                placeholder="ex. tata, Ionel"
              />
            </div>
            <div>
              <label className="eticheta" htmlFor="parinte2Telefon">
                Telefon
              </label>
              <input
                id="parinte2Telefon"
                name="parinte2Telefon"
                className="camp"
                inputMode="tel"
                defaultValue={initial.parinte2Telefon ?? ""}
                maxLength={30}
              />
            </div>
          </div>
        </div>
      </fieldset>

      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
      {stare.reusit && <p className="text-sm text-green-700">Salvat.</p>}
      <button
        type="submit"
        disabled={seTrimite}
        className="buton buton-principal self-start"
      >
        {seTrimite ? "Salvez..." : "Salvează"}
      </button>
    </form>
  );
}
