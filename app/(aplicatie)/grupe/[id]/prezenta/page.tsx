import Link from "next/link";
import { notFound } from "next/navigation";

import { FoaiePrezenta } from "@/componente/FoaiePrezenta";
import { ceruteLider } from "@/lib/auth/sesiune";
import { verificaAccesGrupa } from "@/lib/interogari/acces";
import { grupa as iaGrupa } from "@/lib/interogari/grupe";
import { foaiaDePrezenta } from "@/lib/interogari/prezenta";
import { dataAzi, dataLunga, esteDataValida } from "@/lib/util/date";
import { stergeIntalnirea } from "./actions";

export default async function PaginaPrezenta({
  params,
  searchParams,
}: PageProps<"/grupe/[id]/prezenta">) {
  const { id } = await params;
  const cautare = await searchParams;
  const grupaId = Number(id);
  if (!Number.isInteger(grupaId)) notFound();

  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis) notFound();

  const g = await iaGrupa(grupaId);
  if (!g) notFound();

  const cerut = typeof cautare.data === "string" ? cautare.data : "";
  const data = esteDataValida(cerut) ? cerut : dataAzi();
  const foaie = await foaiaDePrezenta(grupaId, data);
  const inViitor = data > dataAzi();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/grupe/${grupaId}`} className="text-sm text-cenusiu">
          ← {g.nume}
        </Link>
        <h1 className="mt-2 text-xl font-bold">Prezența</h1>
        <p className="text-sm text-cenusiu">{dataLunga(data)}</p>
        {acces.prinInlocuire && (
          <p className="mt-2 rounded-xl bg-lime/25 px-3 py-2 text-xs">
            Completezi ca înlocuitor - se va vedea că prezența a fost făcută de tine.
          </p>
        )}
      </div>

      {inViitor ? (
        <div className="card p-5 text-sm text-cenusiu">
          Ziua asta nu a venit încă. Prezența se face în ziua întâlnirii sau
          după.
        </div>
      ) : (
        <>
          <FoaiePrezenta
            grupaId={grupaId}
            data={data}
            membri={foaie.membri.map((m) => ({ id: m.id, nume: m.nume }))}
            musafiriInitiali={foaie.musafiri.map((m) => ({
              id: m.id,
              nume: m.nume,
            }))}
            stariInitiale={foaie.stari}
            subiectInitial={foaie.subiect}
            notaInitiala={foaie.nota}
            existaDeja={foaie.intalnireId !== null}
          />

          {foaie.intalnireId !== null && (
            <details className="mb-28 rounded-xl border border-red-200 bg-red-50/50 p-3">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-red-800">
                Șterge prezența de la această dată
              </summary>
              <form
                action={stergeIntalnirea.bind(null, grupaId, data)}
                className="pt-2"
              >
                <p className="mb-3 text-xs text-red-800/90">
                  Dispar toate bifele de pe {dataLunga(data)}, plus subiectul și
                  nota zilei. Pulsiștii și musafirii rămân neatinși - poți
                  reface prezența oricând. Bun dacă ai completat-o din greșeală
                  pe altă dată.
                </p>
                <button type="submit" className="buton bg-red-700 text-white">
                  Șterge prezența zilei
                </button>
              </form>
            </details>
          )}
        </>
      )}
    </div>
  );
}
