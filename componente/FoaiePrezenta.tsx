"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";

import {
  adaugaMusafir,
  salveazaFoaia,
  type StareMusafir,
  type StarePrezentaFormular,
} from "@/app/(aplicatie)/grupe/[id]/prezenta/actions";
import type { StarePrezenta } from "@/lib/db/schema";

type PersoanaScurta = { id: number; nume: string };

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
 *
 * Musafirii stau într-o listă separată, sub grupă: ei nu fac parte din grupă
 * până când nu sunt primiți oficial, dar prezența lor se notează la fel.
 */
export function FoaiePrezenta({
  grupaId,
  data,
  membri,
  musafiriInitiali,
  stariInitiale,
  subiectInitial,
  notaInitiala,
  existaDeja,
}: {
  grupaId: number;
  data: string;
  membri: PersoanaScurta[];
  musafiriInitiali: PersoanaScurta[];
  stariInitiale: Record<number, StarePrezenta>;
  subiectInitial: string | null;
  notaInitiala: string | null;
  existaDeja: boolean;
}) {
  const [stari, setStari] = useState<Record<number, StarePrezenta>>(stariInitiale);
  const [musafiri, setMusafiri] = useState<PersoanaScurta[]>(musafiriInitiali);
  const [stare, actiune, seTrimite] = useActionState<
    StarePrezentaFormular,
    FormData
  >(salveazaFoaia.bind(null, grupaId), {});

  const numere = useMemo(() => {
    const aleMembrilor = membri.map((m) => stari[m.id]);
    const aleMusafirilor = musafiri.map((m) => stari[m.id]);
    const toate = [...aleMembrilor, ...aleMusafirilor];
    return {
      prezenti: toate.filter((v) => v === "prezent").length,
      anuntati: toate.filter((v) => v === "motivat").length,
      absenti: toate.filter((v) => v === "absent").length,
      nemarcati: aleMembrilor.filter((v) => v === undefined).length,
    };
  }, [membri, musafiri, stari]);

  function seteaza(persoanaId: number, valoare: StarePrezenta) {
    setStari((vechi) => ({ ...vechi, [persoanaId]: valoare }));
  }

  function totiPrezenti() {
    setStari((vechi) => {
      const noi = { ...vechi };
      for (const m of membri) noi[m.id] = "prezent";
      return noi;
    });
  }

  function musafirNou(persoana: PersoanaScurta) {
    setMusafiri((lista) =>
      lista.some((m) => m.id === persoana.id) ? lista : [...lista, persoana],
    );
    seteaza(persoana.id, "prezent");
  }

  return (
    <form action={actiune} className="flex flex-col gap-4 pb-32">
      <input type="hidden" name="data" value={data} />
      <input type="hidden" name="stari" value={JSON.stringify(stari)} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-cenusiu">{membri.length} în grupă</p>
        <button
          type="button"
          onClick={totiPrezenti}
          className="buton buton-secundar buton-mic"
        >
          Toți prezenți
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {membri.map((m) => (
          <RandPrezenta
            key={m.id}
            nume={m.nume}
            aleasa={stari[m.id]}
            onAlege={(v) => seteaza(m.id, v)}
          />
        ))}
      </ul>

      {membri.length === 0 && (
        <div className="card p-5 text-center text-sm text-cenusiu">
          Grupa nu are adolescenți încă.{" "}
          <Link href={`/grupe/${grupaId}`} className="text-albastru underline">
            Adaugă-i din pagina grupei.
          </Link>
        </div>
      )}

      {/* Musafirii */}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 pt-2">
          <h2 className="text-sm font-bold">Musafiri</h2>
          <span className="text-xs text-cenusiu">nu intră în statistici</span>
        </div>

        {musafiri.length === 0 && (
          <p className="text-sm text-cenusiu">
            Dacă a venit cineva nou, adaugă-l aici. Rămâne musafir până când
            grupa hotărăște că e parte din ea.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {musafiri.map((m) => (
            <RandPrezenta
              key={m.id}
              nume={m.nume}
              aleasa={stari[m.id]}
              musafir
              onAlege={(v) => seteaza(m.id, v)}
            />
          ))}
        </ul>

        <FormularMusafir grupaId={grupaId} onAdaugat={musafirNou} />
      </section>

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
      </div>

      {/* Bara de salvare, lipită jos */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e3e7f2] bg-hartie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
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
            className="buton buton-principal shrink-0"
          >
            {seTrimite ? "Salvez..." : existaDeja ? "Salvează" : "Salvează prezența"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Un rând din foaie: numele și cele trei butoane. */
function RandPrezenta({
  nume,
  aleasa,
  musafir,
  onAlege,
}: {
  nume: string;
  aleasa: StarePrezenta | undefined;
  musafir?: boolean;
  onAlege: (valoare: StarePrezenta) => void;
}) {
  return (
    <li className={`card p-3 ${musafir ? "border-dashed" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-base font-medium">{nume}</span>
        {aleasa === undefined && !musafir && (
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
              onClick={() => onAlege(o.valoare)}
              aria-pressed={activa}
              className={`min-h-11 rounded-lg border px-2 text-sm font-semibold transition ${
                activa ? o.clase : "border-[#e3e7f2] bg-fundal text-cenusiu"
              }`}
            >
              {o.eticheta}
            </button>
          );
        })}
      </div>
    </li>
  );
}

/**
 * Caseta „a venit cineva nou" - creează musafirul fără să reîncarce foaia.
 *
 * Nu folosim un <form> aici: caseta stă în interiorul foii de prezență, iar
 * HTML-ul nu permite formulare unul în altul. Apelăm acțiunea de pe server
 * direct, ca pe o funcție obișnuită.
 */
function FormularMusafir({
  grupaId,
  onAdaugat,
}: {
  grupaId: number;
  onAdaugat: (musafir: PersoanaScurta) => void;
}) {
  const [deschis, setDeschis] = useState(false);
  const [nume, setNume] = useState("");
  const [telefon, setTelefon] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [seTrimite, startTransition] = useTransition();

  function trimite() {
    setEroare(null);
    startTransition(async () => {
      const date = new FormData();
      date.set("nume", nume);
      date.set("telefon", telefon);
      const rezultat = await adaugaMusafir(grupaId, {}, date);
      if (rezultat.eroare) {
        setEroare(rezultat.eroare);
        return;
      }
      if (rezultat.musafir) {
        onAdaugat(rezultat.musafir);
        setNume("");
        setTelefon("");
        setDeschis(false);
      }
    });
  }

  if (!deschis) {
    return (
      <button
        type="button"
        onClick={() => setDeschis(true)}
        className="buton buton-secundar w-full border-dashed"
      >
        + A venit un musafir
      </button>
    );
  }

  return (
    <div className="card flex flex-col gap-2 border-dashed p-3">
      <input
        className="camp"
        placeholder="Numele musafirului"
        value={nume}
        onChange={(e) => setNume(e.target.value)}
        maxLength={80}
        autoFocus
      />
      <input
        className="camp"
        inputMode="tel"
        placeholder="Telefon (opțional)"
        value={telefon}
        onChange={(e) => setTelefon(e.target.value)}
        maxLength={30}
      />
      {eroare && <p className="text-sm text-red-700">{eroare}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={trimite}
          disabled={seTrimite || nume.trim().length < 2}
          className="buton buton-principal flex-1"
        >
          {seTrimite ? "Adaug..." : "Adaugă musafirul"}
        </button>
        <button
          type="button"
          onClick={() => setDeschis(false)}
          className="buton buton-secundar"
        >
          Renunț
        </button>
      </div>
    </div>
  );
}
