import Link from "next/link";
import { notFound } from "next/navigation";

import {
  FormularEditareMembru,
  FormularNota,
} from "@/componente/MembruFormulare";
import { ceruteLider } from "@/lib/auth/sesiune";
import { verificaAccesGrupa } from "@/lib/interogari/acces";
import {
  istoricMembru,
  membru as iaMembru,
  noteleMembrului,
} from "@/lib/interogari/grupe";
import { dataScurta, momentLizibil, varsta } from "@/lib/util/date";
import { etichetaClasa, etichetaSex } from "@/lib/util/etichete";
import {
  primesteInGrupa,
  schimbaActiv,
  stergeNota,
  treceLaMusafiri,
} from "./actions";

const CULORI: Record<string, string> = {
  prezent: "bg-albastru text-white",
  motivat: "bg-lime text-carbune",
  absent: "bg-carbune/15 text-carbune",
};

const ETICHETE: Record<string, string> = {
  prezent: "P",
  motivat: "A",
  absent: "–",
};

export default async function PaginaMembru({ params }: PageProps<"/membri/[id]">) {
  const { id } = await params;
  const membruId = Number(id);
  if (!Number.isInteger(membruId)) notFound();

  const lider = await ceruteLider();
  const date = await iaMembru(membruId);
  if (!date) notFound();

  const acces = await verificaAccesGrupa(lider, date.grupa.id);
  if (!acces.permis) notFound();

  const [istoric, note] = await Promise.all([
    istoricMembru(membruId, 16),
    noteleMembrului(membruId),
  ]);

  const m = date.membru;
  const ani = varsta(m.dataNasterii);
  const prezenteNr = istoric.filter((i) => i.stare === "prezent").length;
  const esteMusafir = m.status === "musafir";

  const detalii = [
    etichetaClasa(m.clasa),
    ani !== null ? `${ani} ani` : "",
    etichetaSex(m.sex),
    m.activ ? "" : "inactiv",
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={`/grupe/${date.grupa.id}`} className="text-sm text-cenusiu">
          ← {date.grupa.nume}
        </Link>
        <h1 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold">
          {m.nume}
          {esteMusafir && (
            <span className="rounded-full bg-lime/40 px-2 py-0.5 text-xs font-semibold">
              musafir
            </span>
          )}
        </h1>
        <p className="text-sm text-cenusiu">
          {detalii.join(" · ")}
          {istoric.length > 0 &&
            `${detalii.length ? " · " : ""}prezent la ${prezenteNr} din ultimele ${istoric.length} întâlniri`}
        </p>

        {m.telefon && (
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${m.telefon}`} className="buton buton-secundar">
              Sună {m.telefon}
            </a>
            <a
              href={`https://wa.me/${numarInternational(m.telefon)}`}
              target="_blank"
              rel="noreferrer"
              className="buton buton-secundar"
            >
              WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* Musafir sau membru */}
      <section className="card p-4">
        {esteMusafir ? (
          <>
            <h2 className="text-sm font-bold">E musafir</h2>
            <p className="mb-3 text-xs text-cenusiu">
              Vine în vizită, dar nu e (încă) parte din grupă: nu intră în
              statistici și nu apare la „de căutat".
            </p>
            <form action={primesteInGrupa.bind(null, membruId)}>
              <button type="submit" className="buton buton-principal">
                Primește-l în grupă
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-sm font-bold">E parte din grupă</h2>
            <p className="mb-3 text-xs text-cenusiu">
              {m.devenitMembruLa
                ? `Primit în grupă pe ${dataScurta(m.devenitMembruLa)}.`
                : "Intră în statistici și în alertele de absență."}
            </p>
            <form action={treceLaMusafiri.bind(null, membruId)}>
              <button type="submit" className="buton buton-secundar buton-mic">
                Trece-l înapoi la musafiri
              </button>
            </form>
          </>
        )}
      </section>

      {/* Părinții */}
      {(m.parinte1Nume || m.parinte1Telefon || m.parinte2Nume || m.parinte2Telefon) && (
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Părinți</h2>
          <ul className="flex flex-col gap-3">
            <Parinte nume={m.parinte1Nume} telefon={m.parinte1Telefon} />
            <Parinte nume={m.parinte2Nume} telefon={m.parinte2Telefon} />
          </ul>
        </section>
      )}

      {/* Istoricul prezenței */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Ultimele întâlniri</h2>
        {istoric.length === 0 ? (
          <p className="text-sm text-cenusiu">Nu are încă nicio prezență trecută.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {[...istoric].reverse().map((i) => (
              <li
                key={i.data}
                className={`flex w-16 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs ${CULORI[i.stare]}`}
                title={`${i.data}${i.subiect ? ` · ${i.subiect}` : ""}`}
              >
                <span className="text-base font-bold">{ETICHETE[i.stare]}</span>
                <span className="opacity-80">{dataScurta(i.data)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-cenusiu">
          P = prezent · A = a anunțat că lipsește · – = absent
        </p>
      </section>

      {/* Note */}
      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Note</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Le văd doar liderii grupei și coordonatorii.
        </p>

        <FormularNota membruId={membruId} />

        {note.length > 0 && (
          <ul className="mt-4 flex flex-col divide-y divide-[#eef1f7]">
            {note.map((n) => (
              <li key={n.id} className="py-3">
                <p className="text-sm whitespace-pre-wrap">{n.text}</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-xs text-cenusiu">
                    {n.autorNume ?? "cineva"} · {momentLizibil(n.creatLa)}
                  </span>
                  {(n.autorId === lider.id || lider.rol === "admin") && (
                    <form action={stergeNota.bind(null, membruId, n.id)}>
                      <button
                        type="submit"
                        className="text-xs text-red-700 underline"
                      >
                        șterge
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Editare */}
      <section className="card p-4">
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-albastru">
            Modifică datele și părinții
          </summary>
          <div className="pt-2">
            <FormularEditareMembru
              membruId={membruId}
              initial={{
                nume: m.nume,
                telefon: m.telefon,
                dataNasterii: m.dataNasterii,
                sex: m.sex,
                clasa: m.clasa,
                parinte1Nume: m.parinte1Nume,
                parinte1Telefon: m.parinte1Telefon,
                parinte2Nume: m.parinte2Nume,
                parinte2Telefon: m.parinte2Telefon,
              }}
            />

            <form
              action={schimbaActiv.bind(null, membruId, !m.activ)}
              className="mt-4 border-t border-[#eef1f7] pt-4"
            >
              <button type="submit" className="buton buton-secundar">
                {m.activ
                  ? "Marchează ca inactiv (nu mai vine)"
                  : "Readu-l în grupă"}
              </button>
              <p className="mt-2 text-xs text-cenusiu">
                Nu se șterge nimic - doar nu mai apare pe foaia de prezență.
              </p>
            </form>
          </div>
        </details>
      </section>
    </div>
  );
}

/** Un părinte, cu butoane de contact. */
function Parinte({
  nume,
  telefon,
}: {
  nume: string | null;
  telefon: string | null;
}) {
  if (!nume && !telefon) return null;
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {nume ?? "Părinte"}
      </span>
      {telefon && (
        <>
          <a href={`tel:${telefon}`} className="buton buton-secundar buton-mic">
            Sună {telefon}
          </a>
          <a
            href={`https://wa.me/${numarInternational(telefon)}`}
            target="_blank"
            rel="noreferrer"
            className="buton buton-secundar buton-mic"
          >
            WhatsApp
          </a>
        </>
      )}
    </li>
  );
}

/** 0722... -> 40722... (formatul cerut de WhatsApp) */
function numarInternational(telefon: string): string {
  return telefon.replace(/[^0-9]/g, "").replace(/^0/, "40");
}
