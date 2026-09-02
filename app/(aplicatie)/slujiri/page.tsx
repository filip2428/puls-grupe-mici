import Link from "next/link";

import {
  FormularEchipaNoua,
  FormularProgramareNoua,
} from "@/componente/AdminSlujiri";
import { RandProgramare } from "@/componente/RandProgramare";
import { ceruteLider } from "@/lib/auth/sesiune";
import { grupeAccesibile } from "@/lib/interogari/acces";
import { listaLideri, toateGrupele } from "@/lib/interogari/lideri";
import {
  grupeFaraProgramare,
  listaEchipe,
  programariPentruLider,
} from "@/lib/interogari/slujiri";
import { dataAzi } from "@/lib/util/date";
import { stergeProgramare } from "./actions";

export const metadata = { title: "Slujiri · Puls" };

export default async function PaginaSlujiri() {
  const lider = await ceruteLider();
  const esteAdmin = lider.rol === "admin";

  const grupeleMele = await grupeAccesibile(lider);
  const [echipe, urmatoarele] = await Promise.all([
    listaEchipe(),
    programariPentruLider({
      esteAdmin,
      grupaIds: grupeleMele.map((g) => g.id),
      limita: 25,
    }),
  ]);

  const [toateGrupeleLista, toti, faraProgramare] = esteAdmin
    ? await Promise.all([toateGrupele(), listaLideri(), grupeFaraProgramare()])
    : [[], [], []];

  const azi = dataAzi();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Slujiri</h1>
        <p className="text-sm text-cenusiu">
          {esteAdmin
            ? "Calendarul slujirilor și locurile în care sunt implicați pulsiștii."
            : "Când slujește grupa ta și unde slujesc pulsiștii tăi."}
        </p>
      </div>

      {/* Ce urmează */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Ce urmează</h2>
        {urmatoarele.length === 0 ? (
          <p className="text-sm text-cenusiu">
            {esteAdmin
              ? "Nu e nimic în calendar. Adaugă mai jos prima slujire."
              : "Grupa ta nu e programată la nimic deocamdată."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {urmatoarele.map((p) => (
              <li key={p.id} className="py-3">
                <RandProgramare programare={p} azi={azi} poateFacePrezenta />
                {esteAdmin && (
                  <form
                    action={stergeProgramare.bind(null, p.id)}
                    className="mt-2"
                  >
                    <button
                      type="submit"
                      className="text-xs text-red-700 underline"
                    >
                      scoate din calendar
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Echipele */}
      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Locuri de slujire</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Harvest Kids, cafeneaua, laudă... Intră într-unul ca să vezi cine slujește acolo.
        </p>

        {echipe.length === 0 ? (
          <p className="text-sm text-cenusiu">
            Nu e creat niciun loc de slujire încă.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {echipe.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/slujiri/${e.id}`}
                  className="flex min-h-11 items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {e.nume}
                      {!e.activa && (
                        <span className="ml-2 text-xs text-cenusiu">arhivată</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-cenusiu">
                      {e.cati} {e.cati === 1 ? "pulsist" : "pulsiști"}
                      {e.responsabilNume ? ` · ${e.responsabilNume}` : ""}
                      {e.descriere ? ` · ${e.descriere}` : ""}
                    </span>
                  </div>
                  <span aria-hidden className="shrink-0 text-cenusiu">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {esteAdmin && (
        <>
          {faraProgramare.length > 0 && (
            <section className="card border-lime bg-lime/15 p-4">
              <h2 className="text-sm font-bold">Grupe neprogramate</h2>
              <p className="mt-1 text-xs text-carbune/80">
                N-au nimic în calendar de acum înainte:{" "}
                {faraProgramare.map((g) => g.nume).join(", ")}.
              </p>
            </section>
          )}

          <section className="card p-4">
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-albastru">
                + Programează o slujire
              </summary>
              <div className="pt-2">
                <FormularProgramareNoua
                  grupe={toateGrupeleLista
                    .filter((g) => g.activa)
                    .map((g) => ({ id: g.id, nume: g.nume }))}
                  echipe={echipe
                    .filter((e) => e.activa)
                    .map((e) => ({ id: e.id, nume: e.nume }))}
                  azi={azi}
                />
              </div>
            </details>
          </section>

          <section className="card p-4">
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-albastru">
                + Adaugă un loc de slujire
              </summary>
              <div className="pt-2">
                <FormularEchipaNoua
                  lideri={toti
                    .filter((l) => l.activ)
                    .map((l) => ({ id: l.id, nume: l.nume }))}
                />
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
