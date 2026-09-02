"use client";

import { useActionState } from "react";

import {
  codNou,
  creeazaLider,
  type StareAdmin,
} from "@/app/(aplicatie)/admin/actions";

/** Caseta în care apare codul de acces, imediat după ce a fost generat. */
function CasetaCod({ cod, nume }: { cod: string; nume?: string }) {
  return (
    <div className="mt-3 rounded-xl border border-lime bg-lime/15 p-4 text-center">
      <p className="text-xs text-carbune">
        Codul {nume ? `pentru ${nume}` : ""} - notează-l acum, nu mai poate fi
        văzut după ce pleci de pe pagină.
      </p>
      <p className="my-2 font-mono text-2xl font-bold tracking-widest">{cod}</p>
      <p className="text-xs text-cenusiu">
        Trimite-l în privat. Cu el se intră în aplicație.
      </p>
    </div>
  );
}

/** Formularul de adăugare a unui lider nou. */
export function FormularLiderNou() {
  const [stare, actiune, seTrimite] = useActionState<StareAdmin, FormData>(
    creeazaLider,
    {},
  );

  return (
    <form action={actiune} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="eticheta" htmlFor="nume">
            Nume și prenume
          </label>
          <input id="nume" name="nume" className="camp" required maxLength={80} />
        </div>
        <div>
          <label className="eticheta" htmlFor="telefon">
            Telefon (opțional)
          </label>
          <input id="telefon" name="telefon" className="camp" inputMode="tel" />
        </div>
      </div>

      <div>
        <label className="eticheta" htmlFor="rol">
          Rol
        </label>
        <select id="rol" name="rol" className="camp" defaultValue="lider">
          <option value="lider">Lider (vede doar grupele lui)</option>
          <option value="admin">Administrator (vede tot)</option>
        </select>
      </div>

      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}

      <button
        type="submit"
        disabled={seTrimite}
        className="self-start rounded-lg bg-albastru px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {seTrimite ? "Creez..." : "Creează liderul"}
      </button>

      {stare.cod && <CasetaCod cod={stare.cod} nume={stare.numePersoana} />}
    </form>
  );
}

/** Butonul care generează un cod nou pentru un lider. */
export function ButonCodNou({ liderId }: { liderId: number }) {
  const [stare, actiune, seTrimite] = useActionState<StareAdmin, FormData>(
    codNou.bind(null, liderId),
    {},
  );

  return (
    <>
      <form action={actiune}>
        <button
          type="submit"
          disabled={seTrimite}
          className="rounded-lg border border-[#d7dced] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {seTrimite ? "Generez..." : "Cod nou"}
        </button>
      </form>
      {stare.cod && (
        <div className="basis-full">
          <CasetaCod cod={stare.cod} nume={stare.numePersoana} />
        </div>
      )}
    </>
  );
}
