"use client";

import { useRouter } from "next/navigation";
import { useOffline } from "next/offline";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  adaugaMusafirLaIntalnire,
  bifeaza,
  inchidePrezenta,
  type RezultatBifa,
  type RezultatMusafir,
} from "@/app/(aplicatie)/calendar/[id]/prezenta/actions";
import type { PersoanaLaIntalnire } from "@/lib/interogari/prezenta-eveniment";
import { normalizeaza } from "@/lib/util/text";

type Filtru = "toti" | "venit" | "lipsa";

type Sectiune = {
  cheie: string;
  titlu: string;
  aMea: boolean;
  persoane: PersoanaLaIntalnire[];
};

/**
 * Foaia de prezență de la o întâlnire cu toți.
 *
 * Seamănă puțin cu celelalte două foi, dar e gândită pentru ușă, nu pentru
 * cerc: o sută și ceva de nume, câțiva lideri care bifează deodată și copii
 * care intră câte trei. De-aia:
 *  - se bifează doar cine a venit, dintr-o atingere pe tot rândul;
 *  - sus stă căutarea, care rămâne pe ecran când derulezi;
 *  - fiecare bifă pleacă pe loc la server, fără buton de salvare, iar ce se
 *    întoarce e lista la zi, cu bifele celorlalți lideri cu tot.
 *
 * Până răspunde serverul, bifa se vede deja pusă (în `asteptare`). Dacă nu se
 * poate salva, dispare și apare motivul jos.
 */
