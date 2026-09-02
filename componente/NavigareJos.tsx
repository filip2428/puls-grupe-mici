"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { iesi } from "@/app/intra/actions";

/**
 * Bara de navigare de jos - locul unde ajunge degetul mare pe telefon.
 * Se ascunde pe foaia de prezență, ca să nu se bată cu bara de salvare.
 */
export function NavigareJos({ esteAdmin }: { esteAdmin: boolean }) {
  const cale = usePathname();
  if (cale.endsWith("/prezenta")) return null;

  const linkuri = [
    { href: "/grupe", text: "Grupe", icon: <IconGrupe /> },
    { href: "/adolescenti", text: "Adolescenți", icon: <IconOameni /> },
    ...(esteAdmin
      ? [{ href: "/admin", text: "Administrare", icon: <IconSetari /> }]
      : []),
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
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  activ ? "text-albastru" : "text-cenusiu"
                }`}
              >
                {l.icon}
                {l.text}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <form action={iesi} className="h-full">
            <button
              type="submit"
              className="flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-cenusiu"
            >
              <IconIesire />
              Ieși
            </button>
          </form>
        </li>
      </ul>
    </nav>
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

function IconIesire() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10 8 6 12l4 4M6 12h9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
