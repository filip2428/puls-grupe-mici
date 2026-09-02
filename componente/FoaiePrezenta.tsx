"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  salveazaFoaia,
  type StarePrezentaFormular,
} from "@/app/(aplicatie)/grupe/[id]/prezenta/actions";
import type { StarePrezenta } from "@/lib/db/schema";

type MembruScurt = { id: number; nume: string };

const OPTIUNI: { valoare: StarePrezenta; eticheta: string; clase: string }[] = [
  {
    valoare: "prezent",
    eticheta: "Prezent",
    clase: "bg-albastru text-white border-albastru",
  },
  {
    valoare: "motivat",
    eticheta: "Anunțat",
    clase: "bg-lime text-carbune border-lime",
  },
  {
    valoare: "absent",
    eticheta: "Absent",
    clase: "bg-carbune text-white border-carbune",
  },
];

/**
 * Foaia de prezență: pentru fiecare adolescent alegi Prezent / Anunțat / Absent.
 * „Anunțat" înseamnă că a spus dinainte că lipsește.
 */
export function FoaiePrezenta({
  grupaId,
  data,
  membri,
  stariInitiale,
  subiectInitial,
  notaInitiala,
  invitatiInitiali,
  existaDeja,
}: {
  grupaId: number;
  data: string;
  membri: MembruScurt[];
  stariInitiale: Record<number, StarePrezenta>;
  subiectInitial: string | null;
  notaInitiala: string | null;
  invitatiInitiali: number;
  existaDeja: boolean;
}) {
  const [stari, setStari] = useState<Record<number, StarePrezenta>>(stariInitiale);
  const [stare, actiune, seTrimite] = useActionState<
    StarePrezentaFormular,
    FormData
  >(salveazaFoaia.bind(null, grupaId), {});

  const numere = useMemo(() => {
    const valori = membri.map((m) => stari[m.id]);
    return {
      prezenti: valori.filter((v) => v === "prezent").length,
      anuntati: valori.filter((v) => v === "motivat").length,
      absenti: valori.filter((v) => v === "absent").length,
      nemarcati: valori.filter((v) => v === undefined).length,
    };
  }, [membri, stari]);

  function seteaza(membruId: number, valoare: StarePrezenta) {
    setStari((vechi) => ({ ...vechi, [membruId]: valoare }));
  }

  function totiPrezenti() {
    const noi: Record<number, StarePrezenta> = { ...stari };
    for (const m of membri) noi[m.id] = "prezent";
    setStari(noi);
  }

  return (
    <form action={actiune} className="flex flex-col gap-4 pb-28">
      <input type="hidden" name="data" value={data} />
      <input type="hidden" name="stari" value={JSON.stringify(stari)} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-cenusiu">
          {membri.length} adolescenți în grupă
        </p>
        <button
          type="button"
          onClick={totiPrezenti}
          className="rounded-lg border border-[#d7dced] bg-hartie px-3 py-1.5 text-sm font-medium"
        >
          Toți prezenți
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {membri.map((m) => {
          const aleasa = stari[m.id];
          return (
            <li key={m.id} className="card p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-base font-medium">{m.nume}</span>
                {aleasa === undefined && (
                  <span className="shrink-0 text-xs text-red-600">nemarcat</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {OPTIUNI.map((o) => {
                  const activa = aleasa === o.valoare;
                  return (
                    <button
                      key={o.valoare}
                      type="button"
                      onClick={() => seteaza(m.id, o.valoare)}
                      aria-pressed={activa}
                      className={`rounded-lg border px-2 py-2.5 text-sm font-semibold transition ${
                        activa
                          ? o.clase
                          : "border-[#e3e7f2] bg-fundal text-cenusiu"
                      }`}
                    >
                      {o.eticheta}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      {membri.length === 0 && (
        <div className="card p-5 text-center text-sm text-cenusiu">
          Grupa nu are adolescenți încă.{" "}
          <Link href={`/grupe/${grupaId}`} className="text-albastru underline">
            Adaugă-i din pagina grupei.
          </Link>
        </div>
      )}

      <div className="card flex flex-col gap-3 p-4">
        <div>
          <label className="eticheta" htmlFor="subiect">
            Subiectul întâlnirii (opțional)
          </label>
          <input
            id="subiect"
            name="subiect"
            className="camp"
            maxLength={120}
            defaultValue={subiectInitial ?? ""}
            placeholder="ex. Rugăciunea"
          />
        </div>
        <div>
          <label className="eticheta" htmlFor="nota">
            Cum a fost întâlnirea (opțional)
          </label>
          <textarea
            id="nota"
            name="nota"
            className="camp min-h-24"
            maxLength={2000}
            defaultValue={notaInitiala ?? ""}
            placeholder="Ce a mers bine, ce ai observat, pentru ce te rogi..."
          />
        </div>
        <div className="w-40">
          <label className="eticheta" htmlFor="numarInvitati">
            Invitați noi
          </label>
          <input
            id="numarInvitati"
            name="numarInvitati"
            type="number"
            min={0}
            max={200}
            className="camp"
            defaultValue={invitatiInitiali}
          />
        </div>
      </div>

      {/* Bara de salvare, lipită jos */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e3e7f2] bg-hartie/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            <span className="font-semibold text-albastru">
              {numere.prezenti} prezenți
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
                Salvat. {stare.prezenti} prezenți din {stare.total}.
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={seTrimite || membri.length === 0 || numere.nemarcati > 0}
            className="shrink-0 rounded-xl bg-albastru px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {seTrimite ? "Salvez..." : existaDeja ? "Salvează modificările" : "Salvează prezența"}
          </button>
        </div>
      </div>
    </form>
  );
}
