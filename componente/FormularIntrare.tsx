"use client";

import { useActionState, useState } from "react";

import { autentifica, type StareAutentificare } from "@/app/intra/actions";

/** Pune liniuța automat: ABCDEFGHJK -> ABCD-EFGHJK */
function frumos(text: string): string {
  const curat = text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return curat.length > 4 ? `${curat.slice(0, 4)}-${curat.slice(4)}` : curat;
}

export function FormularIntrare() {
  const [cod, setCod] = useState("");
  const [stare, actiune, seTrimite] = useActionState<StareAutentificare, FormData>(
    autentifica,
    {},
  );

  return (
    <form action={actiune} className="flex flex-col gap-4">
      <div>
        <label className="eticheta" htmlFor="cod">
          Codul tău de acces
        </label>
        <input
          id="cod"
          name="cod"
          value={cod}
          onChange={(e) => setCod(frumos(e.target.value))}
          className="camp text-center font-mono text-2xl tracking-[0.2em] uppercase"
          placeholder="ABCD-EFGHJK"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          required
        />
      </div>

      {/* Câmp-capcană pentru roboți: omul nu îl vede, deci nu îl completează. */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="adresa">Adresă</label>
        <input id="adresa" name="adresa" tabIndex={-1} autoComplete="off" />
      </div>

      {stare.eroare && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {stare.eroare}
        </p>
      )}

      <button
        type="submit"
        disabled={seTrimite || cod.length < 11}
        className="rounded-xl bg-albastru px-4 py-3 text-base font-semibold text-white transition disabled:opacity-40"
      >
        {seTrimite ? "Verific..." : "Intră"}
      </button>

      <p className="text-center text-sm text-cenusiu">
        Nu ai cod? Cere-l coordonatorului lucrării.
      </p>
    </form>
  );
}
