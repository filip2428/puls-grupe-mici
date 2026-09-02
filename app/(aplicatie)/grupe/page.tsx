import Link from "next/link";

import { ceruteLider } from "@/lib/auth/sesiune";
import { grupeAccesibile } from "@/lib/interogari/acces";
import { grupeCuPrezentaLa } from "@/lib/interogari/grupe";
import { rezumatGrupe } from "@/lib/interogari/statistici";
import { ZILE_SAPTAMANA, dataAzi, dataScurta } from "@/lib/util/date";

export const metadata = { title: "Grupele mele · Puls" };

export default async function PaginaGrupe() {
  const lider = await ceruteLider();
  const grupe = await grupeAccesibile(lider);
  const azi = dataAzi();

  const [rezumate, cuPrezentaAzi] = await Promise.all([
    rezumatGrupe({ ids: grupe.map((g) => g.id) }),
    grupeCuPrezentaLa(
      grupe.map((g) => g.id),
      azi,
    ),
  ]);
  const dupaId = new Map(rezumate.map((r) => [r.grupaId, r]));

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">
        {lider.rol === "admin" ? "Toate grupele" : "Grupele mele"}
      </h1>
      <p className="mb-5 text-sm text-cenusiu">
        Alege grupa ca să faci prezența sau să vezi istoricul.
      </p>

      {grupe.length === 0 && (
        <div className="card p-6 text-center text-sm text-cenusiu">
          Nu ești repartizat încă la nicio grupă. Vorbește cu coordonatorul
          lucrării.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {grupe.map((g) => {
          const r = dupaId.get(g.id);
          const prezentaFacuta = cuPrezentaAzi.has(g.id);
          return (
            <li key={g.id} className="card overflow-hidden">
              <Link href={`/grupe/${g.id}`} className="block p-4 hover:bg-fundal/60">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold">{g.nume}</h2>
                      {g.prinInlocuire && (
                        <span className="rounded-full bg-lime/30 px-2 py-0.5 text-[11px] font-semibold text-carbune">
                          înlocuire până {dataScurta(g.inlocuirePanaLa!)}
                        </span>
                      )}
                      {!g.activa && (
                        <span className="rounded-full bg-fundal px-2 py-0.5 text-[11px] text-cenusiu">
                          inactivă
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-cenusiu">
                      {g.ziIntalnire !== null && ZILE_SAPTAMANA[g.ziIntalnire]}
                      {g.oraIntalnire ? `, ora ${g.oraIntalnire}` : ""}
                      {g.locatie ? ` · ${g.locatie}` : ""}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cenusiu">
                      <span>{r?.membriActivi ?? 0} adolescenți</span>
                      {r?.ultimaIntalnire && (
                        <span>
                          ultima întâlnire: {dataScurta(r.ultimaIntalnire)}
                          {r.prezentiUltima !== null && ` (${r.prezentiUltima} prezenți)`}
                        </span>
                      )}
                      {r?.mediePrezenta !== null && r?.mediePrezenta !== undefined && (
                        <span>prezență medie {r.mediePrezenta}%</span>
                      )}
                    </p>
                  </div>

                  {!!r?.alerte && (
                    <span
                      className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                      title="Adolescenți care au lipsit de mai multe ori la rând"
                    >
                      {r.alerte} de căutat
                    </span>
                  )}
                </div>
              </Link>

              <div className="border-t border-[#eef1f7] px-4 py-3">
                <Link
                  href={`/grupe/${g.id}/prezenta?data=${azi}`}
                  className={`buton ${prezentaFacuta ? "buton-secundar" : "buton-principal"}`}
                >
                  {prezentaFacuta ? "Modifică prezența de azi" : "Fă prezența de azi"}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
