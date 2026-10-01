import Link from "next/link";
import { notFound } from "next/navigation";

import { primesteInGrupa } from "@/app/(aplicatie)/membri/[id]/actions";
import { anuleazaInlocuire } from "./actions";
import { FormularInlocuire } from "@/componente/FormularInlocuire";
import {
  AlegePulsistExistent,
  FormularMembruNou,
} from "@/componente/FormularMembruNou";
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
  pulsistiFaraGrupa,
} from "@/lib/interogari/grupe";
import { programariGrupei, slujiriDeCompletat } from "@/lib/interogari/slujiri";
import { alerteAbsenteGrupa } from "@/lib/interogari/statistici";
import { avansulPulsistilor, portiuneaZilei } from "@/lib/interogari/citire";
import { CULORI_STARE, ETICHETE_STARE } from "@/lib/citire";
import {
  dataAzi,
  dataLunga,
  dataScurta,
  varsta,
} from "@/lib/util/date";
import { etichetaClasaScurta } from "@/lib/util/etichete";
import { CampData } from "@/componente/CampData";
import { Icoana, initiale } from "@/componente/Icoane";
import { TitluSectiune } from "@/componente/TitluSectiune";

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
    nerepartizati,
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
    pulsistiFaraGrupa(),
  ]);

  const [avansuri, portiuneaDeAzi] = await Promise.all([
    avansulPulsistilor(membri),
    portiuneaZilei(azi),
  ]);
  const stariCitire = { la_zi: 0, putin: 0, mult: 0, necompletat: 0 };
  for (const a of avansuri.values()) stariCitire[a.stare]++;

  const necompletate = new Set(slujiriNecompletate.map((p) => p.id));
  const slujiriDeAratat = slujiri.filter((p) => !necompletate.has(p.id));

  const poateOrganiza = !acces.prinInlocuire || acces.esteAdmin;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/grupe" className="inapoi">
          Grupele mele
        </Link>
        <h1 className="titlu-pagina">{g.nume}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cenusiu">
          {g.oraIntalnire && (
            <span className="flex items-center gap-1">
              <Icoana nume="ceas" marime={15} />
              ora {g.oraIntalnire}
            </span>
          )}
          {g.locatie && (
            <span className="flex items-center gap-1">
              <Icoana nume="loc" marime={15} />
              {g.locatie}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Icoana nume="oameni" marime={15} />
            {membri.length} pulsiști
          </span>
        </p>
        {acces.prinInlocuire && (
          <p className="mt-3 rounded-2xl bg-lime-pal px-3.5 py-2.5 text-sm ring-1 ring-lime/70">
            Ești aici ca <strong>înlocuitor</strong>. Prezența pe care o
            completezi apare cu numele tău.
          </p>
        )}
      </div>

      {/* Prezența */}
      <section className="card p-4">
        <Link
          href={`/grupe/${grupaId}/prezenta?data=${azi}`}
          className="buton buton-principal min-h-14 w-full text-base"
        >
          <Icoana nume="bifa" marime={20} grosime={2.2} />
          Fă prezența de azi
        </Link>
        <p className="mt-2 text-center text-xs font-medium text-cenusiu first-letter:uppercase">
          {dataLunga(azi)}
        </p>

        <form
          action={`/grupe/${grupaId}/prezenta`}
          className="mt-4 flex items-end gap-2 border-t border-linie pt-4"
        >
          <div className="flex-1">
            <label className="eticheta" htmlFor="data">
              Sau altă dată
            </label>
            <CampData
              id="data"
              name="data"
              defaultValue={azi}
              className="camp"
            />
          </div>
          <button type="submit" className="buton buton-secundar">
            Deschide
          </button>
        </form>
      </section>

      {/* Cititul Bibliei */}
      <section className="card p-4">
        <TitluSectiune icoana="carte" className="mb-1">
          Cititul Bibliei
        </TitluSectiune>
        <p className="mb-3 pl-12 text-xs text-cenusiu">
          planul de azi:{" "}
          <span className="font-semibold text-carbune">
            {portiuneaDeAzi ? portiuneaDeAzi.portiune : "zi liberă"}
          </span>
        </p>
        {membri.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-1.5 text-xs font-semibold">
            {(["la_zi", "putin", "mult", "necompletat"] as const)
              .filter((s) => stariCitire[s] > 0)
              .map((s) => (
                <li key={s} className={`rounded-full px-2 py-1 ${CULORI_STARE[s]}`}>
                  {stariCitire[s]} {ETICHETE_STARE[s]}
                </li>
              ))}
          </ul>
        )}
        <Link
          href={`/grupe/${grupaId}/citire`}
          className="buton buton-secundar w-full"
        >
          Bifează cititul săptămânii
        </Link>
      </section>

      {/* Slujiri la care nu s-a făcut încă prezența */}
      {slujiriNecompletate.length > 0 && (
        <section className="rounded-[var(--radius-card)] border border-lime bg-lime-pal p-4">
          <TitluSectiune icoana="slujiri" ton="lime" className="mb-1">
            {slujiriNecompletate.length === 1
              ? "O slujire așteaptă prezența"
              : `${slujiriNecompletate.length} slujiri așteaptă prezența`}
          </TitluSectiune>
          <p className="mb-3 pl-12 text-xs text-cenusiu">
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
          <TitluSectiune
            icoana="slujiri"
            className="mb-1"
            dreapta={
              <Link href="/slujiri" className="link">
                Toate
              </Link>
            }
          >
            Slujiri
          </TitluSectiune>
          <ul className="flex flex-col divide-y divide-linie">
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
        <section className="card border-red-200 bg-red-50 p-4">
          <TitluSectiune icoana="alerta" ton="rosu" className="mb-1">
            <span className="text-red-800">De căutat</span>
          </TitluSectiune>
          <p className="mb-3 pl-12 text-xs text-red-800/80">
            Au lipsit de cel puțin două ori la rând.
          </p>
          <ul className="flex flex-col gap-2">
            {alerte.map((a) => (
              <li
                key={a.membruId}
                className="flex items-center justify-between gap-3 rounded-2xl bg-hartie px-3 py-2.5 shadow-sm"
              >
                <Link
                  href={`/membri/${a.membruId}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="avatar bg-red-100 text-red-800">
                    {initiale(a.nume)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {a.nume}
                    </span>
                    <span className="block text-xs text-cenusiu">
                      {a.absenteConsecutive} absențe la rând
                      {a.ultimaPrezenta
                        ? ` · ultima dată prezent ${dataScurta(a.ultimaPrezenta)}`
                        : " · nu a fost prezent deloc"}
                    </span>
                  </span>
                </Link>
                {a.telefon && (
                  <a
                    href={`tel:${a.telefon}`}
                    className="buton buton-secundar buton-mic shrink-0"
                  >
                    <Icoana nume="telefon" marime={15} />
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
        <TitluSectiune
          icoana="oameni"
          className="mb-2"
          dreapta={
            <span className="rounded-full bg-fundal px-2.5 py-0.5 text-xs font-bold text-cenusiu">
              {membri.length}
            </span>
          }
        >
          Pulsiști
        </TitluSectiune>
        {membri.length === 0 ? (
          <p className="text-sm text-cenusiu">Grupa nu are încă membri.</p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {membri.map((m) => {
              const ani = varsta(m.dataNasterii);
              const citit = avansuri.get(m.id);
              return (
                <li key={m.id}>
                  <Link
                    href={`/membri/${m.id}`}
                    className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2"
                  >
                    <span className="avatar">{initiale(m.nume)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {m.nume}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-cenusiu">
                      {[etichetaClasaScurta(m.clasa), ani !== null ? `${ani} ani` : ""]
                        .filter(Boolean)
                        .join(" · ")}
                      {citit && (citit.stare === "putin" || citit.stare === "mult") && (
                        <span
                          className={`rounded-full px-1.5 text-[11px] leading-4 ${CULORI_STARE[citit.stare]}`}
                          title="Zile din planul de citire rămase în urmă"
                        >
                          {citit.inUrma} {citit.inUrma === 1 ? "zi" : "zile"} în urmă
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <details className="mt-3 border-t border-linie pt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-albastru">
            + Adaugă un pulsist
          </summary>
          {nerepartizati.length > 0 && (
            <div className="pt-2">
              <p className="mb-3 text-xs text-cenusiu">
                Caută-l întâi aici. Cine s-a înscris prin formular e deja în
                aplicație, cu telefon, părinți și biserică - și le aduce cu el
                în grupă.
              </p>
              <AlegePulsistExistent
                grupaId={grupaId}
                pulsisti={nerepartizati}
              />
            </div>
          )}
          <div
            className={
              nerepartizati.length > 0
                ? "mt-4 border-t border-linie pt-4"
                : "pt-2"
            }
          >
            {nerepartizati.length > 0 && (
              <p className="mb-3 text-xs font-medium">
                Sau scrie-l de la zero, dacă nu e printre ei:
              </p>
            )}
            <FormularMembruNou grupaId={grupaId} />
          </div>
        </details>
      </section>

      {/* Musafirii */}
      <section className="card p-4">
        <TitluSectiune
          icoana="lider"
          ton="lime"
          className="mb-1"
          dreapta={
            <span className="rounded-full bg-fundal px-2.5 py-0.5 text-xs font-bold text-cenusiu">
              {musafiri.length}
            </span>
          }
        >
          Musafiri
        </TitluSectiune>
        <p className="mb-3 pl-12 text-xs text-cenusiu">
          Cei care au venit în vizită. Nu intră în statistici până nu îi
          primești în grupă.
        </p>
        {musafiri.length === 0 ? (
          <p className="text-sm text-cenusiu">
            Niciun musafir deocamdată. Îi adaugi direct de pe foaia de prezență,
            când vin.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-linie">
            {musafiri.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5"
              >
                <Link
                  href={`/membri/${m.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl"
                >
                  <span className="avatar border border-dashed border-lime bg-lime-pal text-carbune">
                    {initiale(m.nume)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {m.nume}
                    </span>
                    <span className="block text-xs text-cenusiu">
                      musafir din{" "}
                      {dataScurta(m.creatLa.toISOString().slice(0, 10))}
                    </span>
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
        <TitluSectiune
          icoana="foaie"
          className="mb-1"
          dreapta={
            <a
              href={`/api/export?grupa=${grupaId}`}
              aria-label="Descarcă întâlnirile în Excel"
              className="link gap-1 text-xs"
            >
              <Icoana nume="descarca" marime={15} />
              Excel
            </a>
          }
        >
          Ultimele întâlniri
        </TitluSectiune>
        {intalniri.length === 0 ? (
          <p className="text-sm text-cenusiu">
            Nu s-a făcut încă nicio prezență la grupa asta.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-linie">
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
                  <span className="shrink-0 rounded-full bg-albastru-pal px-2.5 py-1 text-sm">
                    <span className="font-bold text-albastru">{i.prezenti}</span>
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
        <TitluSectiune icoana="lider" className="mb-3">
          Liderii grupei
        </TitluSectiune>
        <ul className="flex flex-col gap-2 text-sm">
          {lideri.map((l) => (
            <li key={l.id} className="flex items-center gap-3">
              <span className="avatar h-9 w-9 bg-albastru text-xs text-lime">
                {initiale(l.nume)}
              </span>
              <span className="font-semibold">{l.nume}</span>
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
          <div className="mt-4 border-t border-linie pt-3">
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
          <details className="mt-4 border-t border-linie pt-3">
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
