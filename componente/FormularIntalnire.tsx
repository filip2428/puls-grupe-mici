"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  creeazaIntalnire,
  salveazaIntalnire,
  type StareIntalnire,
} from "@/app/(aplicatie)/calendar/actions";
import { adaugaZile } from "@/lib/util/date";

export type IntalnireDeEditat = {
  id: number;
  data: string;
  titlu: string;
  ora: string | null;
  locatie: string | null;
  detalii: string | null;
  peGrupeMici: boolean;
};

/**
 * Formularul unei întâlniri din calendar - același și la adăugare, și la
 * modificare.
 *
 * Diferența: la o întâlnire nouă se poate cere repetarea săptămânală (altfel
 * un Puls de vineri s-ar scrie de treizeci de ori cu degetul), pe când la
 * modificare se umblă la o singură zi, cea deschisă.
 *
 * Bifele și butoanele rotunde nu sunt ținute în React: ce arată apăsat se
 * hotărăște din CSS, după `:checked`. Așa, un `form.reset()` după salvare
 * curăță tot dintr-o mișcare, fără să ținem noi minte nimic pe lângă.
 */
export function FormularIntalnire({
  data,
  deEditat,
}: {
  /** Ziua pentru care se scrie, când e o întâlnire nouă. */
  data: string;
  deEditat?: IntalnireDeEditat;
}) {
  const eNoua = !deEditat;
  const [stare, actiune, seTrimite] = useActionState<StareIntalnire, FormData>(
    eNoua ? creeazaIntalnire : salveazaIntalnire.bind(null, deEditat.id),
    {},
  );

  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (eNoua && stare.reusit) formular.current?.reset();
  }, [stare, eNoua]);

  const peGrupeMici = deEditat?.peGrupeMici ?? true;

  return (
    <form ref={formular} action={actiune} className="flex flex-col gap-3">
      <div>
        <label className="eticheta" htmlFor="int-titlu">
          Ce fel de întâlnire e
        </label>
        <input
          id="int-titlu"
          name="titlu"
          className="camp"
          placeholder="ex. Puls de vineri"
          defaultValue={deEditat?.titlu ?? ""}
          maxLength={80}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eticheta" htmlFor="int-data">
            Când
          </label>
          <input
            id="int-data"
            name="data"
            type="date"
            className="camp"
            defaultValue={deEditat?.data ?? data}
            required
          />
        </div>
        <div>
          <label className="eticheta" htmlFor="int-ora">
            Ora
          </label>
          <input
            id="int-ora"
            name="ora"
            type="time"
            className="camp"
            defaultValue={deEditat?.ora ?? ""}
          />
        </div>
      </div>

      {/*
        Întrebarea care schimbă seara: se stă pe grupe mici sau nu? De ea
        atârnă dacă liderii au ce prezență să facă în ziua aia.
      */}
      <fieldset>
        <legend className="eticheta">Cum se stă</legend>
        <div className="grid grid-cols-2 gap-2">
          <AlegereGrupe
            valoare="da"
            implicit={peGrupeMici}
            titlu="Pe grupe mici"
            explicatie="Fiecare grupă cu liderul ei"
          />
          <AlegereGrupe
            valoare="nu"
            implicit={!peGrupeMici}
            titlu="Toți împreună"
            explicatie="Gamenight, seri speciale"
          />
        </div>
      </fieldset>

      <div>
        <label className="eticheta" htmlFor="int-locatie">
          Unde
        </label>
        <input
          id="int-locatie"
          name="locatie"
          className="camp"
          placeholder="opțional"
          defaultValue={deEditat?.locatie ?? ""}
          maxLength={80}
        />
      </div>

      <div>
        <label className="eticheta" htmlFor="int-detalii">
          Alte detalii
        </label>
        <input
          id="int-detalii"
          name="detalii"
          className="camp"
          placeholder="ex. aduce fiecare ceva de mâncare"
          defaultValue={deEditat?.detalii ?? ""}
          maxLength={300}
        />
      </div>

      {eNoua && <Repetare data={data} />}

      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
      {stare.reusit && <p className="text-sm text-green-700">{stare.reusit}</p>}

      <button
        type="submit"
        disabled={seTrimite}
        className="buton buton-principal self-start"
      >
        {seTrimite ? "Salvez..." : eNoua ? "Adaugă în calendar" : "Salvează"}
      </button>
    </form>
  );
}

/**
 * „Se repetă în fiecare săptămână", cu data până când.
 *
 * Bifa, eticheta și blocul cu data sunt frați, nu unul în altul: doar așa
 * poate `peer-checked` să deschidă blocul de dedesubt fără JavaScript.
 */
function Repetare({ data }: { data: string }) {
  return (
    <div className="rounded-xl bg-fundal px-3 py-1">
      <input
        id="int-repeta"
        type="checkbox"
        name="repeta"
        value="saptamanal"
        className="peer h-5 w-5 align-middle accent-[#2b328d]"
      />
      <label
        htmlFor="int-repeta"
        className="inline-flex min-h-11 items-center pl-2.5 align-middle text-sm"
      >
        Se repetă în fiecare săptămână
      </label>

      <div className="hidden pb-3 peer-checked:block">
        <label className="eticheta" htmlFor="int-pana">
          Până când
        </label>
        <input
          id="int-pana"
          name="repetaPanaLa"
          type="date"
          className="camp"
          defaultValue={adaugaZile(data, 7 * 8)}
        />
        <p className="mt-1.5 text-xs text-cenusiu">
          Se scriu întâlniri separate, una pe săptămână. Dacă într-o săptămână
          nu se ține, o ștergi doar pe aceea.
        </p>
      </div>
    </div>
  );
}

/** Unul din cele două cartonașe de ales: „pe grupe mici" / „toți împreună". */
function AlegereGrupe({
  valoare,
  implicit,
  titlu,
  explicatie,
}: {
  valoare: "da" | "nu";
  implicit: boolean;
  titlu: string;
  explicatie: string;
}) {
  return (
    <label className="flex min-h-16 cursor-pointer flex-col justify-center rounded-xl border border-[#d7dced] bg-hartie px-3 py-2 has-[:checked]:border-albastru has-[:checked]:bg-albastru/10 has-[:checked]:text-albastru has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-albastru-deschis/40">
      <input
        type="radio"
        name="peGrupeMici"
        value={valoare}
        defaultChecked={implicit}
        className="sr-only"
      />
      <span className="text-sm font-semibold">{titlu}</span>
      <span className="text-xs text-cenusiu">{explicatie}</span>
    </label>
  );
}
