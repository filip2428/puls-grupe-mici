import Link from "next/link";

import { Icoana } from "@/componente/Icoane";
import { ceruteLider } from "@/lib/auth/sesiune";
import { grupeAccesibile, type GrupaAccesibila } from "@/lib/interogari/acces";
import { grupeCuPrezentaLa } from "@/lib/interogari/grupe";
import { intalnirileCuTotiDin } from "@/lib/interogari/prezenta-eveniment";
import {
  rezumatGrupe,
  type RezumatGrupaAdmin,
} from "@/lib/interogari/statistici";
import { dataAzi, dataLunga, dataScurta } from "@/lib/util/date";

export const metadata = { title: "Grupele mele · Puls" };

export default async function PaginaGrupe() {
  const lider = await ceruteLider();
  const esteAdmin = lider.rol === "admin";
  const grupe = await grupeAccesibile(lider);
  const azi = dataAzi();

  const [rezumate, cuPrezentaAzi, cuTotiAzi] = await Promise.all([
    rezumatGrupe({ ids: grupe.map((g) => g.id) }),
    grupeCuPrezentaLa(
      grupe.map((g) => g.id),
      azi,
    ),
    intalnirileCuTotiDin(azi),
  ]);
  const dupaId = new Map(rezumate.map((r) => [r.grupaId, r]));

  /*
    Un lider are o singură grupă a lui și, cel mult, ține locul la altele.
    Le ținem despărțite pe ecran: ce e al tău sus, ce e împrumutat dedesubt,
    cu chenar punctat și cu data până când. Altfel, într-o listă la rând, a
    treia săptămână de înlocuire arată exact ca grupa ta.
  */
  const aleMele = grupe.filter((g) => !g.prinInlocuire);
  const inlocuiri = grupe.filter((g) => g.prinInlocuire);

  return (
    <>
      <div className="mb-5">
        {/* Ziua de azi, sus: prezența de azi e motivul pentru care deschizi aplicația. */}
        <p className="mb-1 text-sm font-semibold text-cenusiu first-letter:uppercase">
          {dataLunga(azi)}
        </p>
        <h1 className="titlu-pagina">
          {esteAdmin
            ? "Toate grupele"
            : aleMele.length === 1
              ? "Grupa mea"
              : "Grupele mele"}
        </h1>
        <p className="mt-1 text-sm text-cenusiu">
          {esteAdmin
            ? "Alege grupa ca să faci prezența sau să vezi istoricul."
            : aleMele.length === 0 && inlocuiri.length > 0
              ? "Deocamdată ții doar locul altcuiva."
              : "Alege grupa ca să faci prezența sau să vezi istoricul."}
        </p>

        {/* Drumul scurt către cifrele pe o perioadă - un an bisericesc, de obicei. */}
        {grupe.length > 0 && (
          <Link
            href="/statistici"
            className="buton buton-secundar buton-mic mt-3"
          >
            <Icoana nume="grafic" marime={16} />
            Statistici pe o perioadă
          </Link>
        )}
      </div>

      {/*
        În ziua unei întâlniri cu toți, drumul spre prezența ei stă primul:
        liderul care deschide aplicația la ușă n-are timp să caute prin
        calendar, iar prezența pe grupă nu e ce trebuie în seara aia.
      */}
      {cuTotiAzi.map((e) => (
        <section
          key={e.id}
          className="mb-4 flex flex-col gap-3 rounded-[var(--radius-card)] bg-linear-to-br from-albastru to-albastru-inchis p-4 text-white shadow-[0_12px_28px_-16px_rgb(43_50_141/0.8)]"
        >
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-lime uppercase">
              <Icoana nume="calendar" marime={14} grosime={2.2} />
              Azi, toți împreună{e.ora ? ` · ora ${e.ora}` : ""}
            </p>
            <h2 className="mt-1.5 text-lg leading-snug font-bold">{e.titlu}</h2>
            <p className="mt-0.5 text-sm text-white/75">
              {e.veniti > 0
                ? `${e.veniti} au venit până acum.`
                : "Prezența se face pe întâlnire, nu pe grupe."}
            </p>
          </div>
          <Link
            href={`/calendar/${e.id}/prezenta`}
            className={`buton ${
              e.veniti > 0
                ? "border border-white/25 bg-white/10 text-white"
                : "bg-lime text-carbune"
            }`}
          >
            <Icoana nume="bifa" marime={18} grosime={2.2} />
            {e.veniti > 0 ? "Continuă prezența" : "Fă prezența la întâlnire"}
          </Link>
        </section>
      ))}

      {grupe.length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-8 text-center text-sm text-cenusiu">
          <span className="icoana-sectiune h-12 w-12 rounded-2xl">
            <Icoana nume="grupe" marime={24} />
          </span>
          Nu ești repartizat încă la nicio grupă. Vorbește cu coordonatorul
          lucrării.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {aleMele.map((g) => (
          <CardGrupa
            key={g.id}
            grupa={g}
            rezumat={dupaId.get(g.id)}
            prezentaFacuta={cuPrezentaAzi.has(g.id)}
            azi={azi}
          />
        ))}
      </ul>

      {inlocuiri.length > 0 && (
        <section className="mt-7">
          <h2 className="titlu-sectiune">Ții locul la</h2>
          <p className="mt-1 mb-3 text-xs text-cenusiu">
            Nu sunt grupele tale. Cât ține înlocuirea poți face prezența și
            vedea istoricul, exact ca liderul lor - se va vedea că ai completat
            tu.
          </p>
          <ul className="flex flex-col gap-3">
            {inlocuiri.map((g) => (
              <CardGrupa
                key={g.id}
                grupa={g}
                rezumat={dupaId.get(g.id)}
                prezentaFacuta={cuPrezentaAzi.has(g.id)}
                azi={azi}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Un card de grupă din listă. Punctat, dacă e o grupă la care doar ții locul. */
function CardGrupa({
  grupa: g,
  rezumat: r,
  prezentaFacuta,
  azi,
}: {
  grupa: GrupaAccesibila;
  rezumat: RezumatGrupaAdmin | undefined;
  prezentaFacuta: boolean;
  azi: string;
}) {
  return (
    <li
      className={`card overflow-hidden ${
        g.prinInlocuire ? "border-dashed border-linie-tare" : ""
      }`}
    >
      <Link href={`/grupe/${g.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg leading-snug font-bold tracking-tight">
                {g.nume}
              </h2>
              {g.prinInlocuire && (
                <span className="rounded-full bg-lime-pal px-2 py-0.5 text-[11px] font-semibold text-carbune ring-1 ring-lime">
                  până {dataScurta(g.inlocuirePanaLa!)}
                </span>
              )}
              {!g.activa && (
                <span className="rounded-full bg-fundal px-2 py-0.5 text-[11px] font-semibold text-cenusiu">
                  inactivă
                </span>
              )}
            </div>
            {(g.oraIntalnire || g.locatie) && (
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-cenusiu">
                {g.oraIntalnire && (
                  <span className="flex items-center gap-1">
                    <Icoana nume="ceas" marime={15} />
                    ora {g.oraIntalnire}
                  </span>
                )}
                {g.locatie && (
                  <span className="flex min-w-0 items-center gap-1">
                    <Icoana nume="loc" marime={15} />
                    <span className="truncate">{g.locatie}</span>
                  </span>
                )}
              </p>
            )}
          </div>

          {r?.alerte ? (
            <span
              className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"
              title="Pulsiști care au lipsit de mai multe ori la rând"
            >
              <Icoana nume="alerta" marime={14} grosime={2.2} />
              {r.alerte} de căutat
            </span>
          ) : (
            <Icoana
              nume="inainte"
              marime={20}
              className="mt-1 shrink-0 text-cenusiu"
            />
          )}
        </div>

        {/* Cifrele grupei, mari, ca să le prinzi dintr-o privire. */}
        <dl className="mt-3 grid grid-cols-3 divide-x divide-linie rounded-2xl bg-fundal py-2.5 text-center">
          <Cifra valoare={String(r?.membriActivi ?? 0)} eticheta="pulsiști" />
          <Cifra
            valoare={
              r?.mediePrezenta !== null && r?.mediePrezenta !== undefined
                ? `${r.mediePrezenta}%`
                : "–"
            }
            eticheta="prezență medie"
          />
          <Cifra
            valoare={r?.ultimaIntalnire ? dataScurta(r.ultimaIntalnire) : "–"}
            eticheta={
              r?.ultimaIntalnire && r.prezentiUltima !== null
                ? `ultima · ${r.prezentiUltima} prezenți`
                : "ultima întâlnire"
            }
          />
        </dl>
      </Link>

      <div className="px-4 pb-4">
        <Link
          href={`/grupe/${g.id}/prezenta?data=${azi}`}
          className={`buton w-full ${prezentaFacuta ? "buton-secundar" : "buton-principal"}`}
        >
          <Icoana nume={prezentaFacuta ? "foaie" : "bifa"} marime={18} grosime={2.1} />
          {prezentaFacuta ? "Modifică prezența de azi" : "Fă prezența de azi"}
        </Link>
      </div>
    </li>
  );
}

/** O cifră din rândul de sub numele grupei: valoarea mare, eticheta dedesubt. */
function Cifra({ valoare, eticheta }: { valoare: string; eticheta: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse px-1.5">
      <dt className="truncate text-[11px] text-cenusiu">{eticheta}</dt>
      <dd className="truncate text-base font-bold text-carbune">{valoare}</dd>
    </div>
  );
}
