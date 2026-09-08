"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  creeazaBisericaNoua,
  salveazaBisericaAdmin,
  type StareBiserica,
} from "@/app/(aplicatie)/admin/biserici/actions";

type DateBiserica = {
  nume?: string;
  localitate?: string | null;
  denominatiune?: string | null;
};

/**
 * Cele trei câmpuri ale unei biserici.
 *
 * Numai numele e obligatoriu. Localitatea desparte două biserici care se
 * cheamă la fel, iar denominațiunea ne spune, în statistici, din ce lume
 * bisericească ne vin pulsiștii - dar de multe ori nu le știm pe amândouă
 * din prima, și n-are rost să ținem biserica nescrisă până le aflăm.
 */
function CampuriBiserica({
  initial,
  prefix,
}: {
  initial?: DateBiserica;
  /** Id-uri unice, ca etichetele să nu se încurce între formulare. */
  prefix: string;
}) {
  return (
    <>
      <div>
        <label className="eticheta" htmlFor={`${prefix}-nume`}>
          Numele bisericii
        </label>
        <input
          id={`${prefix}-nume`}
          name="nume"
          className="camp"
          defaultValue={initial?.nume ?? ""}
          placeholder="ex. Betel"
          maxLength={80}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eticheta" htmlFor={`${prefix}-localitate`}>
            Localitatea
          </label>
          <input
            id={`${prefix}-localitate`}
            name="localitate"
            className="camp"
            defaultValue={initial?.localitate ?? ""}
            placeholder="ex. Arad"
            maxLength={60}
          />
        </div>
        <div>
          <label className="eticheta" htmlFor={`${prefix}-denominatiune`}>
            Denominațiunea
          </label>
          <input
            id={`${prefix}-denominatiune`}
            name="denominatiune"
            className="camp"
            defaultValue={initial?.denominatiune ?? ""}
            placeholder="ex. penticostală"
            maxLength={60}
          />
        </div>
      </div>
    </>
  );
}

/** Formularul pentru o biserică nouă. */
export function FormularBisericaNoua() {
  const [stare, actiune, seTrimite] = useActionState<StareBiserica, FormData>(
    creeazaBisericaNoua,
    {},
  );
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (stare.reusit) formular.current?.reset();
  }, [stare]);

  return (
    <form ref={formular} action={actiune} className="flex flex-col gap-3">
      <CampuriBiserica prefix="noua" />
      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
      {stare.reusit && (
        <p className="text-sm text-green-700">Biserica a fost adăugată.</p>
      )}
      <button
        type="submit"
        disabled={seTrimite}
        className="buton buton-principal self-start"
      >
        {seTrimite ? "Adaug..." : "Adaugă biserica"}
      </button>
    </form>
  );
}

/** Formularul de editare a unei biserici din listă. */
export function FormularEditareBiserica({
  bisericaId,
  initial,
}: {
  bisericaId: number;
  initial: DateBiserica;
}) {
  const [stare, actiune, seTrimite] = useActionState<StareBiserica, FormData>(
    salveazaBisericaAdmin.bind(null, bisericaId),
    {},
  );

  return (
    <form action={actiune} className="flex flex-col gap-3">
      <CampuriBiserica initial={initial} prefix={`b${bisericaId}`} />
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
