"use client";

import { useActionState, useState } from "react";

import { inchide, type StareInchidere } from "@/app/(aplicatie)/admin/an/actions";
import { CampData } from "@/componente/CampData";
import { etichetaClasaScurta } from "@/lib/util/etichete";

type Iese = { id: number; nume: string; clasa: number | null; grupa: string | null };

/**
 * Formularul de închidere a anului: perioada, ce se schimbă (toate bifate
 * din start), cine iese din Puls și, la sfârșit, confirmarea scrisă.
 */
export function FormularInchidereAn({
  deLa,
  panaLa,
  ies,
  urca,
  faraClasa,
  grupe,
  cuGrupa,
  zilePlan,
}: {
  deLa: string;
  panaLa: string;
  ies: Iese[];
  urca: number;
  faraClasa: number;
  grupe: { id: number; nume: string; pulsisti: number; lideri: string[] }[];
  cuGrupa: number;
  zilePlan: number;
}) {
  const [stare, trimite, seTrimite] = useActionState<StareInchidere, FormData>(
    inchide,
    {},
  );
  const [urcaClasa, setUrcaClasa] = useState(true);
  const [scris, setScris] = useState("");
  const [inceput, setInceput] = useState(deLa);
  const [sfarsit, setSfarsit] = useState(panaLa);
  const nume = `${inceput.slice(0, 4)}-${sfarsit.slice(0, 4)}`;
  const potrivit = scris.trim() === nume;

  return (
    <form
      action={trimite}
      className="flex flex-col gap-4"
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        if (t.name === "deLa" && t.value) setInceput(t.value);
        if (t.name === "panaLa" && t.value) setSfarsit(t.value);
      }}
    >
      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">1. Anul care se încheie</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Statisticile anului se socotesc pe perioada asta și se păstrează așa cum
          sunt azi.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eticheta" htmlFor="deLa">
              De la
            </label>
            <CampData id="deLa" name="deLa" defaultValue={deLa} required />
          </div>
          <div>
            <label className="eticheta" htmlFor="panaLa">
              Până la
            </label>
            <CampData id="panaLa" name="panaLa" defaultValue={panaLa} required />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-4">
        <h2 className="text-sm font-bold">2. Ce se schimbă pentru anul nou</h2>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="urcaClasa"
            value="da"
            checked={urcaClasa}
            onChange={(e) => setUrcaClasa(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-albastru"
          />
          <span className="text-sm">
            <strong>Toată lumea urcă o clasă.</strong>{" "}
            <span className="text-cenusiu">
              {urca} {urca === 1 ? "pulsist urcă" : "pulsiști urcă"} în clasa
              următoare.
              {faraClasa > 0 &&
                ` ${faraClasa} n-au clasa scrisă și rămân cum sunt.`}
            </span>
          </span>
        </label>

        {urcaClasa && ies.length > 0 && (
          <div className="ml-8 rounded-xl bg-fundal p-3">
            <p className="mb-2 text-xs text-cenusiu">
              Termină clasa a VIII-a, deci ies din Puls: devin inactivi, fără
              grupă, cu tot istoricul păstrat. Debifează-i pe cei care rămân
              totuși (vor fi trecuți în clasa a IX-a).
            </p>
            <ul className="flex flex-col gap-1.5">
              {ies.map((m) => (
                <li key={m.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="iesiti"
                      value={m.id}
                      defaultChecked
                      className="h-4 w-4 accent-albastru"
                    />
                    <span className="min-w-0 flex-1 truncate">{m.nume}</span>
                    <span className="shrink-0 text-xs text-cenusiu">
                      {[etichetaClasaScurta(m.clasa), m.grupa ?? "fără grupă"].join(" · ")}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="reformeaza"
            value="da"
            defaultChecked
            className="mt-1 h-5 w-5 shrink-0 accent-albastru"
          />
          <span className="text-sm">
            <strong>Grupele se reformează.</strong>{" "}
            <span className="text-cenusiu">
              {grupe.length} {grupe.length === 1 ? "grupă se arhivează" : "grupe se arhivează"},
              iar {cuGrupa} pulsiști trec la Nerepartizați, ca să faceți grupele
              anului nou. Liderii se desprind de grupele vechi și îi repartizați
              din nou. Istoricul prezențelor rămâne.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="inchidePlanul"
            value="da"
            defaultChecked={zilePlan > 0}
            disabled={zilePlan === 0}
            className="mt-1 h-5 w-5 shrink-0 accent-albastru"
          />
          <span className="text-sm">
            <strong>Planul de citire se închide.</strong>{" "}
            <span className="text-cenusiu">
              {zilePlan > 0
                ? `Cele ${zilePlan} zile ale planului și cât a citit fiecare rămân în arhiva anului; apoi puneți planul nou.`
                : "Nu e niciun plan încărcat."}
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
        <h2 className="mb-1 text-sm font-bold text-red-800">3. Confirmă</h2>
        <p className="mb-3 text-xs text-red-800/90">
          Schimbările de mai sus nu se pot anula dintr-un buton. Înainte de ele,
          o copie a bazei pleacă pe email la administratori (dacă emailul e
          pornit) - dar descarcă și tu una din Siguranța datelor, ca să fii
          sigur.
        </p>
        <label className="eticheta" htmlFor="confirmare">
          Scrie „{nume}” ca să închizi anul
        </label>
        <input
          id="confirmare"
          name="confirmare"
          className="camp"
          value={scris}
          onChange={(e) => setScris(e.target.value)}
          autoComplete="off"
          placeholder={nume}
        />
        {stare.eroare && <p className="mt-2 text-sm text-red-700">{stare.eroare}</p>}
        <button
          type="submit"
          disabled={!potrivit || seTrimite}
          className="buton mt-3 bg-red-700 text-white"
        >
          {seTrimite ? "Închid anul..." : `Închide anul ${nume}`}
        </button>
      </section>
    </form>
  );
}
