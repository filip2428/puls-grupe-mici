import Link from "next/link";

import { ceruteAdmin } from "@/lib/auth/sesiune";
import { evolutiePrezenta, rezumatGrupe } from "@/lib/interogari/statistici";
import { dataScurta } from "@/lib/util/date";

export const metadata = { title: "Administrare · Puls" };

export default async function PaginaAdmin() {
  await ceruteAdmin();

  const [rezumate, evolutie] = await Promise.all([
    rezumatGrupe(),
    evolutiePrezenta(10),
  ]);

  const active = rezumate.filter((r) => r.activa);
  const totalAdolescenti = active.reduce((s, r) => s + r.membriActivi, 0);
  const totalAlerte = active.reduce((s, r) => s + r.alerte, 0);
  const medii = active.filter((r) => r.mediePrezenta !== null);
  const medieGenerala = medii.length
    ? Math.round(medii.reduce((s, r) => s + (r.mediePrezenta ?? 0), 0) / medii.length)
    : null;

  const maxim = Math.max(1, ...evolutie.map((e) => e.prezenti));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Administrare</h1>
        <p className="text-sm text-cenusiu">
          Toată lucrarea, dintr-o privire.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Caseta valoare={String(active.length)} eticheta="grupe active" />
        <Caseta valoare={String(totalAdolescenti)} eticheta="adolescenți" />
        <Caseta
          valoare={medieGenerala !== null ? `${medieGenerala}%` : "-"}
          eticheta="prezență medie"
        />
        <Caseta
          valoare={String(totalAlerte)}
          eticheta="de căutat"
          accent={totalAlerte > 0}
        />
      </div>

      <nav className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Buton href="/adolescenti" text="Adolescenți" />
        <Buton href="/admin/lideri" text="Lideri" />
        <Buton href="/admin/grupe" text="Grupe" />
        <Buton href="/admin/export" text="Export" />
        <Buton href="/admin/jurnal" text="Jurnal" />
      </nav>

      {evolutie.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-1 text-sm font-bold">Prezența pe săptămâni</h2>
          <p className="mb-4 text-xs text-cenusiu">
            Câți adolescenți au fost prezenți în toată lucrarea, pe săptămâni.
          </p>
          <ul className="flex items-end gap-2">
            {evolutie.map((e) => (
              <li key={e.data} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-albastru">
                  {e.prezenti}
                </span>
                <div
                  className="w-full rounded-t bg-albastru-deschis"
                  style={{ height: `${Math.round((e.prezenti / maxim) * 80) + 4}px` }}
                />
                <span className="text-[10px] text-cenusiu">
                  {dataScurta(e.data)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Grupele</h2>
        <ul className="flex flex-col divide-y divide-[#eef1f7]">
          {rezumate.map((r) => (
            <li key={r.grupaId}>
              <Link
                href={`/admin/grupe/${r.grupaId}`}
                className="flex items-center gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {r.nume}
                    {!r.activa && (
                      <span className="ml-2 text-xs text-cenusiu">arhivată</span>
                    )}
                  </span>
                  <span className="text-xs text-cenusiu">
                    {r.membriActivi} adolescenți
                    {r.ultimaIntalnire
                      ? ` · ultima întâlnire ${dataScurta(r.ultimaIntalnire)}`
                      : " · fără întâlniri"}
                    {r.mediePrezenta !== null ? ` · ${r.mediePrezenta}% prezență` : ""}
                  </span>
                </div>
                {r.alerte > 0 && (
                  <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                    {r.alerte}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Caseta({
  valoare,
  eticheta,
  accent,
}: {
  valoare: string;
  eticheta: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-3">
      <div
        className={`text-2xl font-bold ${accent ? "text-red-700" : "text-albastru"}`}
      >
        {valoare}
      </div>
      <div className="text-xs text-cenusiu">{eticheta}</div>
    </div>
  );
}

function Buton({ href, text }: { href: string; text: string }) {
  return (
    <Link
      href={href}
      className="card px-3 py-3 text-center text-sm font-semibold text-albastru"
    >
      {text}
    </Link>
  );
}
