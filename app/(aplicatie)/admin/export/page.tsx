import Link from "next/link";

import { ceruteAdmin } from "@/lib/auth/sesiune";
import { toateGrupele } from "@/lib/interogari/lideri";

export const metadata = { title: "Export · Puls" };

export default async function PaginaExport() {
  await ceruteAdmin();
  const grupe = await toateGrupele();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-sm text-cenusiu">
          ← Administrare
        </Link>
        <h1 className="mt-2 text-xl font-bold">Export în Excel</h1>
        <p className="text-sm text-cenusiu">
          Fișierul are trei foi: prezențele una câte una, adolescenții cu
          totalurile lor și întâlnirile.
        </p>
      </div>

      <section className="card p-4">
        <form action="/api/export" className="flex flex-col gap-3">
          <div>
            <label className="eticheta" htmlFor="grupa">
              Grupa
            </label>
            <select id="grupa" name="grupa" className="camp" defaultValue="">
              <option value="">Toate grupele</option>
              {grupe.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nume}
                  {g.activa ? "" : " (arhivată)"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="eticheta" htmlFor="deLa">
                De la data (opțional)
              </label>
              <input id="deLa" name="deLa" type="date" className="camp" />
            </div>
            <div>
              <label className="eticheta" htmlFor="panaLa">
                Până la data (opțional)
              </label>
              <input id="panaLa" name="panaLa" type="date" className="camp" />
            </div>
          </div>

          <button
            type="submit"
            className="self-start rounded-lg bg-albastru px-4 py-2 text-sm font-semibold text-white"
          >
            Descarcă fișierul
          </button>
        </form>
      </section>
    </div>
  );
}
