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
 * Antetul și navigarea sunt de sticlă, ca în iOS 26: nu sunt benzi lipite de
 * margini, ci insule care plutesc, iar lista curge pe sub ele (`.sticla`,
 * `.antet` și `.bara-tab` în `globals.css`).
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
      <header className="antet">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-3">
          <Link
            href="/grupe"
            className="sticla flex h-11 items-center gap-2.5 pr-4 pl-1.5 transition-transform active:scale-[0.96]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-albastru text-sm font-extrabold text-lime shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]">
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

          {/* Clopoțelul și inițialele stau în aceeași insulă, ca butoanele grupate din iOS. */}
          <div className="sticla ml-auto flex items-center p-0.5">
            <Link
              href="/setari#notificari"
              aria-label={
                necitite > 0
                  ? `Notificări, ${necitite} ${necitite === 1 ? "nouă" : "noi"}`
                  : "Notificări"
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-carbune transition-transform active:scale-[0.9] active:bg-carbune/5"
            >
              <Icoana nume="clopot" marime={21} />
              {necitite > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] rounded-full bg-red-600 px-1 text-center text-[11px] leading-[1.125rem] font-bold text-white ring-2 ring-hartie">
                  {necitite > 9 ? "9+" : necitite}
                </span>
              )}
            </Link>
            <Link
              href="/setari"
              aria-label={`Setări · ${lider.nume}${esteAdmin ? ", coordonator" : ""}`}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-[0.9]"
            >
              <span
                className={`avatar h-8 w-8 text-[11px] ${
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
