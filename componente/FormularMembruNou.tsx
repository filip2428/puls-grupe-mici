"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  adaugaMembru,
  adaugaPulsistExistent,
  type StareMembruNou,
  type StarePulsistExistent,
} from "@/app/(aplicatie)/grupe/[id]/actions";
import type { PulsistDeAdaugat } from "@/lib/interogari/grupe";
import { CLASE, etichetaClasa, etichetaClasaScurta } from "@/lib/util/etichete";

/**
 * Ia în grupă pe cineva care e deja în aplicație, dar n-are grupă.
 *
 * Stă înaintea formularului de pulsist nou dinadins: cine s-a înscris prin
 * formular e deja aici, cu telefon, părinți și biserică. Scris a doua oară,
 * ar rămâne două fișe pentru același om, iar prezența s-ar împărți între ele.
 */
export function AlegePulsistExistent({
  grupaId,
  pulsisti,
}: {
  grupaId: number;
  pulsisti: PulsistDeAdaugat[];
}) {
  const [stare, actiune, seTrimite] = useActionState<
    StarePulsistExistent,
    FormData
  >(adaugaPulsistExistent.bind(null, grupaId), {});

  return (
    <form action={actiune} className="flex flex-col gap-3">
      <div>
        <label className="eticheta" htmlFor="membruId">
          E deja în aplicație, fără grupă
        </label>
        <select id="membruId" name="membruId" className="camp" defaultValue="">
          <option value="">- alege pulsistul -</option>
          {pulsisti.map((p) => (
            <option key={p.id} value={p.id}>
              {[
                p.nume,
                etichetaClasaScurta(p.clasa),
                p.varsta !== null ? `${p.varsta} ani` : "",
                p.status === "musafir" ? "musafir" : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </option>
          ))}
        </select>
      </div>

      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
      {stare.adaugat && (
        <p className="text-sm text-green-700">
          {stare.adaugat} e acum în grupă, cu tot ce s-a strâns despre el.
        </p>
      )}

      <button
        type="submit"
        disabled={seTrimite}
        className="buton buton-principal self-start"
      >
        {seTrimite ? "Adaug..." : "Adaugă-l în grupă"}
      </button>
    </form>
  );
}

/** Formularul prin care liderul adaugă un pulsist nou în grupă. */
export function FormularMembruNou({ grupaId }: { grupaId: number }) {
  const actiuneLegata = adaugaMembru.bind(null, grupaId);
  const [stare, actiune, seTrimite] = useActionState<StareMembruNou, FormData>(
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
      {stare.cereConfirmare && (
        <label className="flex items-start gap-2 rounded-xl bg-lime/20 p-3 text-sm">
          <input
            type="checkbox"
            name="confirmDuplicat"
            value="da"
            className="mt-0.5 size-5 shrink-0 accent-[#2b328d]"
          />
          <span>E altcineva, doar că îl cheamă la fel. Scrie-l ca pulsist nou.</span>
        </label>
      )}
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
