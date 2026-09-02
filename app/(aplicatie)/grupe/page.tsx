import Link from "next/link";

import { ceruteLider } from "@/lib/auth/sesiune";
import { grupeAccesibile, type GrupaAccesibila } from "@/lib/interogari/acces";
import { grupeCuPrezentaLa } from "@/lib/interogari/grupe";
import {
  rezumatGrupe,
  type RezumatGrupaAdmin,
} from "@/lib/interogari/statistici";
import { ZILE_SAPTAMANA, dataAzi, dataScurta } from "@/lib/util/date";

export const metadata = { title: "Grupele mele · Puls" };

export default async function PaginaGrupe() {
  const lider = await ceruteLider();
  const esteAdmin = lider.rol === "admin";
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
      <h1 className="mb-1 text-xl font-bold">
        {esteAdmin
          ? "Toate grupele"
          : aleMele.length === 1
            ? "Grupa mea"
            : "Grupele mele"}
      </h1>
      <p className="mb-5 text-sm text-cenusiu">
        {esteAdmin
          ? "Alege grupa ca să faci prezența sau să vezi istoricul."
          : aleMele.length === 0 && inlocuiri.length > 0
            ? "Deocamdată ții doar locul altcuiva."
            : "Alege grupa ca să faci prezența sau să vezi istoricul."}
      </p>

      {grupe.length === 0 && (
        <div className="card p-6 text-center text-sm text-cenusiu">
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
          <h2 className="text-sm font-bold">Ții locul la</h2>
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
    <li className={`card overflow-hidden ${g.prinInlocuire ? "border-dashed" : ""}`}>
      <Link href={`/grupe/${g.id}`} className="block p-4 hover:bg-fundal/60">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold">{g.nume}</h2>
              {g.prinInlocuire && (
                <span className="rounded-full bg-lime/30 px-2 py-0.5 text-[11px] font-semibold text-carbune">
                  până {dataScurta(g.inlocuirePanaLa!)}
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
              <span>{r?.membriActivi ?? 0} pulsiști</span>
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
              title="Pulsiști care au lipsit de mai multe ori la rând"
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
}
