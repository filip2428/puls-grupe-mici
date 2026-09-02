import Link from "next/link";
import { notFound } from "next/navigation";

import { primesteInGrupa } from "@/app/(aplicatie)/membri/[id]/actions";
import { anuleazaInlocuire } from "./actions";
import { FormularInlocuire } from "@/componente/FormularInlocuire";
import { FormularMembruNou } from "@/componente/FormularMembruNou";
import { RandProgramare } from "@/componente/RandProgramare";
import { ceruteLider } from "@/lib/auth/sesiune";
import {
  inlocuiriGrupa,
  liderilGrupei,
  liderilPotentiali,
  verificaAccesGrupa,
} from "@/lib/interogari/acces";
import {
  grupa as iaGrupa,
  intalniriGrupei,
  membriGrupei,
} from "@/lib/interogari/grupe";
import { programariGrupei, slujiriDeCompletat } from "@/lib/interogari/slujiri";
import { alerteAbsenteGrupa } from "@/lib/interogari/statistici";
import {
  ZILE_SAPTAMANA,
  dataAzi,
  dataLunga,
  dataScurta,
  varsta,
} from "@/lib/util/date";
import { etichetaClasaScurta } from "@/lib/util/etichete";

export default async function PaginaGrupa({ params }: PageProps<"/grupe/[id]">) {
  const { id } = await params;
  const grupaId = Number(id);
  if (!Number.isInteger(grupaId)) notFound();

  const lider = await ceruteLider();
  // Verificarea accesului și datele grupei nu depind una de alta: le cerem
  // odată. În producție baza de date e la distanță, deci fiecare întrebare
  // pusă separat înseamnă încă un drum dus-întors până la ea.
  const [acces, g] = await Promise.all([
    verificaAccesGrupa(lider, grupaId),
    iaGrupa(grupaId),
  ]);
  if (!acces.permis) notFound();
  if (!g) notFound();

  const azi = dataAzi();
  const [
    membri,
    musafiri,
    intalniri,
    alerte,
    lideri,
    inlocuiri,
    potentiali,
    slujiri,
    slujiriNecompletate,
  ] = await Promise.all([
    membriGrupei(grupaId),
    membriGrupei(grupaId, { status: "musafir" }),
    intalniriGrupei(grupaId, 10),
    alerteAbsenteGrupa(grupaId),
    liderilGrupei(grupaId),
    inlocuiriGrupa(grupaId),
    liderilPotentiali(grupaId),
    programariGrupei(grupaId, 4),
    slujiriDeCompletat(grupaId),
  ]);

  const necompletate = new Set(slujiriNecompletate.map((p) => p.id));
  const slujiriDeAratat = slujiri.filter((p) => !necompletate.has(p.id));

  const poateOrganiza = !acces.prinInlocuire || acces.esteAdmin;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/grupe" className="text-sm text-cenusiu">
          ← Grupele mele
        </Link>
        <h1 className="mt-2 text-xl font-bold">{g.nume}</h1>
        <p className="text-sm text-cenusiu">
          {g.ziIntalnire !== null && ZILE_SAPTAMANA[g.ziIntalnire]}
          {g.oraIntalnire ? `, ora ${g.oraIntalnire}` : ""}
          {g.locatie ? ` · ${g.locatie}` : ""}
          {` · ${membri.length} pulsiști`}
        </p>
        {acces.prinInlocuire && (
          <p className="mt-2 rounded-xl bg-lime/25 px-3 py-2 text-sm">
            Ești aici ca <strong>înlocuitor</strong>. Prezența pe care o
            completezi apare cu numele tău.
          </p>
        )}
      </div>

      {/* Prezența */}
      <section className="card p-4">
        <Link
          href={`/grupe/${grupaId}/prezenta?data=${azi}`}
          className="buton buton-principal w-full text-base"
        >
          Fă prezența de azi
        </Link>
        <p className="mt-2 text-center text-xs text-cenusiu">{dataLunga(azi)}</p>

        <form
          action={`/grupe/${grupaId}/prezenta`}
          className="mt-4 flex items-end gap-2 border-t border-[#eef1f7] pt-4"
        >
          <div className="flex-1">
            <label className="eticheta" htmlFor="data">
              Sau altă dată
            </label>
            <input
              id="data"
              name="data"
              type="date"
              defaultValue={azi}
              className="camp"
            />
          </div>
          <button type="submit" className="buton buton-secundar">
            Deschide
          </button>
        </form>
      </section>

      {/* Slujiri la care nu s-a făcut încă prezența */}
      {slujiriNecompletate.length > 0 && (
        <section className="rounded-2xl border border-lime bg-lime/20 p-4">
          <h2 className="mb-1 text-sm font-bold">
            {slujiriNecompletate.length === 1
              ? "O slujire așteaptă prezența"
              : `${slujiriNecompletate.length} slujiri așteaptă prezența`}
          </h2>
          <p className="mb-3 text-xs text-cenusiu">
            Cine a slujit efectiv. E separată de prezența de la grupa mică.
          </p>
          <ul className="flex flex-col divide-y divide-lime/40">
            {slujiriNecompletate.map((p) => (
              <li key={p.id} className="py-3">
                <RandProgramare programare={p} azi={azi} poateFacePrezenta />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Restul slujirilor: ce a fost de curând și ce urmează. */}
      {slujiriDeAratat.length > 0 && (
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold">Slujiri</h2>
            <Link href="/slujiri" className="text-xs text-albastru underline">
              Toate
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {slujiriDeAratat.map((p) => (
              <li key={p.id} className="py-3">
                <RandProgramare programare={p} azi={azi} poateFacePrezenta />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cine ar trebui căutat */}
      {alerte.length > 0 && (
        <section className="card border-red-100 bg-red-50/50 p-4">
          <h2 className="text-sm font-bold text-red-800">De căutat</h2>
          <p className="mb-3 text-xs text-red-700/80">
            Au lipsit de cel puțin două ori la rând.
          </p>
          <ul className="flex flex-col gap-2">
            {alerte.map((a) => (
              <li
                key={a.membruId}
                className="flex items-center justify-between gap-3 rounded-lg bg-hartie px-3 py-2"
              >
                <Link href={`/membri/${a.membruId}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {a.nume}
                  </span>
                  <span className="text-xs text-cenusiu">
                    {a.absenteConsecutive} absențe la rând
                    {a.ultimaPrezenta
                      ? ` · ultima dată prezent ${dataScurta(a.ultimaPrezenta)}`
                      : " · nu a fost prezent deloc"}
                  </span>
                </Link>
                {a.telefon && (
                  <a
                    href={`tel:${a.telefon}`}
                    className="buton buton-secundar buton-mic shrink-0"
                  >
                    Sună
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pulsiștii */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Pulsiști ({membri.length})</h2>
        {membri.length === 0 ? (
          <p className="text-sm text-cenusiu">Grupa nu are încă membri.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {membri.map((m) => {
              const ani = varsta(m.dataNasterii);
              return (
                <li key={m.id}>
                  <Link
                    href={`/membri/${m.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 py-2.5"
                  >
                    <span className="truncate text-sm font-medium">{m.nume}</span>
                    <span className="shrink-0 text-xs text-cenusiu">
                      {[etichetaClasaScurta(m.clasa), ani !== null ? `${ani} ani` : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <details className="mt-3 border-t border-[#eef1f7] pt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-albastru">
            + Adaugă un pulsist
          </summary>
          <div className="pt-2">
            <FormularMembruNou grupaId={grupaId} />
          </div>
        </details>
      </section>

      {/* Musafirii */}
      <section className="card p-4">
        <h2 className="text-sm font-bold">Musafiri ({musafiri.length})</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Cei care au venit în vizită. Nu intră în statistici până nu îi
          primești în grupă.
        </p>
        {musafiri.length === 0 ? (
          <p className="text-sm text-cenusiu">
            Niciun musafir deocamdată. Îi adaugi direct de pe foaia de prezență,
            când vin.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {musafiri.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-2 py-2.5"
              >
                <Link href={`/membri/${m.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {m.nume}
                  </span>
                  <span className="text-xs text-cenusiu">
                    musafir din {dataScurta(m.creatLa.toISOString().slice(0, 10))}
                  </span>
                </Link>
                <form action={primesteInGrupa.bind(null, m.id)}>
                  <button type="submit" className="buton buton-secundar buton-mic">
                    Primește în grupă
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Istoricul întâlnirilor */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold">Ultimele întâlniri</h2>
          <a
            href={`/api/export?grupa=${grupaId}`}
            className="text-xs text-albastru underline"
          >
            Descarcă în Excel
          </a>
        </div>
        {intalniri.length === 0 ? (
          <p className="text-sm text-cenusiu">
            Nu s-a făcut încă nicio prezență la grupa asta.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {intalniri.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/grupe/${grupaId}/prezenta?data=${i.data}`}
                  className="flex min-h-11 items-center gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {dataLunga(i.data)}
                    </span>
                    <span className="text-xs text-cenusiu">
                      {i.subiect ? `${i.subiect} · ` : ""}
                      completat de {i.marcatDe ?? "?"}
                      {i.prinInlocuire ? " (înlocuire)" : ""}
                      {i.musafiri > 0
                        ? ` · ${i.musafiri} ${i.musafiri === 1 ? "musafir" : "musafiri"}`
                        : ""}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm">
                    <span className="font-semibold text-albastru">{i.prezenti}</span>
                    <span className="text-cenusiu">
                      /{i.prezenti + i.motivati + i.absenti}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Liderii și înlocuirile */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Liderii grupei</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {lideri.map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <span>{l.nume}</span>
              {!l.activ && <span className="text-xs text-cenusiu">(inactiv)</span>}
            </li>
          ))}
          {lideri.length === 0 && (
            <li className="text-sm text-cenusiu">
              Grupa nu are lideri repartizați.
            </li>
          )}
        </ul>

        {inlocuiri.length > 0 && (
          <div className="mt-4 border-t border-[#eef1f7] pt-3">
            <h3 className="mb-2 text-xs font-bold text-cenusiu uppercase">
              Înlocuiri
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {inlocuiri.map((d) => (
                <li key={d.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{d.liderNume}</span>
                    <span className="text-cenusiu">
                      {" "}
                      · {dataScurta(d.deLa)} – {dataScurta(d.panaLa)}
                      {d.motiv ? ` · ${d.motiv}` : ""}
                    </span>
                  </span>
                  {poateOrganiza && (
                    <form action={anuleazaInlocuire.bind(null, grupaId, d.id)}>
                      <button
                        type="submit"
                        className="text-xs text-red-700 underline"
                      >
                        șterge
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {poateOrganiza && (
          <details className="mt-4 border-t border-[#eef1f7] pt-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-albastru">
              Nu poți ajunge? Cere unui alt lider să țină locul
            </summary>
            <div className="pt-2">
              <FormularInlocuire
                grupaId={grupaId}
                lideri={potentiali}
                azi={azi}
              />
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
