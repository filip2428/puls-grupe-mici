"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  creeazaInlocuire,
  type StareFormular,
} from "@/app/(aplicatie)/grupe/[id]/actions";

type LiderScurt = { id: number; nume: string };

/**
 * Formular pentru înlocuiri: liderul grupei cere altui lider să facă
 * prezența într-o perioadă (când el lipsește).
 */
export function FormularInlocuire({
  grupaId,
  lideri,
  azi,
}: {
  grupaId: number;
  lideri: LiderScurt[];
  azi: string;
}) {
  const actiuneLegata = creeazaInlocuire.bind(null, grupaId);
  const [stare, actiune, seTrimite] = useActionState<StareFormular, FormData>(
    actiuneLegata,
    {},
  );
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (stare.reusit) formular.current?.reset();
  }, [stare]);

  if (lideri.length === 0) {
    return (
      <p className="text-sm text-cenusiu">
        Nu există alți lideri care să poată ține locul. Coordonatorul poate
        adăuga lideri din pagina de administrare.
      </p>
    );
  }

  return (
    <form ref={formular} action={actiune} className="flex flex-col gap-3">
      <div>
        <label className="eticheta" htmlFor="liderId">
          Cine ține locul
        </label>
        <select id="liderId" name="liderId" className="camp" required>
          {lideri.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nume}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eticheta" htmlFor="deLa">
            De la
          </label>
          <input
            id="deLa"
            name="deLa"
            type="date"
            className="camp"
            defaultValue={azi}
            required
          />
        </div>
        <div>
          <label className="eticheta" htmlFor="panaLa">
            Până la
          </label>
          <input
            id="panaLa"
            name="panaLa"
            type="date"
            className="camp"
            defaultValue={azi}
            required
          />
        </div>
      </div>

      <div>
        <label className="eticheta" htmlFor="motiv">
          Motiv (opțional)
        </label>
        <input
          id="motiv"
          name="motiv"
          className="camp"
          maxLength={200}
          placeholder="ex. sunt plecat din oraș"
        />
      </div>

      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
      {stare.reusit && (
        <p className="text-sm text-green-700">Înlocuirea a fost trecută.</p>
      )}

      <button
        type="submit"
        disabled={seTrimite}
        className="self-start rounded-lg bg-albastru px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {seTrimite ? "Salvez..." : "Trece înlocuirea"}
      </button>
    </form>
  );
}
