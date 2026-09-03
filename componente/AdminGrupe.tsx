"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  creeazaGrupa,
  salveazaGrupa,
  type StareAdmin,
} from "@/app/(aplicatie)/admin/actions";
type DateGrupa = {
  nume?: string;
  oraIntalnire?: string | null;
  locatie?: string | null;
};

function CampuriGrupa({ initial }: { initial?: DateGrupa }) {
  return (
    <>
      <div>
        <label className="eticheta" htmlFor="nume">
          Numele grupei
        </label>
        <input
          id="nume"
          name="nume"
          className="camp"
          defaultValue={initial?.nume ?? ""}
          placeholder="ex. Băieți 14-16"
          maxLength={80}
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="eticheta" htmlFor="oraIntalnire">
            Ora
          </label>
          <input
            id="oraIntalnire"
            name="oraIntalnire"
            className="camp"
            defaultValue={initial?.oraIntalnire ?? ""}
            placeholder="18:00"
            maxLength={10}
          />
        </div>
        <div>
          <label className="eticheta" htmlFor="locatie">
            Locul
          </label>
          <input
            id="locatie"
            name="locatie"
            className="camp"
            defaultValue={initial?.locatie ?? ""}
            placeholder="ex. Sala mică"
            maxLength={80}
          />
        </div>
      </div>
    </>
  );
}

/** Formularul pentru o grupă nouă. */
export function FormularGrupaNoua() {
  const [stare, actiune, seTrimite] = useActionState<StareAdmin, FormData>(
    creeazaGrupa,
    {},
  );
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (stare.reusit) formular.current?.reset();
  }, [stare]);

  return (
    <form ref={formular} action={actiune} className="flex flex-col gap-3">
      <CampuriGrupa />
      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
      {stare.reusit && <p className="text-sm text-green-700">Grupa a fost creată.</p>}
      <button
        type="submit"
        disabled={seTrimite}
        className="buton buton-principal self-start"
      >
        {seTrimite ? "Creez..." : "Creează grupa"}
      </button>
    </form>
  );
}

/** Formularul de editare a unei grupe. */
export function FormularEditareGrupa({
  grupaId,
  initial,
}: {
  grupaId: number;
  initial: DateGrupa;
}) {
  const [stare, actiune, seTrimite] = useActionState<StareAdmin, FormData>(
    salveazaGrupa.bind(null, grupaId),
    {},
  );

  return (
    <form action={actiune} className="flex flex-col gap-3">
      <CampuriGrupa initial={initial} />
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
