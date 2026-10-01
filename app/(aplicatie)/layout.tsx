import Link from "next/link";

import { BaraOffline } from "@/componente/BaraOffline";
import { Icoana, initiale } from "@/componente/Icoane";
import { NavigareJos } from "@/componente/NavigareJos";
import { ServiceWorker } from "@/componente/ServiceWorker";
import { ceruteLider } from "@/lib/auth/sesiune";
import { cateNecitite } from "@/lib/notificari";

/**
 * Cadrul comun al aplicației.
 *
 * Gândit întâi pentru telefon: antet subțire sus, navigare mare jos (unde
 * ajunge degetul), conținutul pe toată lățimea, cu marginile respirând.
 *
 * Setările și notificările stau sus, în dreapta: sunt ale tale, nu ale
 * lucrării, și le deschizi rar - bara de jos rămâne cu cel mult cinci locuri,
 * cât încap fără să se înghesuie sub deget.
 */
export default async function LayoutAplicatie({ children }: LayoutProps<"/">) {
  const lider = await ceruteLider();
  const esteAdmin = lider.rol === "admin";
  const necitite = await cateNecitite(lider.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <ServiceWorker />
      <BaraOffline />
      <header className="sticky top-0 z-20 border-b border-linie bg-hartie/90 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Link
            href="/grupe"
            className="-ml-1 flex min-h-11 items-center gap-2.5 rounded-xl pr-2 pl-1"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[0.6rem] bg-albastru text-sm font-extrabold text-lime shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]">
              P
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[0.9375rem] font-extrabold tracking-tight text-albastru">
                Puls
              </span>
              <span className="mt-0.5 text-[11px] font-semibold text-cenusiu">
                grupe mici
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/setari#notificari"
              aria-label={
                necitite > 0
                  ? `Notificări, ${necitite} ${necitite === 1 ? "nouă" : "noi"}`
                  : "Notificări"
              }
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-carbune active:bg-fundal"
            >
              <Icoana nume="clopot" marime={22} />
              {necitite > 0 && (
                <span className="absolute top-1.5 right-1 min-w-[1.125rem] rounded-full bg-red-600 px-1 text-center text-[11px] leading-[1.125rem] font-bold text-white ring-2 ring-hartie">
                  {necitite > 9 ? "9+" : necitite}
                </span>
              )}
            </Link>
            <Link
              href="/setari"
              aria-label={`Setări · ${lider.nume}${esteAdmin ? ", coordonator" : ""}`}
              className="flex h-11 w-11 items-center justify-center rounded-full"
            >
              <span
                className={`avatar h-9 w-9 text-xs ${
                  esteAdmin ? "bg-albastru text-lime" : ""
                }`}
              >
                {initiale(lider.nume)}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28">
        {children}
      </main>

      <NavigareJos esteAdmin={esteAdmin} />
    </div>
  );
}
