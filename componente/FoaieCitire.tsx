"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  salveazaCitirea,
  type StareFoaieCitire,
} from "@/app/(aplicatie)/grupe/[id]/citire/actions";
import { CULORI_STARE, ETICHETE_STARE, type StareCitire } from "@/lib/citire";
import { ZILE_SCURTE } from "@/lib/util/date";

type Zi = { data: string; portiune: string | null };

type Rand = {
  id: number;
  nume: string;
  bifate: string[];
  deLa: string | null;
  inUrma: number;
  stare: StareCitire;
};

/**
 * Foaia de citit a unei grupe pe o săptămână: pulsiștii pe rânduri, zilele pe
 * coloane. O bifă = a citit porția zilei.
 *
 * Zilele fără porție și cele care n-au venit încă nu se pot bifa. Zilele de
 * dinainte de startul cuiva se pot bifa (a citit și de acolo), dar sunt
 * desenate mai stins: nu i se cer.
 */
export function FoaieCitire({
  grupaId,
  luni,
  azi,
  zile,
  randuri,
  existaDeja,
}: {
  grupaId: number;
  luni: string;
  azi: string;
  zile: Zi[];
  randuri: Rand[];
  existaDeja: boolean;
}) {
  const [bife, setBife] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(randuri.map((r) => [r.id, r.bifate])),
  );
  const [stare, actiune, seTrimite] = useActionState<StareFoaieCitire, FormData>(
    salveazaCitirea.bind(null, grupaId, luni),
    {},
  );

  const deBifat = zile.filter((z) => z.portiune && z.data <= azi);

  const numere = useMemo(() => {
    let bifate = 0;
    for (const r of randuri) bifate += (bife[r.id] ?? []).length;
    return { bifate, posibile: randuri.length * deBifat.length };
  }, [bife, randuri, deBifat.length]);

  function comuta(membruId: number, data: string) {
    setBife((vechi) => {
      const lista = vechi[membruId] ?? [];
      return {
        ...vechi,
        [membruId]: lista.includes(data)
          ? lista.filter((d) => d !== data)
          : [...lista, data],
      };
    });
  }

  /** Apăsat pe capul coloanei: toți au citit ziua aia - sau, dacă deja toți, nimeni. */
  function comutaZiua(data: string) {
    setBife((vechi) => {
      const totiAu = randuri.every((r) => (vechi[r.id] ?? []).includes(data));
      const noi = { ...vechi };
      for (const r of randuri) {
        const lista = (noi[r.id] ?? []).filter((d) => d !== data);
        noi[r.id] = totiAu ? lista : [...lista, data];
      }
      return noi;
    });
  }

  return (
    <form action={actiune} className="flex flex-col gap-4 pb-32">
      <input type="hidden" name="bife" value={JSON.stringify(bife)} />

      {/* Ce se citește în fiecare zi */}
      <section className="card p-3">
        <h2 className="mb-2 text-xs font-bold text-cenusiu uppercase">
          Porțiile săptămânii
        </h2>
        <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          {zile.map((z, i) => (
            <li key={z.data} className="flex gap-2">
              <span
                className={`w-12 shrink-0 text-cenusiu ${z.data === azi ? "font-bold text-albastru" : ""}`}
              >
                {ZILE_SCURTE[i]} {Number(z.data.slice(8))}
              </span>
              <span className={z.portiune ? "font-medium" : "text-cenusiu italic"}>
                {z.portiune ?? "fără porție"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Grila */}
      <section className="card p-2">
        <div className="flex items-end gap-1 border-b border-[#eef1f7] pb-2">
          <span className="min-w-0 flex-1 px-1 text-xs text-cenusiu">
            Apasă pe o zi ca s-o bifezi la toți
          </span>
          {zile.map((z, i) => {
            const activa = z.portiune !== null && z.data <= azi;
            return (
              <button
                key={z.data}
                type="button"
                disabled={!activa}
                onClick={() => comutaZiua(z.data)}
                className={`flex w-9 shrink-0 flex-col items-center rounded-md py-1 text-[11px] leading-tight ${
                  activa ? "text-carbune active:bg-fundal" : "text-cenusiu/60"
                } ${z.data === azi ? "font-bold text-albastru" : ""}`}
              >
                <span>{ZILE_SCURTE[i]}</span>
                <span>{Number(z.data.slice(8))}</span>
              </button>
            );
          })}
        </div>

        <ul className="flex flex-col divide-y divide-[#eef1f7]">
          {randuri.map((r) => (
            <li key={r.id} className="flex items-center gap-1 py-1.5">
              <Link
                href={`/membri/${r.id}`}
                className="min-w-0 flex-1 px-1"
              >
                <span className="block truncate text-sm font-medium">{r.nume}</span>
                <span
                  className={`mt-0.5 inline-block rounded-full px-1.5 text-[10px] leading-4 ${CULORI_STARE[r.stare]}`}
                >
                  {r.stare === "putin" || r.stare === "mult"
                    ? `${r.inUrma} în urmă`
                    : ETICHETE_STARE[r.stare]}
                </span>
              </Link>
              {zile.map((z) => {
                const activa = z.portiune !== null && z.data <= azi;
                const bifat = (bife[r.id] ?? []).includes(z.data);
                const optionala = r.deLa !== null && z.data < r.deLa;
                if (!activa) {
                  return (
                    <span
                      key={z.data}
                      className="flex h-9 w-9 shrink-0 items-center justify-center text-cenusiu/40"
                    >
                      ·
                    </span>
                  );
                }
                return (
                  <button
                    key={z.data}
                    type="button"
                    onClick={() => comuta(r.id, z.data)}
                    aria-pressed={bifat}
                    aria-label={`${r.nume}, ${z.portiune}`}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-base font-bold transition-colors ${
                      bifat
                        ? optionala
                          ? "border-albastru/40 bg-albastru/40 text-white"
                          : "border-albastru bg-albastru text-white"
                        : optionala
                          ? "border-dashed border-[#d5dbe8] bg-hartie"
                          : "border-[#d5dbe8] bg-hartie"
                    }`}
                  >
                    {bifat ? "✓" : ""}
                  </button>
                );
              })}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-cenusiu">
        Căsuțele punctate sunt de dinainte de ziua de la care i se socotește
        cititul - le poți bifa, dar nu intră în socoteală. Starea de sub nume se
        actualizează după salvare.
      </p>

      {/* Bara de salvare, lipită jos */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e3e7f2] bg-hartie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            <span className="font-semibold text-albastru">
              {numere.bifate} porții bifate
            </span>
            {numere.posibile > 0 && (
              <span className="text-cenusiu"> din {numere.posibile}</span>
            )}
            {stare.eroare && (
              <span className="block text-xs text-red-700">{stare.eroare}</span>
            )}
            {stare.salvatLa && !stare.eroare && (
              <span className="block text-xs text-green-700">Salvat.</span>
            )}
          </div>
          <button
            type="submit"
            disabled={seTrimite || deBifat.length === 0}
            className="buton buton-principal shrink-0"
          >
            {seTrimite ? "Salvez..." : existaDeja ? "Salvează" : "Salvează cititul"}
          </button>
        </div>
      </div>
    </form>
  );
}
