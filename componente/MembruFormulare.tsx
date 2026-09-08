"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  adaugaNota,
  salveazaMembru,
  type StareFormular,
} from "@/app/(aplicatie)/membri/[id]/actions";
import {
  BISERICI,
  BOTEZ,
  CLASE,
  etichetaClasa,
  type Biserica,
  type Botez,
} from "@/lib/util/etichete";

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

/** O biserică așa cum apare în lista de ales de pe fișă. */
export type BisericaDinLista = {
  id: number;
  nume: string;
  localitate: string | null;
};

export type DateMembru = {
  nume: string;
  telefon: string | null;
  dataNasterii: string | null;
  sex: "baiat" | "fata" | null;
  clasa: number | null;
  biserica: Biserica | null;
  bisericaId: number | null;
  botez: Botez | null;
  botezatLa: string | null;
  parinte1Nume: string | null;
  parinte1Telefon: string | null;
  parinte2Nume: string | null;
  parinte2Telefon: string | null;
};

/** Formularul de editare a datelor unui pulsist, inclusiv părinții. */
export function FormularEditareMembru({
  membruId,
  initial,
  bisericiCunoscute,
}: {
  membruId: number;
  initial: DateMembru;
  /** Bisericile scrise până acum - din ele se alege. */
  bisericiCunoscute: BisericaDinLista[];
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

      {/*
        De unde vine. Cartonașele nu sunt ținute în React: ce arată apăsat
        se hotărăște din CSS, după `:checked`.
      */}
      <fieldset className="rounded-xl border border-[#e3e7f2] p-3">
        <legend className="px-1 text-xs font-bold text-cenusiu uppercase">
          Biserica
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {BISERICI.map((b) => (
            <Cartonas
              key={b.valoare}
              camp="biserica"
              valoare={b.valoare}
              implicit={initial.biserica === b.valoare}
              titlu={b.titlu}
              explicatie={b.explicatie}
            />
          ))}
          <Cartonas
            camp="biserica"
            valoare=""
            implicit={initial.biserica === null}
            titlu="Nu știm încă"
            explicatie="nu s-a întrebat"
          />
        </div>
        {/*
          Biserica se alege dintr-o listă, nu se scrie de mână: altfel „Betel",
          „betel" și „Betel Arad" ajung trei biserici în statistici. Cine
          lipsește din listă se adaugă mai jos, fără să pleci de pe fișă.

          `key` face selectul să se remonteze după ce s-a salvat o biserică
          nouă - altfel ar rămâne pe ce arăta înainte, deși omul e deja mutat.
        */}
        <div className="mt-3">
          <label className="eticheta" htmlFor="bisericaId">
            Care biserică
          </label>
          <select
            key={`aleasa-${initial.bisericaId ?? "gol"}`}
            id="bisericaId"
            name="bisericaId"
            className="camp"
            defaultValue={initial.bisericaId ?? ""}
          >
            <option value="">- alege din listă -</option>
            {bisericiCunoscute.map((b) => (
              <option key={b.id} value={b.id}>
                {b.localitate ? `${b.nume} · ${b.localitate}` : b.nume}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-cenusiu">
            Se alege doar pentru cei de la altă biserică. La celelalte
            răspunsuri se golește singur.
          </p>
        </div>

        <details
          key={`noua-${initial.bisericaId ?? "gol"}`}
          className="mt-2 rounded-xl bg-fundal px-3"
        >
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-albastru">
            Nu e în listă? Adaugă o biserică
          </summary>
          <div className="flex flex-col gap-3 pb-3">
            <div>
              <label className="eticheta" htmlFor="bisericaNouaNume">
                Numele bisericii
              </label>
              <input
                id="bisericaNouaNume"
                name="bisericaNouaNume"
                className="camp"
                placeholder="ex. Betel"
                maxLength={80}
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="eticheta" htmlFor="bisericaNouaLocalitate">
                  Localitatea
                </label>
                <input
                  id="bisericaNouaLocalitate"
                  name="bisericaNouaLocalitate"
                  className="camp"
                  placeholder="ex. Arad"
                  maxLength={60}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="eticheta" htmlFor="bisericaNouaDenominatiune">
                  Denominațiunea
                </label>
                <input
                  id="bisericaNouaDenominatiune"
                  name="bisericaNouaDenominatiune"
                  className="camp"
                  placeholder="ex. penticostală"
                  maxLength={60}
                  autoComplete="off"
                />
              </div>
            </div>
            <p className="text-xs text-cenusiu">
              Localitatea și denominațiunea sunt opționale. Biserica se adaugă
              la salvare și rămâne apoi în listă pentru toată lucrarea.
            </p>
          </div>
        </details>
      </fieldset>

      {/*
        Botezul stă separat de biserică, nu sub ea: nu se deduce unul din
        altul. Sunt botezați care nu mai merg nicăieri și pulsiști de la noi,
        veniți de ani de zile, care încă n-au făcut pasul.
      */}
      <fieldset className="rounded-xl border border-[#e3e7f2] p-3">
        <legend className="px-1 text-xs font-bold text-cenusiu uppercase">
          Botez
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {BOTEZ.map((b) => (
            <Cartonas
              key={b.valoare}
              camp="botez"
              valoare={b.valoare}
              implicit={initial.botez === b.valoare}
              titlu={b.titlu}
              explicatie={b.explicatie}
            />
          ))}
          <Cartonas
            camp="botez"
            valoare=""
            implicit={initial.botez === null}
            titlu="Nu știm încă"
            explicatie="nu s-a întrebat"
          />
        </div>
        <div className="mt-3">
          <label className="eticheta" htmlFor="botezatLa">
            Când s-a botezat
          </label>
          <input
            id="botezatLa"
            name="botezatLa"
            type="date"
            className="camp"
            defaultValue={initial.botezatLa ?? ""}
          />
          <p className="mt-1.5 text-xs text-cenusiu">
            Dacă o știi. Se scrie doar la „botezat&rdquo; - la celelalte răspunsuri se
            golește singură. Cu ea se pot număra botezurile dintr-un an.
          </p>
        </div>
      </fieldset>

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

/** Unul din cartonașele de bifat, la „Biserica" sau la „Botez". */
function Cartonas({
  camp,
  valoare,
  implicit,
  titlu,
  explicatie,
}: {
  /** Numele câmpului din formular - toate cartonașele unui grup îl împart. */
  camp: string;
  valoare: string;
  implicit: boolean;
  titlu: string;
  explicatie: string;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border border-[#d7dced] bg-hartie px-3 py-2 has-[:checked]:border-albastru has-[:checked]:bg-albastru/10 has-[:checked]:text-albastru has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-albastru-deschis/40">
      <input
        type="radio"
        name={camp}
        value={valoare}
        defaultChecked={implicit}
        className="sr-only"
      />
      <span className="text-sm font-semibold">{titlu}</span>
      <span className="text-xs text-cenusiu">{explicatie}</span>
    </label>
  );
}
