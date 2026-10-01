"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { Icoana, type NumeIcoana } from "@/componente/Icoane";

/**
 * Bara de navigare de jos - locul unde ajunge degetul mare pe telefon.
 * Se ascunde pe foaia de prezență, ca să nu se bată cu bara de salvare.
 *
 * Cel mult cinci locuri: cu șase, etichetele ajung la 10px și degetul nimerește
 * vecinul. Setările (și „Ieși", odată cu ele) stau în antet, la inițiale -
 * e un gest rar, n-are ce căuta lângă degetul mare.
 *
 * Tabul deschis nu se recunoaște doar după culoare: are și o pastilă în
 * spatele iconiței, ca să se vadă și de cine nu deosebește bine culorile.
 */
export function NavigareJos({ esteAdmin }: { esteAdmin: boolean }) {
  const cale = usePathname();
  // Foile de prezență și de citit au bara lor de salvare, tot jos.
  if (cale.endsWith("/prezenta") || /^\/grupe\/\d+\/citire$/.test(cale)) return null;

  const linkuri: { href: string; text: string; icoana: NumeIcoana }[] = [
    { href: "/grupe", text: "Grupe", icoana: "grupe" },
    { href: "/pulsisti", text: "Pulsiști", icoana: "oameni" },
    { href: "/calendar", text: "Calendar", icoana: "calendar" },
    { href: "/slujiri", text: "Slujiri", icoana: "slujiri" },
    ...(esteAdmin
      ? [{ href: "/admin", text: "Admin", icoana: "admin" as const }]
      : []),
  ];

  return (
    <nav aria-label="Navigare principală" className="bara-jos">
      <ul className="mx-auto flex max-w-3xl items-stretch px-1">
        {linkuri.map((l) => {
          const activ =
            cale === l.href || (l.href !== "/grupe" && cale.startsWith(l.href));
          return (
            <li key={l.href} className="flex-1">
              <Link
                href={l.href}
                aria-current={activ ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs ${
                  activ ? "font-bold text-albastru" : "font-medium text-cenusiu"
                }`}
              >
                <span
                  className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 ${
                    activ ? "bg-albastru-pal" : ""
                  }`}
                >
                  <DunguliteAsteptare />
                  <Icoana nume={l.icoana} marime={22} grosime={activ ? 2 : 1.7} />
                </span>
                {l.text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Dunga subțire care apare deasupra tabului apăsat, cât timp se așteaptă pagina.
 *
 * Când pagina a apucat să fie preluată dinainte, `pending` nici nu ajunge să
 * fie adevărat, deci dunga nu clipește degeaba - se vede doar când chiar e de
 * așteptat. E desenată mereu, doar transparența se schimbă, ca să nu miște
 * nimic pe ecran.
 */
function DunguliteAsteptare() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`absolute inset-x-3 -top-2 h-0.5 rounded-full bg-albastru transition-opacity duration-150 ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