export function FoaieIntalnire({
  evenimentId,
  persoane,
  venitInitial,
  grupeleMele,
}: {
  evenimentId: number;
  persoane: PersoanaLaIntalnire[];
  venitInitial: number[];
  /** Grupele liderului, puse primele pe listă. Gol la admin. */
  grupeleMele: number[];
}) {
  const router = useRouter();
  const faraSemnal = useOffline();

  const [venit, setVenit] = useState(() => new Set(venitInitial));
  /*
    Când pagina vine din nou de la server (a adăugat cineva un musafir,
    telefonul s-a trezit din buzunar), pornim de la bifele de acolo - sunt
    mai noi decât ce țineam noi minte.
  */
  const [dinServer, setDinServer] = useState(venitInitial);
  if (dinServer !== venitInitial) {
    setDinServer(venitInitial);
    setVenit(new Set(venitInitial));
  }

  /*
    Bifele atinse care n-au primit încă răspuns. `nr` deosebește atingerile
    între ele: la o dublă atingere rapidă, răspunsul primei nu trebuie să
    șteargă din așteptare pe a doua.
  */
  const [asteptare, setAsteptare] = useState(
    () => new Map<number, { valoare: boolean; nr: number }>(),
  );
  const numarator = useRef(0);
  const [eroare, setEroare] = useState<string | null>(null);

  const [adaugati, setAdaugati] = useState<PersoanaLaIntalnire[]>([]);
  const [cautare, setCautare] = useState("");
  const [filtru, setFiltru] = useState<Filtru>("toti");
  const [formular, setFormular] = useState<{ nume: string } | null>(null);

  // Cine a lăsat telefonul și s-a întors găsește și bifele celorlalți.
  useEffect(() => {
    function laRevenire() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", laRevenire);
    return () => document.removeEventListener("visibilitychange", laRevenire);
  }, [router]);

  const toate = useMemo(() => {
    const dejaAici = new Set(persoane.map((p) => p.id));
    return [...persoane, ...adaugati.filter((p) => !dejaAici.has(p.id))];
  }, [persoane, adaugati]);

  const bifati = useMemo(() => {
    const s = new Set(venit);
    for (const [id, a] of asteptare) {
      if (a.valoare) s.add(id);
      else s.delete(id);
    }
    return s;
  }, [venit, asteptare]);

  const veniti = toate.filter((p) => bifati.has(p.id));
  const musafiriVeniti = veniti.filter((p) => p.musafir).length;

  async function comuta(id: number) {
    const valoare = !bifati.has(id);
    const nr = ++numarator.current;
    setAsteptare((m) => new Map(m).set(id, { valoare, nr }));
    setEroare(null);

    let r: RezultatBifa;
    try {
      r = await bifeaza(evenimentId, id, valoare);
    } catch {
      r = { eroare: "Bifa nu s-a salvat. Mai încearcă o dată." };
    }

    if (r.venit) {
      setVenit(new Set(r.venit));
      // A bifat cineva un musafir pe care noi nu-l avem încă pe listă.
      const cunoscuti = new Set(toate.map((p) => p.id));
      if (r.venit.some((v) => !cunoscuti.has(v))) router.refresh();
    }
    if (r.eroare) setEroare(r.eroare);
    setAsteptare((m) => {
      if (m.get(id)?.nr !== nr) return m;
      const fara = new Map(m);
      fara.delete(id);
      return fara;
    });
  }

  async function adaugaMusafir(
    nume: string,
    telefon: string,
    oricum: boolean,
  ): Promise<RezultatMusafir> {
    let r: RezultatMusafir;
    try {
      r = await adaugaMusafirLaIntalnire(evenimentId, { nume, telefon, oricum });
    } catch {
      return { eroare: "Nu s-a salvat. Mai încearcă o dată." };
    }
    if (r.musafir) {
      const nou = r.musafir;
      setAdaugati((l) => [...l, nou]);
      if (r.venit) setVenit(new Set(r.venit));
      setCautare("");
      setFormular(null);
    }
    return r;
  }

  const potrivire = (p: PersoanaLaIntalnire) =>
    filtru === "toti" ||
    (filtru === "venit" ? bifati.has(p.id) : !bifati.has(p.id));

  const cautat = normalizeaza(cautare);
  const gasiti = cautat
    ? toate
        .filter((p) => normalizeaza(p.nume).includes(cautat))
        .sort((a, b) => a.nume.localeCompare(b.nume, "ro"))
    : [];

  const sectiuni = useMemo(
    () => imparteInSectiuni(toate, grupeleMele),
    [toate, grupeleMele],
  );

  const detaliu = (p: PersoanaLaIntalnire, cuGrupa: boolean) =>
    [cuGrupa ? (p.grupaNume ?? "fără grupă") : "", p.musafir ? "musafir" : ""]
      .filter(Boolean)
      .join(" · ");

  const rand = (p: PersoanaLaIntalnire, cuGrupa: boolean) => (
    <RandVenit
      key={p.id}
      nume={p.nume}
      detaliu={detaliu(p, cuGrupa)}
      venit={bifati.has(p.id)}
      punctat={p.musafir}
      seSalveaza={asteptare.has(p.id)}
      onComuta={() => comuta(p.id)}
    />
  );

  const FILTRE: { valoare: Filtru; text: string }[] = [
    { valoare: "toti", text: `Toți (${toate.length})` },
    { valoare: "venit", text: `Au venit (${veniti.length})` },
    { valoare: "lipsa", text: `Lipsesc (${toate.length - veniti.length})` },
  ];

  return (
    <div className="flex flex-col gap-4 pb-32">
      <p className="rounded-xl bg-albastru/10 px-3 py-2 text-xs text-albastru">
        Atinge numele celor care au venit. Fiecare bifă se salvează pe loc, iar
        ce bifează alți lideri în același timp se adună cu ale tale.
      </p>

      {/* Căutarea rămâne sus cât derulezi - la ușă cauți, nu derulezi. */}
      <div className="sticky top-[49px] z-10 -mx-4 flex flex-col gap-2 bg-fundal/95 px-4 py-2 backdrop-blur">
        <input
          type="search"
          className="camp"
          placeholder="Caută după nume"
          value={cautare}
          onChange={(e) => setCautare(e.target.value)}
          aria-label="Caută după nume"
          enterKeyHint="search"
          autoComplete="off"
        />
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-hartie p-1">
          {FILTRE.map((f) => (
            <button
              key={f.valoare}
              type="button"
              onClick={() => setFiltru(f.valoare)}
              aria-pressed={filtru === f.valoare}
              className={`min-h-9 rounded-lg px-1 text-xs font-semibold ${
                filtru === f.valoare
                  ? "bg-albastru text-white"
                  : "text-cenusiu"
              }`}
            >
              {f.text}
            </button>
          ))}
        </div>
      </div>

      {cautat ? (
        <section className="flex flex-col gap-2">
          <ul className="flex flex-col gap-2">
            {gasiti.filter(potrivire).map((p) => rand(p, true))}
          </ul>
          {gasiti.length === 0 && !formular && (
            <div className="card flex flex-col gap-3 p-4 text-sm text-cenusiu">
              <p>Nu e nimeni cu numele ăsta pe listă.</p>
              <button
                type="button"
                onClick={() => setFormular({ nume: cautare.trim() })}
                className="buton buton-secundar border-dashed"
              >
                + Adaugă „{cautare.trim()}” ca musafir
              </button>
            </div>
          )}
          {gasiti.length > 0 && gasiti.filter(potrivire).length === 0 && (
            <p className="text-sm text-cenusiu">
              {filtru === "venit"
                ? "Cei găsiți nu sunt bifați încă."
                : "Cei găsiți sunt deja bifați."}
            </p>
          )}
        </section>
      ) : (
        sectiuni.map((s) => {
          const aiLor = s.persoane.filter(potrivire);
          if (aiLor.length === 0) return null;
          const venitiAici = s.persoane.filter((p) => bifati.has(p.id)).length;
          return (
            <section key={s.cheie} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2 pt-1">
                <h2 className="text-sm font-bold">
                  {s.titlu}
                  {s.aMea && (
                    <span className="ml-2 text-xs font-normal text-cenusiu">
                      grupa ta
                    </span>
                  )}
                </h2>
                <span className="shrink-0 text-xs text-cenusiu">
                  {venitiAici} din {s.persoane.length}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {aiLor.map((p) => rand(p, false))}
              </ul>
            </section>
          );
        })
      )}

      {!cautat && filtru === "venit" && veniti.length === 0 && (
        <p className="card p-5 text-center text-sm text-cenusiu">
          Nu e bifat nimeni încă.
        </p>
      )}

      {toate.length === 0 && (
        <p className="card p-5 text-center text-sm text-cenusiu">
          Nu e niciun pulsist în aplicație încă. Musafirii se pot adăuga mai
          jos.
        </p>
      )}

      {/* Musafirii: cine a venit prima dată. */}
      {formular ? (
        <FormularMusafir
          key={formular.nume}
          numeInitial={formular.nume}
          onAdauga={adaugaMusafir}
          onEsteDeja={(id) => {
            if (!bifati.has(id)) comuta(id);
            setCautare("");
            setFormular(null);
          }}
          onRenunta={() => setFormular(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setFormular({ nume: "" })}
          className="buton buton-secundar w-full border-dashed"
        >
          + A venit cineva nou
        </button>
      )}

      {/* Bara de jos: câți au venit și dacă s-a salvat tot. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e3e7f2] bg-hartie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            <span className="font-semibold text-albastru">
              {veniti.length} au venit
            </span>
            {musafiriVeniti > 0 && (
              <span className="text-cenusiu">
                {" "}
                · dintre ei {musafiriVeniti}{" "}
                {musafiriVeniti === 1 ? "musafir" : "musafiri"}
              </span>
            )}
            {eroare ? (
              <span className="block text-xs text-red-700">{eroare}</span>
            ) : asteptare.size > 0 ? (
              <span className="block text-xs text-cenusiu">
                {faraSemnal
                  ? `${asteptare.size} ${asteptare.size === 1 ? "bifă așteaptă" : "bife așteaptă"} semnal`
                  : "Se salvează..."}
              </span>
            ) : (
              <span className="block text-xs text-green-700">
                Totul e salvat.
              </span>
            )}
          </div>
          <form action={inchidePrezenta.bind(null, evenimentId)}>
            <button type="submit" className="buton buton-principal shrink-0">
              Gata
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Grupele liderului întâi, apoi celelalte după nume, iar la sfârșit cei
 * fără grupă - de obicei musafirii de la întâlnirile trecute.
 */
function imparteInSectiuni(
  toate: PersoanaLaIntalnire[],
  grupeleMele: number[],
): Sectiune[] {
  const mele = new Set(grupeleMele);
  const dupaGrupa = new Map<string, Sectiune>();

  for (const p of toate) {
    const cheie = p.grupaId === null ? "fara" : String(p.grupaId);
    let s = dupaGrupa.get(cheie);
    if (!s) {
      s = {
        cheie,
        titlu: p.grupaNume ?? "Fără grupă",
        aMea: p.grupaId !== null && mele.has(p.grupaId),
        persoane: [],
      };
      dupaGrupa.set(cheie, s);
    }
    s.persoane.push(p);
  }

  for (const s of dupaGrupa.values()) {
    s.persoane.sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
  }

  return [...dupaGrupa.values()].sort(
    (a, b) =>
      Number(b.aMea) - Number(a.aMea) ||
      Number(a.cheie === "fara") - Number(b.cheie === "fara") ||
      a.titlu.localeCompare(b.titlu, "ro"),
  );
}

/** Un nume de pe listă. Tot rândul e bifa - la ușă nu ochești un pătrățel. */
function RandVenit({
  nume,
  detaliu,
  venit,
  punctat,
  seSalveaza,
  onComuta,
}: {
  nume: string;
  detaliu: string;
  venit: boolean;
  punctat: boolean;
  seSalveaza: boolean;
  onComuta: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onComuta}
        aria-pressed={venit}
        className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
          venit
            ? "border-albastru bg-albastru/10"
            : "border-[#e3e7f2] bg-hartie"
        } ${punctat && !venit ? "border-dashed" : ""}`}
      >
        <span
          aria-hidden
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
            venit
              ? "border-albastru bg-albastru text-white"
              : "border-[#cfd6e6] bg-hartie"
          }`}
        >
          {venit && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium">{nume}</span>
          {detaliu && (
            <span className="block truncate text-xs text-cenusiu">
              {detaliu}
            </span>
          )}
        </span>
        {seSalveaza && (
          <span className="shrink-0 text-[11px] text-cenusiu">se salvează</span>
        )}
      </button>
    </li>
  );
}

/**
 * „A venit cineva nou": numele, telefonul dacă îl dă, și gata - e bifat.
 *
 * Dacă pe listă e deja cineva cu același nume, întrebăm întâi: de cele mai
 * multe ori e chiar el, venit a doua oară, iar o fișă nouă ar face din el
 * doi oameni.
 */
function FormularMusafir({
  numeInitial,
  onAdauga,
  onEsteDeja,
  onRenunta,
}: {
  numeInitial: string;
  onAdauga: (
    nume: string,
    telefon: string,
    oricum: boolean,
  ) => Promise<RezultatMusafir>;
  onEsteDeja: (id: number) => void;
  onRenunta: () => void;
}) {
  const [nume, setNume] = useState(numeInitial);
  const [telefon, setTelefon] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [dublura, setDublura] = useState<PersoanaLaIntalnire | null>(null);
  const [seTrimite, startTransition] = useTransition();

  function trimite(oricum: boolean) {
    setEroare(null);
    startTransition(async () => {
      const r = await onAdauga(nume, telefon, oricum);
      if (r.eroare) setEroare(r.eroare);
      setDublura(r.dublura ?? null);
    });
  }

  return (
    <div className="card flex flex-col gap-2 border-dashed p-3">
      <p className="text-sm font-bold">A venit cineva nou</p>
      <p className="text-xs text-cenusiu">
        Rămâne musafir, fără grupă, și apare la Nerepartizați. Data viitoare
        îl găsești pe listă.
      </p>
      <input
        className="camp"
        placeholder="Numele și prenumele"
        value={nume}
        onChange={(e) => {
          setNume(e.target.value);
          setDublura(null);
        }}
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

      {dublura ? (
        <div className="flex flex-col gap-2 rounded-xl bg-lime/25 p-3 text-sm">
          <p>
            Pe listă e deja <strong>{dublura.nume}</strong> (
            {[dublura.grupaNume ?? "fără grupă", dublura.musafir ? "musafir" : ""]
              .filter(Boolean)
              .join(", ")}
            ).
          </p>
          <button
            type="button"
            onClick={() => onEsteDeja(dublura.id)}
            className="buton buton-principal"
          >
            E chiar el - bifează-l
          </button>
          <button
            type="button"
            onClick={() => trimite(true)}
            disabled={seTrimite}
            className="buton buton-secundar"
          >
            {seTrimite ? "Adaug..." : "E altcineva - adaugă-l"}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => trimite(false)}
            disabled={seTrimite || nume.trim().length < 2}
            className="buton buton-principal flex-1"
          >
            {seTrimite ? "Adaug..." : "Adaugă și bifează"}
          </button>
          <button
            type="button"
            onClick={onRenunta}
            className="buton buton-secundar"
          >
            Renunț
          </button>
        </div>
      )}
    </div>
  );
}
