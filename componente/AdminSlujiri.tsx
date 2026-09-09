"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  creeazaEchipa,
  creeazaProgramare,
  salveazaEchipa,
  salveazaProgramare,
  type StareSlujire,
} from "@/app/(aplicatie)/slujiri/actions";

type Optiune = { id: number; nume: string };

/**
 * O listă de bifat: cine coordonează o slujire, ce grupe slujesc într-o zi.
 *
 * Căsuțe, nu un select cu mai multe alegeri: pe telefon un „multiple" se
 * ține cu degetul apăsat și nu se vede ce ai ales. Aici se vede tot dintr-o
 * privire, iar rândurile sunt destul de mari cât să nu ratezi.
 */
function ListaDeBifat({
  camp,
  optiuni,
  bifateInitial = [],
}: {
  camp: string;
  optiuni: Optiune[];
  bifateInitial?: number[];
}) {
  const bifate = new Set(bifateInitial);
  return (
    <ul className="flex max-h-64 flex-col divide-y divide-[#eef1f7] overflow-y-auto rounded-xl border border-[#d7dced] px-3">
      {optiuni.map((o) => (
        <li key={o.id}>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2">
            <input
              type="checkbox"
              name={camp}
              value={o.id}
              defaultChecked={bifate.has(o.id)}
              className="size-5 shrink-0 accent-[#2b328d]"
            />
            <span className="min-w-0 flex-1 text-sm">{o.nume}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Adaugă un loc de slujire (Harvest Kids, cafenea, laudă...). */
export function FormularEchipaNoua({ lideri }: { lideri: Optiune[] }) {
  const [stare, actiune, seTrimite] = useActionState<StareSlujire, FormData>(
    creeazaEchipa,
    {},
  );
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (stare.reusit) formular.current?.reset();
  }, [stare]);

  return (
    <form ref={formular} action={actiune} className="flex flex-col gap-3">
      <div>
        <label className="eticheta" htmlFor="echipa-nume">
          Cum se numește
        </label>
        <input
          id="echipa-nume"
          name="nume"
          className="camp"
          placeholder="ex. Harvest Kids"
          maxLength={60}
          required
        />
      </div>

      <div>
        <label className="eticheta" htmlFor="echipa-descriere">
          Pe scurt, ce se face acolo
        </label>
        <input
          id="echipa-descriere"
          name="descriere"
          className="camp"
          placeholder="opțional"
          maxLength={200}
        />
      </div>

      <div>
        <span className="eticheta">Cine o coordonează</span>
        <ListaDeBifat camp="liderId" optiuni={lideri} />
        <p className="mt-1 text-xs text-cenusiu">
          Toți cei bifați primesc anunțurile despre programări și pot face
          prezența la slujire.
        </p>
      </div>

      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}

      <button
        type="submit"
        disabled={seTrimite}
        className="buton buton-principal self-start"
      >
        {seTrimite ? "Adaug..." : "Adaugă slujirea"}
      </button>
    </form>
  );
}

/** Schimbă numele, descrierea sau liderii unui loc de slujire. */
export function FormularEchipaEditare({
  echipaId,
  lideri,
  initial,
}: {
  echipaId: number;
  lideri: Optiune[];
  initial: { nume: string; descriere: string | null; liderIds: number[] };
}) {
  const [stare, actiune, seTrimite] = useActionState<StareSlujire, FormData>(
    salveazaEchipa.bind(null, echipaId),
    {},
  );

  return (
    <form action={actiune} className="flex flex-col gap-3">
      <div>
        <label className="eticheta" htmlFor="ed-nume">
          Cum se numește
        </label>
        <input
          id="ed-nume"
          name="nume"
          className="camp"
          defaultValue={initial.nume}
          maxLength={60}
          required
        />
      </div>

      <div>
        <label className="eticheta" htmlFor="ed-descriere">
          Pe scurt, ce se face acolo
        </label>
        <input
          id="ed-descriere"
          name="descriere"
          className="camp"
          defaultValue={initial.descriere ?? ""}
          maxLength={200}
        />
      </div>

      <div>
        <span className="eticheta">Cine o coordonează</span>
        <ListaDeBifat
          camp="liderId"
          optiuni={lideri}
          bifateInitial={initial.liderIds}
        />
      </div>

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

export type DateProgramare = {
  data: string;
  titlu: string;
  ora: string | null;
  locatie: string | null;
  detalii: string | null;
  grupaIds: number[];
  echipaId: number | null;
};

/**
 * Câmpurile unei slujiri din calendar - aceleași la adăugare și la modificare.
 *
 * `prefix` ține id-urile deosebite între ele: pe pagina de slujiri sunt zeci
 * de formulare deschise deodată, iar două etichete cu același `for` ar duce
 * degetul în câmpul altei slujiri.
 */
function CampuriProgramare({
  prefix,
  grupe,
  echipe,
  initial,
}: {
  prefix: string;
  grupe: Optiune[];
  echipe: Optiune[];
  initial: DateProgramare;
}) {
  return (
    <>
      <div>
        <label className="eticheta" htmlFor={`${prefix}-titlu`}>
          Ce se slujește
        </label>
        <input
          id={`${prefix}-titlu`}
          name="titlu"
          className="camp"
          placeholder="ex. Protocol la slujba de duminică"
          defaultValue={initial.titlu}
          maxLength={80}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eticheta" htmlFor={`${prefix}-data`}>
            Când
          </label>
          <input
            id={`${prefix}-data`}
            name="data"
            type="date"
            className="camp"
            defaultValue={initial.data}
            required
          />
        </div>
        <div>
          <label className="eticheta" htmlFor={`${prefix}-ora`}>
            Ora
          </label>
          <input
            id={`${prefix}-ora`}
            name="ora"
            type="time"
            className="camp"
            defaultValue={initial.ora ?? ""}
            placeholder="opțional"
          />
        </div>
      </div>

      <div>
        <span className="eticheta">Ce grupe mici slujesc</span>
        {grupe.length === 0 ? (
          <p className="text-sm text-cenusiu">Nu e nicio grupă activă.</p>
        ) : (
          <ListaDeBifat
            camp="grupaId"
            optiuni={grupe}
            bifateInitial={initial.grupaIds}
          />
        )}
      </div>

      <div>
        <label className="eticheta" htmlFor={`${prefix}-echipa`}>
          Slujirea
        </label>
        <select
          id={`${prefix}-echipa`}
          name="echipaId"
          className="camp"
          defaultValue={initial.echipaId ?? ""}
        >
          <option value="">-</option>
          {echipe.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nume}
            </option>
          ))}
        </select>
      </div>
      <p className="-mt-1 text-xs text-cenusiu">
        Bifează câte grupe slujesc în ziua aia - la sărbători sunt mai multe.
        Poți alege și o slujire, singură sau împreună cu grupele.
      </p>

      <div>
        <label className="eticheta" htmlFor={`${prefix}-locatie`}>
          Unde
        </label>
        <input
          id={`${prefix}-locatie`}
          name="locatie"
          className="camp"
          placeholder="opțional"
          defaultValue={initial.locatie ?? ""}
          maxLength={80}
        />
      </div>

      <div>
        <label className="eticheta" htmlFor={`${prefix}-detalii`}>
          Alte detalii
        </label>
        <input
          id={`${prefix}-detalii`}
          name="detalii"
          className="camp"
          placeholder="ex. venim cu o oră înainte"
          defaultValue={initial.detalii ?? ""}
          maxLength={300}
        />
      </div>
    </>
  );
}

/** Trece o slujire în calendar: cine slujește și când. */
export function FormularProgramareNoua({
  grupe,
  echipe,
  azi,
}: {
  grupe: Optiune[];
  echipe: Optiune[];
  azi: string;
}) {
  const [stare, actiune, seTrimite] = useActionState<StareSlujire, FormData>(
    creeazaProgramare,
    {},
  );
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (stare.reusit) formular.current?.reset();
  }, [stare]);

  return (
    <form ref={formular} action={actiune} className="flex flex-col gap-3">
      <CampuriProgramare
        prefix="prog"
        grupe={grupe}
        echipe={echipe}
        initial={{
          data: azi,
          titlu: "",
          ora: null,
          locatie: null,
          detalii: null,
          grupaIds: [],
          echipaId: null,
        }}
      />

      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}

      <button
        type="submit"
        disabled={seTrimite}
        className="buton buton-principal self-start"
      >
        {seTrimite ? "Adaug..." : "Adaugă în calendar"}
      </button>
    </form>
  );
}

/**
 * Schimbă o slujire deja pusă în calendar.
 *
 * Cel mai des se umblă tocmai la grupe: se mai adaugă una care vrea și ea să
 * slujească, sau iese una care nu mai poate. Fără asta ar trebui ștearsă
 * ziua și scrisă din nou, cu prezența ei cu tot.
 */
export function FormularProgramareEditare({
  programareId,
  grupe,
  echipe,
  initial,
}: {
  programareId: number;
  grupe: Optiune[];
  echipe: Optiune[];
  initial: DateProgramare;
}) {
  const [stare, actiune, seTrimite] = useActionState<StareSlujire, FormData>(
    salveazaProgramare.bind(null, programareId),
    {},
  );

  return (
    <form action={actiune} className="flex flex-col gap-3">
      <CampuriProgramare
        prefix={`prog-${programareId}`}
        grupe={grupe}
        echipe={echipe}
        initial={initial}
      />

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
