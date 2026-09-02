import Link from "next/link";

import { ceruteLider } from "@/lib/auth/sesiune";
import { grupeAccesibile } from "@/lib/interogari/acces";
import {
  cautaAdolescenti,
  filtruDinParametri,
  type FiltruAdolescenti,
} from "@/lib/interogari/adolescenti";
import { CLASE, etichetaClasa, etichetaSex } from "@/lib/util/etichete";

export const metadata = { title: "Adolescenți · Puls" };

export default async function PaginaAdolescenti({
  searchParams,
}: PageProps<"/adolescenti">) {
  const lider = await ceruteLider();
  const parametri = await searchParams;
  const filtru = filtruDinParametri(parametri);

  const grupe = await grupeAccesibile(lider);
  if (lider.rol !== "admin") {
    filtru.grupePermise = grupe.map((g) => g.id);
  }

  const lista = await cautaAdolescenti(filtru);
  const membriNr = lista.filter((a) => a.status === "membru").length;
  const musafiriNr = lista.length - membriNr;

  const adresaExport = `/api/export/adolescenti?${sirDeParametri(filtru)}`;
  const areFiltre =
    !!filtru.q ||
    !!filtru.grupaId ||
    !!filtru.status ||
    !!filtru.sex ||
    !!filtru.clasa ||
    filtru.varstaMin !== undefined ||
    filtru.varstaMax !== undefined ||
    (filtru.activi ?? "activi") !== "activi";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Adolescenți</h1>
        <p className="text-sm text-cenusiu">
          {lider.rol === "admin"
            ? "Toți pulsiștii, cu filtre și export."
            : "Adolescenții din grupele tale."}
        </p>
      </div>

      {/* Căutare și filtre */}
      <form action="/adolescenti" className="card flex flex-col gap-3 p-4">
        <div className="flex gap-2">
          <input
            name="q"
            className="camp"
            placeholder="Caută după nume, telefon, părinte"
            defaultValue={filtru.q ?? ""}
            enterKeyHint="search"
          />
          <button type="submit" className="buton buton-principal shrink-0">
            Caută
          </button>
        </div>

        <details open={areFiltre}>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-albastru">
            Filtre
          </summary>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="col-span-2">
              <label className="eticheta" htmlFor="grupa">
                Grupa
              </label>
              <select
                id="grupa"
                name="grupa"
                className="camp"
                defaultValue={filtru.grupaId ?? ""}
              >
                <option value="">toate grupele</option>
                {grupe.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nume}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="eticheta" htmlFor="status">
                Statut
              </label>
              <select
                id="status"
                name="status"
                className="camp"
                defaultValue={filtru.status ?? ""}
              >
                <option value="">toți</option>
                <option value="membru">membri</option>
                <option value="musafir">musafiri</option>
              </select>
            </div>

            <div>
              <label className="eticheta" htmlFor="sex">
                Sex
              </label>
              <select
                id="sex"
                name="sex"
                className="camp"
                defaultValue={filtru.sex ?? ""}
              >
                <option value="">toți</option>
                <option value="baiat">băieți</option>
                <option value="fata">fete</option>
              </select>
            </div>

            <div>
              <label className="eticheta" htmlFor="clasa">
                Clasa
              </label>
              <select
                id="clasa"
                name="clasa"
                className="camp"
                defaultValue={filtru.clasa ?? ""}
              >
                <option value="">toate</option>
                {CLASE.map((c) => (
                  <option key={c} value={c}>
                    {etichetaClasa(c)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="eticheta" htmlFor="activi">
                Situație
              </label>
              <select
                id="activi"
                name="activi"
                className="camp"
                defaultValue={filtru.activi ?? "activi"}
              >
                <option value="activi">activi</option>
                <option value="inactivi">inactivi</option>
                <option value="toti">toți</option>
              </select>
            </div>

            <div>
              <label className="eticheta" htmlFor="varstaMin">
                Vârstă de la
              </label>
              <input
                id="varstaMin"
                name="varstaMin"
                type="number"
                min={5}
                max={30}
                className="camp"
                defaultValue={filtru.varstaMin ?? ""}
              />
            </div>

            <div>
              <label className="eticheta" htmlFor="varstaMax">
                până la
              </label>
              <input
                id="varstaMax"
                name="varstaMax"
                type="number"
                min={5}
                max={30}
                className="camp"
                defaultValue={filtru.varstaMax ?? ""}
              />
            </div>

            <div className="col-span-2 flex flex-wrap gap-2 pt-1">
              <button type="submit" className="buton buton-principal">
                Aplică filtrele
              </button>
              {areFiltre && (
                <Link href="/adolescenti" className="buton buton-secundar">
                  Șterge filtrele
                </Link>
              )}
            </div>
          </div>
        </details>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-cenusiu">
          <span className="font-semibold text-carbune">{lista.length}</span>{" "}
          {lista.length === 1 ? "adolescent" : "adolescenți"}
          {musafiriNr > 0 && ` · ${membriNr} membri, ${musafiriNr} musafiri`}
        </p>
        <a href={adresaExport} className="buton buton-secundar buton-mic">
          Descarcă în Excel
        </a>
      </div>

      <ul className="flex flex-col gap-2">
        {lista.map((a) => (
          <li key={a.id} className="card">
            <Link href={`/membri/${a.id}`} className="block p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {a.nume}
                    </span>
                    {a.status === "musafir" && (
                      <span className="rounded-full bg-lime/40 px-2 py-0.5 text-[11px] font-semibold">
                        musafir
                      </span>
                    )}
                    {!a.activ && (
                      <span className="rounded-full bg-fundal px-2 py-0.5 text-[11px] text-cenusiu">
                        inactiv
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-cenusiu">
                    {a.grupaNume}
                    {a.clasa ? ` · ${etichetaClasa(a.clasa)}` : ""}
                    {a.varsta !== null ? ` · ${a.varsta} ani` : ""}
                    {a.sex ? ` · ${etichetaSex(a.sex)}` : ""}
                  </span>
                  {(a.parinte1Nume || a.parinte2Nume) && (
                    <span className="mt-0.5 block text-xs text-cenusiu">
                      părinți: {[a.parinte1Nume, a.parinte2Nume].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
                {a.procent !== null && (
                  <span className="shrink-0 text-xs text-cenusiu">
                    {a.procent}%
                  </span>
                )}
              </div>
            </Link>
            {a.telefon && (
              <div className="flex gap-2 border-t border-[#eef1f7] px-3 py-2">
                <a
                  href={`tel:${a.telefon}`}
                  className="buton buton-secundar buton-mic"
                >
                  Sună
                </a>
                {a.parinte1Telefon && (
                  <a
                    href={`tel:${a.parinte1Telefon}`}
                    className="buton buton-secundar buton-mic"
                  >
                    Sună părintele
                  </a>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {lista.length === 0 && (
        <div className="card p-6 text-center text-sm text-cenusiu">
          Niciun adolescent nu se potrivește cu filtrele alese.
        </div>
      )}
    </div>
  );
}

/** Transformă filtrele înapoi în adresă, pentru linkul de export. */
function sirDeParametri(filtru: FiltruAdolescenti): string {
  const p = new URLSearchParams();
  if (filtru.q) p.set("q", filtru.q);
  if (filtru.grupaId) p.set("grupa", String(filtru.grupaId));
  if (filtru.status) p.set("status", filtru.status);
  if (filtru.sex) p.set("sex", filtru.sex);
  if (filtru.clasa) p.set("clasa", String(filtru.clasa));
  if (filtru.varstaMin !== undefined) p.set("varstaMin", String(filtru.varstaMin));
  if (filtru.varstaMax !== undefined) p.set("varstaMax", String(filtru.varstaMax));
  if (filtru.activi) p.set("activi", filtru.activi);
  return p.toString();
}
