import Link from "next/link";
import { notFound } from "next/navigation";

import { FoaieIntalnire } from "@/componente/FoaieIntalnire";
import { ceruteLider } from "@/lib/auth/sesiune";
import { grupeAccesibile } from "@/lib/interogari/acces";
import {
  arePrezentaPeIntalnire,
  evenimentul,
  foaiaIntalnirii,
} from "@/lib/interogari/prezenta-eveniment";
import { dataAzi, dataLunga } from "@/lib/util/date";

export const metadata = { title: "Prezența la întâlnire · Puls" };

export default async function PaginaPrezentaIntalnire({
  params,
}: PageProps<"/calendar/[id]/prezenta">) {
  const { id } = await params;
  const evenimentId = Number(id);
  if (!Number.isInteger(evenimentId)) notFound();

  const lider = await ceruteLider();
  const e = await evenimentul(evenimentId);
  if (!e) notFound();

  const [foaie, grupele] = await Promise.all([
    foaiaIntalnirii(evenimentId),
    grupeAccesibile(lider),
  ]);

  const azi = dataAzi();
  const inapoi = `/calendar?luna=${e.data.slice(0, 7)}&zi=${e.data}`;
  const detalii = [e.ora ? `ora ${e.ora}` : "", e.locatie ?? ""]
    .filter(Boolean)
    .join(" · ");

  /*
    Grupele liderului vin primele pe listă: la ușă caută pe oricine, dar la
    sfârșit se uită dacă au venit ai lui. Adminul le vede pe toate la fel.
  */
  const grupeleMele =
    lider.rol === "admin" ? [] : grupele.map((g) => g.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={inapoi} className="inapoi">
          Calendar
        </Link>
        <h1 className="titlu-pagina">{e.titlu}</h1>
        <p className="text-sm text-cenusiu">
          {e.data === azi ? "azi" : dataLunga(e.data)}
          {detalii ? ` · ${detalii}` : ""}
        </p>
      </div>

      {e.data > azi ? (
        <div className="card p-5 text-sm text-cenusiu">
          Întâlnirea n-a avut loc încă. Prezența se face în ziua ei sau după.
        </div>
      ) : !arePrezentaPeIntalnire(e, foaie.venit.length) ? (
        <div className="card flex flex-col gap-3 p-5 text-sm text-cenusiu">
          <p>
            În seara asta se stă pe grupe mici, deci prezența se face pe grupe,
            de fiecare lider la grupa lui.
          </p>
          {grupele
            .filter((g) => g.activa)
            .map((g) => (
              <Link
                key={g.id}
                href={`/grupe/${g.id}/prezenta?data=${e.data}`}
                className="buton buton-secundar"
              >
                Prezența la {g.nume}
              </Link>
            ))}
        </div>
      ) : (
        <FoaieIntalnire
          evenimentId={evenimentId}
          persoane={foaie.persoane}
          venitInitial={foaie.venit}
          grupeleMele={grupeleMele}
        />
      )}
    </div>
  );
}
