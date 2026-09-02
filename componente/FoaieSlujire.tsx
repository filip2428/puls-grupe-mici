"use client";

import { useActionState, useMemo, useState } from "react";

import {
  salveazaFoaiaSlujirii,
  type StareFoaieSlujire,
} from "@/app/(aplicatie)/slujiri/programare/[id]/prezenta/actions";
import { RandPrezenta } from "@/componente/RandPrezenta";
import type { StarePrezenta } from "@/lib/db/schema";
import type { PersoanaDeSlujire } from "@/lib/interogari/prezenta-slujire";

/**
 * Foaia de prezență la o slujire.
 *
 * Seamănă cu cea de la grupa mică, dar e mai scurtă dinadins: aici nu există
 * musafiri, subiect sau invitați. Slujirea are o singură întrebare - cine a
 * venit - plus, dacă vrea liderul, un rând despre cum a fost.
 */
export function FoaieSlujire({
  programareId,
  persoane,
  stariInitiale,
  notaInitiala,
  existaDeja,
  numeEchipa,
}: {
  programareId: number;
  persoane: PersoanaDeSlujire[];
  stariInitiale: Record<number, StarePrezenta>;
  notaInitiala: string | null;
  existaDeja: boolean;
  numeEchipa: string | null;
}) {
  const [stari, setStari] = useState<Record<number, StarePrezenta>>(
    stariInitiale,
  );
  const [stare, actiune, seTrimite] = useActionState<
    StareFoaieSlujire,
    FormData
  >(salveazaFoaiaSlujirii.bind(null, programareId), {});

  const numere = useMemo(() => {
    const toate = persoane.map((p) => stari[p.id]);
    return {
      prezenti: toate.filter((v) => v === "prezent").length,
      anuntati: toate.filter((v) => v === "motivat").length,
      absenti: toate.filter((v) => v === "absent").length,
      nemarcati: toate.filter((v) => v === undefined).length,
    };
  }, [persoane, stari]);

  function seteaza(persoanaId: number, valoare: StarePrezenta) {
    setStari((vechi) => ({ ...vechi, [persoanaId]: valoare }));
  }

  function totiPrezenti() {
    setStari((vechi) => {
      const noi = { ...vechi };
      for (const p of persoane) noi[p.id] = "prezent";
      return noi;
    });
  }

  const dinGrupa = persoane.filter((p) => p.sursa === "grupa");
  const dinEchipa = persoane.filter((p) => p.sursa === "echipa");

  return (
    <form action={actiune} className="flex flex-col gap-4 pb-28">
      <input type="hidden" name="stari" value={JSON.stringify(stari)} />

      {persoane.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={totiPrezenti}
            className="buton buton-secundar buton-mic"
          >
            Toți au venit
          </button>
        </div>
      )}

      {persoane.length === 0 && (
        <div className="card p-5 text-center text-sm text-cenusiu">
          Nu e nimeni pe lista slujirii ăsteia. Dacă slujește o grupă, adaugă
          pulsiști în ea; dacă slujește o echipă, adaugă-i oameni.
        </div>
      )}

      {dinGrupa.length > 0 && (
        <ul className="flex flex-col gap-2">
          {dinGrupa.map((p) => (
            <RandPrezenta
              key={p.id}
              nume={p.nume}
              aleasa={stari[p.id]}
              onAlege={(v) => seteaza(p.id, v)}
            />
          ))}
        </ul>
      )}

      {dinEchipa.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 pt-2">
            <h2 className="text-sm font-bold">
              {numeEchipa ? `Din echipa ${numeEchipa}` : "Din echipă"}
            </h2>
            <span className="text-xs text-cenusiu">nu sunt din grupa ta</span>
          </div>
          <ul className="flex flex-col gap-2">
            {dinEchipa.map((p) => (
              <RandPrezenta
                key={p.id}
                nume={p.nume}
                aleasa={stari[p.id]}
                punctat
                onAlege={(v) => seteaza(p.id, v)}
              />
            ))}
          </ul>
        </section>
      )}

      {persoane.length > 0 && (
        <div className="card p-4">
          <label className="eticheta" htmlFor="nota">
            Cum a fost slujirea (opțional)
          </label>
          <textarea
            id="nota"
            name="nota"
            className="camp min-h-24"
            maxLength={2000}
            defaultValue={notaInitiala ?? ""}
            placeholder="Cum s-au descurcat, ce a mers, ce ai observat..."
          />
        </div>
      )}

      {/* Bara de salvare, lipită jos - la fel ca la grupa mică. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e3e7f2] bg-hartie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            <span className="font-semibold text-albastru">
              {numere.prezenti} au venit
            </span>
            <span className="text-cenusiu">
              {" "}
              · {numere.anuntati} anunțați · {numere.absenti} absenți
            </span>
            {numere.nemarcati > 0 && (
              <span className="block text-xs text-red-600">
                {numere.nemarcati} nemarcați
              </span>
            )}
            {stare.eroare && (
              <span className="block text-xs text-red-700">{stare.eroare}</span>
            )}
            {stare.salvatLa && !stare.eroare && (
              <span className="block text-xs text-green-700">
                Salvat. {stare.prezenti} au venit din {stare.total}.
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={
              seTrimite || persoane.length === 0 || numere.nemarcati > 0
            }
            className="buton buton-principal shrink-0"
          >
            {seTrimite
              ? "Salvez..."
              : existaDeja
                ? "Salvează"
                : "Salvează prezența"}
          </button>
        </div>
      </div>
    </form>
  );
}
