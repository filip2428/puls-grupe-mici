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

          <button type="submit" className="buton buton-principal self-start">
            Descarcă fișierul
          </button>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-bold">Tabelul cu toți adolescenții</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Nume, grupă, statut (membru sau musafir), clasă, vârstă, telefoane și
          datele părinților, plus totalurile de prezență.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/export/adolescenti"
            className="buton buton-principal"
          >
            Descarcă lista completă
          </a>
          <Link href="/adolescenti" className="buton buton-secundar">
            Filtrează întâi
          </Link>
        </div>
      </section>
    </div>
  );
}
