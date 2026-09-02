import Link from "next/link";

import { BaraOffline } from "@/componente/BaraOffline";
import { NavigareJos } from "@/componente/NavigareJos";
import { ServiceWorker } from "@/componente/ServiceWorker";
import { ceruteLider } from "@/lib/auth/sesiune";
import { cateNecitite } from "@/lib/notificari";

/**
 * Cadrul comun al aplicației.
 *
 * Gândit întâi pentru telefon: antet subțire sus, navigare mare jos (unde
 * ajunge degetul), conținutul pe toată lățimea, cu marginile respirând.
 */
export default async function LayoutAplicatie({ children }: LayoutProps<"/">) {
  const lider = await ceruteLider();
  const esteAdmin = lider.rol === "admin";
  const necitite = await cateNecitite(lider.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <ServiceWorker />
      <BaraOffline />
      <header className="sticky top-0 z-20 border-b border-[#e3e7f2] bg-hartie/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5">
          <Link href="/grupe" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-albastru text-xs font-black text-lime">
              P
            </span>
            <span className="text-sm font-bold text-albastru">Grupe mici</span>
          </Link>
          <span className="ml-auto truncate text-xs text-cenusiu">
            {lider.nume}
            {esteAdmin && " · coordonator"}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24">
        {children}
      </main>

      <NavigareJos esteAdmin={esteAdmin} necitite={necitite} />
    </div>
  );
}
