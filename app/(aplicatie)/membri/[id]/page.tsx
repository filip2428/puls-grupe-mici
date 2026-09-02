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
import { schimbaActiv, stergeNota } from "./actions";

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

  const ani = varsta(date.membru.dataNasterii);
  const prezenteNr = istoric.filter((i) => i.stare === "prezent").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={`/grupe/${date.grupa.id}`} className="text-sm text-cenusiu">
          ← {date.grupa.nume}
        </Link>
        <h1 className="mt-2 text-xl font-bold">{date.membru.nume}</h1>
        <p className="text-sm text-cenusiu">
          {ani !== null ? `${ani} ani · ` : ""}
          {date.membru.activ ? "activ" : "inactiv"}
          {istoric.length > 0 &&
            ` · prezent la ${prezenteNr} din ultimele ${istoric.length} întâlniri`}
        </p>
        {date.membru.telefon && (
          <div className="mt-3 flex gap-2">
            <a
              href={`tel:${date.membru.telefon}`}
              className="rounded-lg border border-[#d7dced] bg-hartie px-3 py-2 text-sm font-medium"
            >
              Sună {date.membru.telefon}
            </a>
            <a
              href={`https://wa.me/${date.membru.telefon.replace(/[^0-9]/g, "").replace(/^0/, "40")}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[#d7dced] bg-hartie px-3 py-2 text-sm font-medium"
            >
              WhatsApp
            </a>
          </div>
        )}
      </div>

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
          <summary className="cursor-pointer text-sm font-medium text-albastru">
            Modifică datele
          </summary>
          <div className="pt-3">
            <FormularEditareMembru
              membruId={membruId}
              nume={date.membru.nume}
              telefon={date.membru.telefon}
              dataNasterii={date.membru.dataNasterii}
            />

            <form
              action={schimbaActiv.bind(null, membruId, !date.membru.activ)}
              className="mt-4 border-t border-[#eef1f7] pt-4"
            >
              <button
                type="submit"
                className="rounded-lg border border-[#d7dced] px-4 py-2 text-sm font-medium"
              >
                {date.membru.activ
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
