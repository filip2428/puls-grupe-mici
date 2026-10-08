"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { Icoana, type NumeIcoana } from "@/componente/Icoane";

/**
 * Bara de navigare de jos - locul unde ajunge degetul mare pe telefon.
 * Se ascunde pe foaia de prezență, ca să nu se bată cu bara de salvare.
 *
 * Arată ca tab bar-ul din iOS 26: o capsulă de sticlă care plutește peste
 * listă (stilul e în `globals.css`, la `.bara-tab`). Când derulezi în jos se
 * strânge la iconițe; când urci puțin, sau ajungi iar sus, revine.
 *
 * Cel mult cinci locuri: cu șase, etichetele ajung la 10px și degetul nimerește
 * vecinul. Setările (și „Ieși", odată cu ele) stau în antet, la inițiale -
 * e un gest rar, n-are ce căuta lângă degetul mare.
 *
 * Tabul deschis nu se recunoaște doar după culoare: are și o lentilă în
 * spate, ca să se vadă și de cine nu deosebește bine culorile. Lentila pleacă
 * spre tabul atins imediat, nu abia când a sosit pagina - așa se simte o
 * aplicație de pe telefon.
 */
export function NavigareJos({ esteAdmin }: { esteAdmin: boolean }) {
  const cale = usePathname();
  // Tabul atins, ținut minte doar cât suntem încă pe pagina de unde s-a atins.
  const [atins, setAtins] = useState<{ de: string; href: string } | null>(null);
  const mic = useStransaLaDerulare(cale);

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

  const esteActiv = (href: string) =>
    cale === href || (href !== "/grupe" && cale.startsWith(href));
  const tinta = atins?.de === cale ? atins.href : null;
  const indexActiv = tinta
    ? linkuri.findIndex((l) => l.href === tinta)
    : linkuri.findIndex((l) => esteActiv(l.href));

  return (
    <nav
      aria-label="Navigare principală"
      className="bara-tab"
      data-mic={mic ? "" : undefined}
    >
      <div
        className="bara-tab-capsula sticla"
        style={{ "--n": linkuri.length } as CSSProperties}
      >
        {/* Pe paginile din afara taburilor (Setări, fișa unui pulsist) lentila se stinge pe loc. */}
        <span
          aria-hidden
          className={`bara-tab-lentila ${indexActiv < 0 ? "opacity-0" : ""}`}
          style={{ "--i": Math.max(indexActiv, 0) } as CSSProperties}
        />
        <ul className="relative flex items-stretch">
          {linkuri.map((l, i) => {
            const activ = i === indexActiv;
            return (
              <li key={l.href} className="relative min-w-0 flex-1">
                <Link
                  href={l.href}
                  aria-current={esteActiv(l.href) ? "page" : undefined}
                  onClick={() => setAtins({ de: cale, href: l.href })}
                  className={`bara-tab-link relative flex flex-col items-center justify-center gap-0.5 rounded-full px-1 text-xs active:scale-[0.92] ${
                    activ ? "font-bold text-albastru" : "font-medium text-carbune/70"
                  }`}
                >
                  <DunguliteAsteptare />
                  <Icoana nume={l.icoana} marime={22} grosime={activ ? 2 : 1.7} />
                  <span className="bara-tab-eticheta">{l.text}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/**
 * Spune dacă bara trebuie strânsă: da după ce ai coborât un pic prin pagină,
 * nu când urci (fie și puțin) sau ești aproape de vârf - ca în iOS.
 *
 * Mișcările mici nu contează, ca bara să nu tremure când degetul doar se
 * odihnește pe ecran. Pe o pagină nouă bara pornește mereu întreagă: starea
 * se ține minte împreună cu calea pe care s-a strâns.
 */
function useStransaLaDerulare(cale: string) {
  const [stransaPe, setStransaPe] = useState<string | null>(null);

  useEffect(() => {
    let ultimul = window.scrollY;
    let cadru = 0;
    const laDerulare = () => {
      if (cadru) return;
      cadru = requestAnimationFrame(() => {
        cadru = 0;
        const y = window.scrollY;
        const pas = y - ultimul;
        if (y < 64) setStransaPe(null);
        else if (pas > 8) setStransaPe(cale);
        else if (pas < -8) setStransaPe(null);
        else return; // mișcare prea mică - ținem minte punctul vechi
        ultimul = y;
      });
    };
    window.addEventListener("scroll", laDerulare, { passive: true });
    return () => {
      window.removeEventListener("scroll", laDerulare);
      cancelAnimationFrame(cadru);
    };
  }, [cale]);

  return stransaPe === cale;
}

/**
 * Dunga subțire care apare sus în tabul apăsat, cât timp se așteaptă pagina.
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
      className={`absolute inset-x-5 top-1 h-0.5 rounded-full bg-albastru transition-opacity duration-150 ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
