import Link from "next/link";

import { CampData } from "@/componente/CampData";
import { ceruteLider } from "@/lib/auth/sesiune";
import { grupeAccesibile } from "@/lib/interogari/acces";
import {
  prezentaDinSeara,
  zileleCuPrezenta,
  type GrupaInSeara,
  type OmLaSeara,
} from "@/lib/interogari/seara";
import {
  ZILE_SAPTAMANA,
  dataAzi,
  dataLunga,
  dataScurta,
  esteDataValida,
  ziSaptamanii,
} from "@/lib/util/date";

export const metadata = { title: "Prezența pe o seară · Puls" };

/** Câte seri stau în rândul de sus; mai vechi se ajunge cu săgețile. */
const SERI_IN_RAND = 10;

export default async function PaginaSeara({
  searchParams,
}: PageProps<"/statistici/seara">) {
  const lider = await ceruteLider();
  const cerute = await searchParams;

  const grupele = await grupeAccesibile(lider);
  const grupaIds =
    lider.rol === "admin" ? undefined : grupele.map((g) => g.id);

  const azi = dataAzi();
  const zile = await zileleCuPrezenta(azi, grupaIds);

  const cerut = typeof cerute.data === "string" ? cerute.data : "";
  // Fără o zi cerută, cea mai nouă seară cu prezență - de obicei vinerea trecută.
  const data = esteDataValida(cerut) ? cerut : (zile[0] ?? azi);

  const s = await prezentaDinSeara(data, grupaIds);

  // Zilele sunt de la cea mai nouă la cea mai veche.
  const maiVeche = zile.find((z) => z < data);
  const maiNoua = [...zile].reverse().find((z) => z > data);
  const inRand = zile.slice(0, SERI_IN_RAND);

  const nimic = s.grupe.length === 0 && s.cuToti.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/statistici" className="inapoi">
          Statistici
        </Link>
        <h1 className="titlu-pagina">Prezența pe o seară</h1>
        <p className="text-sm text-cenusiu">
          Cine a fost, grupă cu grupă. Alege seara de mai jos.
        </p>
      </div>

      <section className="card flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <Sageata
            catre={maiVeche}
            eticheta="Seara dinainte"
            semn="‹"
          />
          <div className="min-w-0 text-center">
            <div className="truncate font-bold">{dataLunga(data)}</div>
            {s.grupe.length > 0 && (
              <div className="text-xs text-cenusiu">
                {s.grupe.length}{" "}
                {s.grupe.length === 1 ? "grupă a făcut" : "grupe au făcut"}{" "}
                prezența
              </div>
            )}
          </div>
          <Sageata catre={maiNoua} eticheta="Seara de după" semn="›" />
        </div>

        {inRand.length > 0 && (
          /*
            Rândul se derulează în cutia lui; pe telefon încap vreo cinci
            seri, restul sunt la o glisare.
          */
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {inRand.map((z) => (
              <li key={z} className="shrink-0">
                <Link
                  href={`/statistici/seara?data=${z}`}
                  aria-current={z === data ? "date" : undefined}
                  className={`flex min-h-11 flex-col items-center justify-center rounded-xl px-3 py-1 text-xs font-semibold ${
                    z === data ? "bg-albastru text-white" : "bg-fundal text-cenusiu"
                  }`}
                >
                  <span>{dataScurta(z)}</span>
                  <span className="font-normal opacity-80">
                    {ZILE_SAPTAMANA[ziSaptamanii(z)].slice(0, 3)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <details className="border-t border-linie pt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-cenusiu">
            Altă zi
          </summary>
          <form
            action="/statistici/seara"
            className="flex items-end gap-2 pt-1"
          >
            <div className="flex-1">
              <label className="eticheta" htmlFor="data">
                Ziua
              </label>
              <CampData id="data" name="data" defaultValue={data} max={azi} />
            </div>
            <button type="submit" className="buton buton-principal">
              Arată
            </button>
          </form>
        </details>
      </section>

      {nimic ? (
        <div className="card p-6 text-center text-sm text-cenusiu">
          În ziua asta nu s-a făcut prezența nicăieri.
        </div>
      ) : (
        <>
          {s.grupe.length > 0 && (
            /*
              Două cifre, spuse separat: câți oameni au fost în seara aia
              (cu musafiri cu tot) și cum au venit membrii grupelor - procentul
              rămâne doar pe membri, ca în restul statisticilor.
            */
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="card p-4">
                <h2 className="titlu-sectiune">Prezența totală</h2>
                <div className="mt-1 text-3xl font-bold text-albastru tabular-nums">
                  {s.total.prezenti + s.total.musafiri}
                </div>
                <p className="text-xs text-cenusiu">
                  {s.total.prezenti}{" "}
                  {s.total.prezenti === 1 ? "membru" : "membri"} și{" "}
                  {s.total.musafiri}{" "}
                  {s.total.musafiri === 1 ? "musafir" : "musafiri"}
                </p>
              </div>
              <div className="card p-4">
                <h2 className="titlu-sectiune">Prezența la grupele mici</h2>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-albastru tabular-nums">
                    {s.total.procent !== null ? `${s.total.procent}%` : "-"}
                  </span>
                  <span className="text-sm text-cenusiu tabular-nums">
                    {s.total.prezenti} din{" "}
                    {s.total.prezenti + s.total.auAnuntat + s.total.absenti}{" "}
                    membri
                  </span>
                </div>
                <p className="text-xs text-cenusiu">
                  {s.total.auAnuntat} au anunțat · {s.total.absenti}{" "}
                  {s.total.absenti === 1 ? "absent" : "absenți"} · fără
                  musafiri
                </p>
              </div>
            </section>
          )}

          {s.grupe.map((g) => (
            <CardGrupa key={g.grupaId} g={g} data={data} />
          ))}

          {s.total.musafiri > 0 && (
            <section className="card p-4">
              <h2 className="titlu-sectiune">
                Musafiri ({s.total.musafiri})
              </h2>
              <p className="mb-2 text-xs text-cenusiu">
                Cine a trecut pragul în seara asta, și la ce grupă.
              </p>
              <ul className="flex flex-col divide-y divide-linie">
                {s.grupe.flatMap((g) =>
                  g.musafiri.map((o) => (
                    <li key={`${g.grupaId}-${o.membruId}`} className="py-2">
                      <Link
                        href={`/membri/${o.membruId}`}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="truncate text-sm font-medium">
                          {o.nume}
                        </span>
                        <span className="shrink-0 text-xs text-cenusiu">
                          {g.nume}
                        </span>
                      </Link>
                    </li>
                  )),
                )}
              </ul>
            </section>
          )}

          {s.faraPrezenta.length > 0 && (
            <section className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
              <h2 className="text-sm font-bold text-red-800">
                Fără prezență în ziua asta ({s.faraPrezenta.length})
              </h2>
              <p className="mb-2 text-xs text-red-700/80">
                N-au completat încă, sau nu s-au întâlnit.
              </p>
              <ul className="flex flex-wrap gap-2">
                {s.faraPrezenta.map((g) => (
                  <li key={g.grupaId}>
                    <Link
                      href={`/grupe/${g.grupaId}/prezenta?data=${data}`}
                      className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-xs font-semibold text-red-800"
                    >
                      {g.nume}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {s.cuToti.length > 0 && (
            <section className="card p-4">
              <h2 className="titlu-sectiune">Cu toți, în aceeași zi</h2>
              <p className="mb-2 text-xs text-cenusiu">
                {grupaIds
                  ? "Câți au venit din grupele tale. Apasă ca să vezi cine."
                  : "Câți au venit. Apasă ca să vezi cine."}
              </p>
              <ul className="flex flex-col divide-y divide-linie">
                {s.cuToti.map((e) => (
                  <li key={e.id} className="py-2">
                    <Link
                      href={`/calendar/${e.id}/prezenta`}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="truncate text-sm font-medium">
                        {e.titlu}
                      </span>
                      <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                        {e.veniti} au venit
                        {e.musafiri > 0 && (
                          <span className="block text-xs font-normal text-cenusiu">
                            dintre ei {e.musafiri}{" "}
                            {e.musafiri === 1 ? "musafir" : "musafiri"}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Sageata({
  catre,
  eticheta,
  semn,
}: {
  catre: string | undefined;
  eticheta: string;
  semn: string;
}) {
  const clase =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none";
  if (!catre) {
    return (
      <span aria-hidden className={`${clase} text-linie-tare`}>
        {semn}
      </span>
    );
  }
  return (
    <Link
      href={`/statistici/seara?data=${catre}`}
      aria-label={`${eticheta}: ${dataScurta(catre)}`}
      className={`${clase} bg-fundal text-albastru`}
    >
      {semn}
    </Link>
  );
}

/**
 * O grupă din seara aleasă. Cifrele se văd din prima; numele, la o apăsare -
 * altfel, cu zece grupe, pagina ar fi o listă lungă de oameni.
 */
function CardGrupa({ g, data }: { g: GrupaInSeara; data: string }) {
  const membri = g.prezenti.length + g.auAnuntat.length + g.absenti.length;

  return (
    <section className="card p-4">
      <details>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{g.nume}</span>
            <span className="block truncate text-xs text-cenusiu">
              {g.prezenti.length + g.musafiri.length} în total ·{" "}
              {g.prezenti.length} din {membri} membri
              {g.musafiri.length > 0 &&
                ` · ${g.musafiri.length} ${g.musafiri.length === 1 ? "musafir" : "musafiri"}`}
              {g.auAnuntat.length > 0 && ` · ${g.auAnuntat.length} au anunțat`}
              {g.subiect ? ` · ${g.subiect}` : ""}
            </span>
          </span>
          <span className="shrink-0 text-lg font-bold tabular-nums text-albastru">
            {g.procent !== null ? `${g.procent}%` : "-"}
          </span>
        </summary>

        <div className="mt-2 flex flex-col gap-3 border-t border-linie pt-3">
          <Nume titlu="Prezenți" oameni={g.prezenti} />
          <Nume titlu="Au anunțat" oameni={g.auAnuntat} />
          <Nume titlu="Absenți" oameni={g.absenti} accent />
          <Nume titlu="Musafiri" oameni={g.musafiri} />
          <Link
            href={`/grupe/${g.grupaId}/prezenta?data=${data}`}
            className="text-xs font-semibold text-albastru"
          >
            Deschide foaia de prezență
          </Link>
        </div>
      </details>
    </section>
  );
}

function Nume({
  titlu,
  oameni,
  accent,
}: {
  titlu: string;
  oameni: OmLaSeara[];
  accent?: boolean;
}) {
  if (oameni.length === 0) return null;
  return (
    <div>
      <h3
        className={`mb-1 text-xs font-semibold ${accent ? "text-red-800" : "text-cenusiu"}`}
      >
        {titlu} ({oameni.length})
      </h3>
      <ul className="flex flex-wrap gap-1.5">
        {oameni.map((o) => (
          <li key={o.membruId}>
            <Link
              href={`/membri/${o.membruId}`}
              className="inline-flex min-h-8 items-center rounded-full bg-fundal px-2.5 text-xs"
            >
              {o.nume}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
