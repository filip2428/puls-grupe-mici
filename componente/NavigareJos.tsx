"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

/**
 * Bara de navigare de jos - locul unde ajunge degetul mare pe telefon.
 * Se ascunde pe foaia de prezență, ca să nu se bată cu bara de salvare.
 * „Ieși" stă în Setări: e un gest rar, n-are ce căuta lângă degetul mare.
 */
export function NavigareJos({
  esteAdmin,
  necitite,
}: {
  esteAdmin: boolean;
  necitite: number;
}) {
  const cale = usePathname();
  if (cale.endsWith("/prezenta")) return null;

  const linkuri = [
    { href: "/grupe", text: "Grupe", icon: <IconGrupe /> },
    { href: "/adolescenti", text: "Adolescenți", icon: <IconOameni /> },
    { href: "/slujiri", text: "Slujiri", icon: <IconSlujiri /> },
    ...(esteAdmin
      ? [{ href: "/admin", text: "Admin", icon: <IconAdmin /> }]
      : []),
    {
      href: "/setari",
      text: "Setări",
      icon: <IconSetari />,
      bulina: necitite,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e3e7f2] bg-hartie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-3xl items-stretch">
        {linkuri.map((l) => {
          const activ =
            cale === l.href || (l.href !== "/grupe" && cale.startsWith(l.href));
          return (
            <li key={l.href} className="flex-1">
              <Link
                href={l.href}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${
                  activ ? "text-albastru" : "text-cenusiu"
                }`}
              >
                <DunguliteAsteptare />
                <span className="relative">
                  {l.icon}
                  {!!l.bulina && (
                    <span className="absolute -top-1 -right-2 min-w-4 rounded-full bg-red-600 px-1 text-[9px] leading-4 font-bold text-white">
                      {l.bulina > 9 ? "9+" : l.bulina}
                    </span>
                  )}
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
      className={`absolute inset-x-3 top-0 h-0.5 rounded-full bg-albastru transition-opacity duration-150 ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

/* Iconițe simple, desenate cu linii - fără biblioteci externe. */

function IconGrupe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="7" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="14" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconOameni() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.5 19c.6-3 2.9-4.6 5.5-4.6s4.9 1.6 5.5 4.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M16 5.5a3 3 0 0 1 0 5.6M18 14.8c1.6.7 2.7 2.1 3 4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Două mâini ridicate - slujire. */
function IconSlujiri() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 20v-4.5C8 13 6.5 12 6.5 10.5V4.8a1.3 1.3 0 0 1 2.6 0V9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 20v-4.5c0-2.5 1.5-3.5 1.5-5V4.8a1.3 1.3 0 0 0-2.6 0V9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 9V3.3a1.45 1.45 0 0 1 2.9 0V9M14.9 9V3.3a1.45 1.45 0 0 0-2.9 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20v-5M10 20V9M16 20v-8M22 20V5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M2 20h20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconSetari() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
