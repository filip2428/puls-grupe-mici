"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  creeazaEchipa,
  creeazaProgramare,
  salveazaEchipa,
  type StareSlujire,
} from "@/app/(aplicatie)/slujiri/actions";

type Optiune = { id: number; nume: string };

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
        <label className="eticheta" htmlFor="echipa-responsabil">
          Cine coordonează
        </label>
        <select id="echipa-responsabil" name="responsabilId" className="camp">
          <option value="">-</option>
          {lideri.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nume}
            </option>
          ))}
        </select>
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

/** Schimbă numele, descrierea sau responsabilul unui loc de slujire. */
export function FormularEchipaEditare({
  echipaId,
  lideri,
  initial,
}: {
  echipaId: number;
  lideri: Optiune[];
  initial: { nume: string; descriere: string | null; responsabilId: number | null };
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
        <label className="eticheta" htmlFor="ed-responsabil">
          Cine coordonează
        </label>
        <select
          id="ed-responsabil"
          name="responsabilId"
          className="camp"
          defaultValue={initial.responsabilId ?? ""}
        >
          <option value="">-</option>
          {lideri.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nume}
            </option>
          ))}
        </select>
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
      <div>
        <label className="eticheta" htmlFor="prog-titlu">
          Ce se slujește
        </label>
        <input
          id="prog-titlu"
          name="titlu"
          className="camp"
          placeholder="ex. Protocol la slujba de duminică"
          maxLength={80}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eticheta" htmlFor="prog-data">
            Când
          </label>
          <input
            id="prog-data"
            name="data"
            type="date"
            className="camp"
            defaultValue={azi}
            required
          />
        </div>
        <div>
          <label className="eticheta" htmlFor="prog-ora">
            Ora
          </label>
          <input
            id="prog-ora"
            name="ora"
            type="time"
            className="camp"
            placeholder="opțional"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eticheta" htmlFor="prog-grupa">
            Grupa mică
          </label>
          <select id="prog-grupa" name="grupaId" className="camp">
            <option value="">-</option>
            {grupe.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nume}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="eticheta" htmlFor="prog-echipa">
            Slujirea
          </label>
          <select id="prog-echipa" name="echipaId" className="camp">
            <option value="">-</option>
            {echipe.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nume}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="-mt-1 text-xs text-cenusiu">
        Alege cel puțin una. Poți pune și amândouă, dacă o grupă ajută la o slujire.
      </p>

      <div>
        <label className="eticheta" htmlFor="prog-locatie">
          Unde
        </label>
        <input
          id="prog-locatie"
          name="locatie"
          className="camp"
          placeholder="opțional"
          maxLength={80}
        />
      </div>

      <div>
        <label className="eticheta" htmlFor="prog-detalii">
          Alte detalii
        </label>
        <input
          id="prog-detalii"
          name="detalii"
          className="camp"
          placeholder="ex. venim cu o oră înainte"
          maxLength={300}
        />
      </div>

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
