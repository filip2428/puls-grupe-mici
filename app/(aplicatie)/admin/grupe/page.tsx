import Link from "next/link";

import { FormularGrupaNoua } from "@/componente/AdminGrupe";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { rezumatGrupe } from "@/lib/interogari/statistici";
import { dataScurta } from "@/lib/util/date";

export const metadata = { title: "Grupe · Puls" };

export default async function PaginaAdminGrupe() {
  await ceruteAdmin();
  const rezumate = await rezumatGrupe();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-sm text-cenusiu">
          ← Administrare
        </Link>
        <h1 className="mt-2 text-xl font-bold">Grupe mici</h1>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Grupă nouă</h2>
        <FormularGrupaNoua />
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">{rezumate.length} grupe</h2>
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
                  </span>
                </div>
                <span className="text-sm text-cenusiu">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
