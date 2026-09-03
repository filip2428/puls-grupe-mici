"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { stergeIntalnire } from "@/app/(aplicatie)/calendar/actions";
import {
  FormularIntalnire,
  type IntalnireDeEditat,
} from "@/componente/FormularIntalnire";
import type { ElementCalendar } from "@/lib/interogari/calendar";
import { ZILE_SCURTE, dataLunga, dataScurta } from "@/lib/util/date";

export type GrupaDePrezenta = { id: number; nume: string };

/**
 * Calendarul lunii.
 *
 * Grila vine gata calculată de pe server; aici se schimbă doar ziua deschisă.
 * Motivul e simplu: pe telefon, apăsarea pe o zi trebuie să răspundă pe loc,
 * iar o lună întreagă de întâlniri e oricum mică - câteva zeci de rânduri -
 * deci n-are rost un drum până la server pentru fiecare atingere.
 */
export function Calendar({
  luna,
  azi,
  zile,
  elemente,
  esteAdmin,
  grupeleMele,
  ziInitiala,
}: {
  luna: string;
  azi: string;
  /** Zilele grilei, cu tot cu cele din lunile vecine care întregesc săptămânile. */
  zile: string[];
  elemente: ElementCalendar[];
  esteAdmin: boolean;
  /** Grupele la care cel care se uită poate face prezența. */
  grupeleMele: GrupaDePrezenta[];
  ziInitiala: string;
}) {
  const [ziAleasa, setZiAleasa] = useState(ziInitiala);

  const peZi = useMemo(() => {
    const harta = new Map<string, ElementCalendar[]>();
    for (const e of elemente) {
      const lista = harta.get(e.data);
      if (lista) lista.push(e);
      else harta.set(e.data, [e]);
    }
    return harta;
  }, [elemente]);

  const aleZilei = peZi.get(ziAleasa) ?? [];

  return (
    <>
      <div className="card p-3">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {ZILE_SCURTE.map((z) => (
            <div
              key={z}
              className="text-center text-[11px] font-semibold text-cenusiu"
            >
              {z}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {zile.map((zi) => (
            <Zi
              key={zi}
              zi={zi}
              inLuna={zi.slice(0, 7) === luna}
              esteAzi={zi === azi}
              aleasa={zi === ziAleasa}
              elemente={peZi.get(zi) ?? []}
              onAlege={() => setZiAleasa(zi)}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#eef1f7] pt-3 text-[11px] text-cenusiu">
          <Explicatie culoare="bg-lime" text="pe grupe mici" />
          <Explicatie culoare="bg-albastru" text="toți împreună" />
          <Explicatie culoare="bg-albastru-deschis" text="slujire" />
        </div>
      </div>

      {/* Ziua deschisă */}
      <section className="card p-4">
        <h2 className="text-sm font-bold">
          {ziAleasa === azi ? "Azi" : dataLunga(ziAleasa)}
        </h2>

        {aleZilei.length === 0 ? (
          <p className="mt-2 text-sm text-cenusiu">
            Nu e nimic în calendar în ziua asta.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-[#eef1f7]">
            {aleZilei.map((e) => (
              <li key={e.cheie} className="py-3 first:pt-0 last:pb-0">
                <RandZi
                  element={e}
                  azi={azi}
                  esteAdmin={esteAdmin}
                  grupeleMele={grupeleMele}
                />
              </li>
            ))}
          </ul>
        )}

        {esteAdmin && (
          <details className="mt-3 border-t border-[#eef1f7] pt-2">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-albastru">
              + Adaugă o întâlnire pe {dataScurta(ziAleasa)}
            </summary>
            <div className="pt-2">
              {/*
                Cheia e ziua: când coordonatorul deschide altă zi, formularul
                se face din nou, cu data ei - altfel ar rămâne cu ziua veche
                scrisă în el.
              */}
              <FormularIntalnire key={ziAleasa} data={ziAleasa} />
            </div>
          </details>
        )}
      </section>
    </>
  );
}

/** O căsuță din grilă: numărul zilei și bulinele a ce se întâmplă în ea. */
function Zi({
  zi,
  inLuna,
  esteAzi,
  aleasa,
  elemente,
  onAlege,
}: {
  zi: string;
  inLuna: boolean;
  esteAzi: boolean;
  aleasa: boolean;
  elemente: ElementCalendar[];
  onAlege: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAlege}
      aria-pressed={aleasa}
      aria-label={`${dataLunga(zi)}${
        elemente.length > 0 ? `, ${elemente.length} în calendar` : ""
      }`}
      className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border py-1 ${
        aleasa ? "border-albastru bg-albastru/10" : "border-transparent"
      } ${esteAzi && !aleasa ? "bg-fundal" : ""}`}
    >
      <span
        className={`text-sm leading-none ${
          esteAzi ? "font-bold text-albastru" : ""
        } ${inLuna ? "" : "text-cenusiu/50"}`}
      >
        {Number(zi.slice(8))}
      </span>
      <span className="flex h-1.5 items-center gap-0.5">
        {elemente.slice(0, 3).map((e) => (
          <span
            key={e.cheie}
            className={`h-1.5 w-1.5 rounded-full ${culoarea(e)} ${
              inLuna ? "" : "opacity-40"
            }`}
          />
        ))}
        {elemente.length > 3 && (
          <span className="text-[9px] leading-none text-cenusiu">+</span>
        )}
      </span>
    </button>
  );
}

/** Culoarea bulinei: verde pe grupe mici, albastru toți împreună, deschis la slujiri. */
function culoarea(e: ElementCalendar): string {
  if (e.fel === "slujire") return "bg-albastru-deschis";
  return e.peGrupeMici ? "bg-lime" : "bg-albastru";
}

function Explicatie({ culoare, text }: { culoare: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${culoare}`} />
      {text}
    </span>
  );
}

/** Un rând din ziua deschisă: ce e, la ce oră și ce are liderul de făcut. */
function RandZi({
  element: e,
  azi,
  esteAdmin,
  grupeleMele,
}: {
  element: ElementCalendar;
  azi: string;
  esteAdmin: boolean;
  grupeleMele: GrupaDePrezenta[];
}) {
  const detaliu = [e.ora ? `ora ${e.ora}` : "", e.locatie ?? "", e.cine ?? ""]
    .filter(Boolean)
    .join(" · ");
  const aVenitZiua = e.data <= azi;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{e.titlu}</span>
        <Eticheta element={e} />
      </div>
      {detaliu && <p className="text-xs text-cenusiu">{detaliu}</p>}
      {e.detalii && <p className="mt-0.5 text-xs text-cenusiu">{e.detalii}</p>}

      {e.fel === "slujire" && aVenitZiua && (
        <Link
          href={`/slujiri/programare/${e.id}/prezenta`}
          className={`buton buton-mic mt-2 ${
            e.prezentaFacuta ? "buton-secundar" : "buton-principal"
          }`}
        >
          {e.prezentaFacuta ? "Vezi prezența" : "Fă prezența la slujire"}
        </Link>
      )}

      {/*
        Prezența la grupă are rost doar în serile în care chiar se stă pe
        grupe mici. La gamenight n-are cine s-o facă și pe cine s-o treacă.
      */}
      {e.fel === "eveniment" &&
        e.peGrupeMici &&
        aVenitZiua &&
        grupeleMele.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {grupeleMele.map((g) => (
              <Link
                key={g.id}
                href={`/grupe/${g.id}/prezenta?data=${e.data}`}
                className="buton buton-mic buton-secundar"
              >
                Prezența la {g.nume}
              </Link>
            ))}
          </div>
        )}

      {esteAdmin && e.fel === "eveniment" && <UneltiCoordonator element={e} />}
    </div>
  );
}

/** Eticheta colorată care spune dintr-o privire ce fel de zi e. */
function Eticheta({ element: e }: { element: ElementCalendar }) {
  if (e.fel === "slujire") {
    return (
      <span className="rounded-full bg-albastru-deschis/15 px-2 py-0.5 text-[11px] font-semibold text-albastru">
        slujire
      </span>
    );
  }
  return e.peGrupeMici ? (
    <span className="rounded-full bg-lime/40 px-2 py-0.5 text-[11px] font-semibold text-carbune">
      pe grupe mici
    </span>
  ) : (
    <span className="rounded-full bg-fundal px-2 py-0.5 text-[11px] font-semibold text-cenusiu">
      toți împreună
    </span>
  );
}

/** Modificarea și scoaterea din calendar - se văd doar la coordonator. */
function UneltiCoordonator({ element: e }: { element: ElementCalendar }) {
  const deEditat: IntalnireDeEditat = {
    id: e.id,
    data: e.data,
    titlu: e.titlu,
    ora: e.ora,
    locatie: e.locatie,
    detalii: e.detalii,
    peGrupeMici: e.peGrupeMici,
  };

  return (
    <div className="mt-2">
      <details>
        <summary className="cursor-pointer py-1 text-xs text-albastru">
          modifică
        </summary>
        <div className="pt-2 pb-1">
          <FormularIntalnire data={e.data} deEditat={deEditat} />
        </div>
      </details>

      <form action={stergeIntalnire.bind(null, e.id)}>
        <button type="submit" className="py-1 text-xs text-red-700 underline">
          scoate din calendar
        </button>
      </form>
    </div>
  );
}
