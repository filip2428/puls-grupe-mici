import Link from "next/link";
import { notFound } from "next/navigation";

import { FoaieSlujire } from "@/componente/FoaieSlujire";
import { ceruteLider } from "@/lib/auth/sesiune";
import {
  foaiaSlujirii,
  programareCuPrezenta,
  verificaAccesProgramare,
} from "@/lib/interogari/prezenta-slujire";
import { dataAzi, dataLunga } from "@/lib/util/date";

export const metadata = { title: "Prezența la slujire · Puls" };

export default async function PaginaPrezentaSlujire({
  params,
}: PageProps<"/slujiri/programare/[id]/prezenta">) {
  const { id } = await params;
  const programareId = Number(id);
  if (!Number.isInteger(programareId)) notFound();

  const lider = await ceruteLider();

  const p = await programareCuPrezenta(programareId);
  if (!p) notFound();

  const acces = await verificaAccesProgramare(lider, p);
  if (!acces.permis) notFound();

  const foaie = await foaiaSlujirii(p);
  const inViitor = p.data > dataAzi();

  const cine = [p.grupaNume, p.echipaNume].filter(Boolean).join(" + ");
  const inapoi = p.grupaId !== null ? `/grupe/${p.grupaId}` : "/slujiri";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={inapoi} className="text-sm text-cenusiu">
          ← {p.grupaNume ?? "Slujiri"}
        </Link>
        <h1 className="mt-2 text-xl font-bold">Prezența la slujire</h1>
        <p className="text-sm text-cenusiu">
          {p.titlu}
          {cine ? ` · ${cine}` : ""}
        </p>
        <p className="text-sm text-cenusiu">
          {p.data === dataAzi() ? "azi" : dataLunga(p.data)}
          {p.ora ? ` · ora ${p.ora}` : ""}
          {p.locatie ? ` · ${p.locatie}` : ""}
        </p>

        <p className="mt-3 rounded-xl bg-albastru/10 px-3 py-2 text-xs text-albastru">
          Asta e prezența la slujire, separată de cea de la grupa mică: cine a
          venit să slujească, nu cine a fost la întâlnirea săptămânală.
        </p>

        {acces.prinInlocuire && (
          <p className="mt-2 rounded-xl bg-lime/25 px-3 py-2 text-xs">
            Completezi ca înlocuitor - se va vedea că prezența a fost făcută de
            tine.
          </p>
        )}

        {p.prezentaMarcataLa && p.prezentaMarcataDeNume && (
          <p className="mt-2 text-xs text-cenusiu">
            Completată deja de {p.prezentaMarcataDeNume}. Dacă schimbi ceva,
            se salvează peste.
          </p>
        )}
      </div>

      {inViitor ? (
        <div className="card p-5 text-sm text-cenusiu">
          Slujirea asta nu a avut loc încă. Prezența se face în ziua ei sau
          după.
        </div>
      ) : (
        <FoaieSlujire
          programareId={programareId}
          persoane={foaie.persoane}
          stariInitiale={foaie.stari}
          notaInitiala={p.prezentaNota}
          existaDeja={p.prezentaMarcataLa !== null}
          numeEchipa={p.echipaNume}
        />
      )}
    </div>
  );
}
