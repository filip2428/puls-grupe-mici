import type { ProgramareAfisata } from "@/lib/interogari/slujiri";
import { dataLunga, dataScurta } from "@/lib/util/date";

/** Un rând din calendarul slujirilor: cine slujește, când și unde. */
export function RandProgramare({
  programare: p,
  azi,
}: {
  programare: ProgramareAfisata;
  azi: string;
}) {
  const cine = [p.grupaNume, p.echipaNume].filter(Boolean).join(" + ");
  const detaliu = [
    p.data === azi ? "azi" : dataLunga(p.data),
    p.ora ? `ora ${p.ora}` : "",
    p.locatie ?? "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-start gap-3">
      <span className="w-14 shrink-0 rounded-lg bg-albastru/10 px-2 py-1.5 text-center text-xs font-semibold text-albastru">
        {p.data === azi ? "azi" : dataScurta(p.data)}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{p.titlu}</span>
        <span className="block text-xs text-cenusiu">
          {cine ? `${cine} · ` : ""}
          {detaliu}
        </span>
        {p.detalii && (
          <span className="block text-xs text-cenusiu">{p.detalii}</span>
        )}
      </div>
    </div>
  );
}
