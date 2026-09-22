import Link from "next/link";
import { notFound } from "next/navigation";

import { FoaieCitire } from "@/componente/FoaieCitire";
import { ceruteLider } from "@/lib/auth/sesiune";
import { luneaDin } from "@/lib/citire";
import { verificaAccesGrupa } from "@/lib/interogari/acces";
import { foaiaDeCitire } from "@/lib/interogari/citire";
import { grupa as iaGrupa } from "@/lib/interogari/grupe";
import {
  adaugaZile,
  dataAzi,
  dataScurta,
  esteDataValida,
  momentLizibil,
} from "@/lib/util/date";

export const metadata = { title: "Cititul Bibliei · Puls" };

export default async function PaginaCitire({
  params,
  searchParams,
}: PageProps<"/grupe/[id]/citire">) {
  const { id } = await params;
  const cautare = await searchParams;
  const grupaId = Number(id);
  if (!Number.isInteger(grupaId)) notFound();

  const lider = await ceruteLider();
  const [acces, g] = await Promise.all([
    verificaAccesGrupa(lider, grupaId),
    iaGrupa(grupaId),
  ]);
  if (!acces.permis || !g) notFound();

  const azi = dataAzi();
  const luniaAsta = luneaDin(azi);
  const cerut = typeof cautare.saptamana === "string" ? cautare.saptamana : "";
  const luni =
    esteDataValida(cerut) && cerut <= azi ? luneaDin(cerut) : luniaAsta;

  const foaie = await foaiaDeCitire(grupaId, luni);
  const duminica = adaugaZile(luni, 6);
  const anterioara = adaugaZile(luni, -7);
  const urmatoare = adaugaZile(luni, 7);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/grupe/${grupaId}`} className="text-sm text-cenusiu">
          ← {g.nume}
        </Link>
        <h1 className="mt-2 text-xl font-bold">Cititul Bibliei</h1>
        <p className="text-sm text-cenusiu">
          Bifează porțiile pe care le-a citit fiecare. Se poate bifa și în urmă,
          dacă recuperează.
        </p>
      </div>

      {/* Săptămâna */}
      <nav className="card flex items-center justify-between gap-2 p-2">
        <Link
          href={`/grupe/${grupaId}/citire?saptamana=${anterioara}`}
          className="buton buton-secundar buton-mic"
          aria-label="Săptămâna dinainte"
        >
          ←
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold">
            {dataScurta(luni)} – {dataScurta(duminica)}
          </p>
          <p className="text-xs text-cenusiu">
            {luni === luniaAsta ? "săptămâna asta" : luni === adaugaZile(luniaAsta, -7) ? "săptămâna trecută" : luni.slice(0, 4)}
          </p>
        </div>
        {luni < luniaAsta ? (
          <Link
            href={`/grupe/${grupaId}/citire?saptamana=${urmatoare}`}
            className="buton buton-secundar buton-mic"
            aria-label="Săptămâna următoare"
          >
            →
          </Link>
        ) : (
          <span className="w-11" />
        )}
      </nav>

      {!foaie.arePlan ? (
        <div className="card p-5 text-sm text-cenusiu">
          Planul de citire nu e încărcat încă. Coordonatorul îl pune din
          Administrare · Planul de citire.
        </div>
      ) : foaie.randuri.length === 0 ? (
        <div className="card p-5 text-sm text-cenusiu">
          Grupa nu are pulsiști încă. Musafirii nu apar aici.
        </div>
      ) : (
        <>
          {foaie.completat && (
            <p className="text-xs text-cenusiu">
              Completat de {foaie.completat.marcatDe ?? "cineva"},{" "}
              {momentLizibil(foaie.completat.actualizatLa)}.
            </p>
          )}
          <FoaieCitire
            key={luni}
            grupaId={grupaId}
            luni={luni}
            azi={azi}
            zile={foaie.zile}
            randuri={foaie.randuri.map((r) => ({
              id: r.id,
              nume: r.nume,
              bifate: r.bifate,
              deLa: r.deLa,
              inUrma: r.avans.inUrma,
              stare: r.avans.stare,
            }))}
            existaDeja={foaie.completat !== null}
          />
        </>
      )}
    </div>
  );
}
