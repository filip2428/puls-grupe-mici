import Link from "next/link";

import { iesi } from "@/app/intra/actions";
import { ceruteLider } from "@/lib/auth/sesiune";

/**
 * Cadrul comun al aplicației: bara de sus și verificarea că ești autentificat.
 * Orice pagină din acest folder cere o sesiune validă.
 */
export default async function LayoutAplicatie({
  children,
}: LayoutProps<"/">) {
  const lider = await ceruteLider();
  const esteAdmin = lider.rol === "admin";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-[#e3e7f2] bg-hartie/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href={esteAdmin ? "/admin" : "/grupe"}
            className="flex items-center gap-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-albastru text-sm font-black text-lime">
              P
            </span>
            <span className="text-sm font-bold text-albastru">Grupe mici</span>
          </Link>

          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link
              href="/grupe"
              className="rounded-lg px-3 py-1.5 text-carbune hover:bg-fundal"
            >
              Grupele mele
            </Link>
            {esteAdmin && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 text-carbune hover:bg-fundal"
              >
                Administrare
              </Link>
            )}
            <form action={iesi}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-cenusiu hover:bg-fundal"
                title={`Ești ${lider.nume}`}
              >
                Ieși
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">{children}</main>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-6 pt-2 text-center text-xs text-cenusiu">
        Ești conectat ca <span className="font-semibold">{lider.nume}</span>
        {esteAdmin && " (administrator)"}.
      </footer>
    </div>
  );
}
