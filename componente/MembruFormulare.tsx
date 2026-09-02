"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  adaugaNota,
  salveazaMembru,
  type StareFormular,
} from "@/app/(aplicatie)/membri/[id]/actions";

/** Caseta în care liderul scrie o notă despre adolescent. */
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
        className="self-start rounded-lg bg-albastru px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {seTrimite ? "Salvez..." : "Adaugă nota"}
      </button>
    </form>
  );
}

/** Formularul de editare a datelor unui adolescent. */
export function FormularEditareMembru({
  membruId,
  nume,
  telefon,
  dataNasterii,
}: {
  membruId: number;
  nume: string;
  telefon: string | null;
  dataNasterii: string | null;
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
          defaultValue={nume}
          maxLength={80}
          required
        />
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
            defaultValue={telefon ?? ""}
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
            defaultValue={dataNasterii ?? ""}
          />
        </div>
      </div>
      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
      {stare.reusit && <p className="text-sm text-green-700">Salvat.</p>}
      <button
        type="submit"
        disabled={seTrimite}
        className="self-start rounded-lg bg-albastru px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {seTrimite ? "Salvez..." : "Salvează"}
      </button>
    </form>
  );
}
