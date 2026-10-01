/**
 * Iconițele aplicației - toate desenate cu linii, aceeași grosime, fără
 * biblioteci externe și fără emoji (care arată altfel pe fiecare telefon).
 *
 * Sunt decorative: textul de lângă ele spune ce înseamnă, deci cititorul de
 * ecran le sare (`aria-hidden`). Unde iconița stă singură pe un buton, butonul
 * își primește numele prin `aria-label`.
 */

const DESENE = {
  grupe: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2.5" />
      <rect x="3" y="14" width="18" height="6" rx="2.5" />
    </>
  ),
  oameni: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3 2.9-4.6 5.5-4.6s4.9 1.6 5.5 4.6" />
      <path d="M16 5.5a3 3 0 0 1 0 5.6M18 14.8c1.6.7 2.7 2.1 3 4.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  /** Două mâini ridicate - slujire. */
  slujiri: (
    <>
      <path d="M8 20v-4.5C8 13 6.5 12 6.5 10.5V4.8a1.3 1.3 0 0 1 2.6 0V9" />
      <path d="M16 20v-4.5c0-2.5 1.5-3.5 1.5-5V4.8a1.3 1.3 0 0 0-2.6 0V9" />
      <path d="M9.1 9V3.3a1.45 1.45 0 0 1 2.9 0V9M14.9 9V3.3a1.45 1.45 0 0 0-2.9 0" />
    </>
  ),
  admin: (
    <>
      <path d="M4 20v-5M10 20V9M16 20v-8M22 20V5" />
      <path d="M2 20h20" />
    </>
  ),
  setari: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" />
    </>
  ),
  clopot: (
    <>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  ceas: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  loc: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  bifa: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M7 7l10 10M17 7 7 17" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M6 12h12" />,
  /** Mesaj trimis dinainte - „anunțat". */
  mesaj: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5v-7Z" />
    </>
  ),
  telefon: (
    <path d="M6.6 3.5h2.6l1.4 4-2 1.3a11 11 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
  ),
  carte: (
    <>
      <path d="M5 5a2 2 0 0 1 2-2h12v14.5H7a2 2 0 0 0-2 2V5Z" />
      <path d="M5 19.5a2 2 0 0 0 2 2h12v-4M9 7.5h6" />
    </>
  ),
  alerta: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.4v.1" />
    </>
  ),
  inainte: <path d="m9.5 6 6 6-6 6" />,
  descarca: (
    <>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  incarca: (
    <>
      <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" />
      <path d="M5 19.5h14" />
    </>
  ),
  tort: (
    <>
      <path d="M4 20.5h16M5 20.5v-6.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6.5" />
      <path d="M5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0" />
      <path d="M12 12V8.5M12 6.2c-.9-.8-.9-2 0-3 .9 1 .9 2.2 0 3Z" />
    </>
  ),
  foaie: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 14h7M8.5 18h4" />
    </>
  ),
  grafic: (
    <>
      <path d="M4 4v16h16" />
      <path d="m8 14 3.5-3.5 3 3L20 8" />
    </>
  ),
  lider: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  biserica: (
    <>
      <path d="M12 2.5v4M10 4.5h4" />
      <path d="M6 21v-8.5l6-5 6 5V21" />
      <path d="M3.5 21h17M10 21v-4a2 2 0 0 1 4 0v4" />
    </>
  ),
  asteapta: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5 1 0 1.9.2 2.7.5" />
      <path d="M19 15v3l1.8 1" />
      <circle cx="19" cy="18" r="3.7" />
    </>
  ),
  jurnal: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  scut: (
    <>
      <path d="M12 3 5 6v5.5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  arhiva: (
    <>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4" />
    </>
  ),
  iesire: (
    <>
      <path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </>
  ),
} as const;

export type NumeIcoana = keyof typeof DESENE;

export function Icoana({
  nume,
  marime = 20,
  grosime = 1.8,
  className,
}: {
  nume: NumeIcoana;
  marime?: number;
  grosime?: number;
  className?: string;
}) {
  return (
    <svg
      width={marime}
      height={marime}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosime}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {DESENE[nume]}
    </svg>
  );
}

/** Inițialele unui nume, pentru `.avatar`: „Maria Ilie" -> „MI". */
export function initiale(nume: string): string {
  const parti = nume.trim().split(/[\s-]+/).filter(Boolean);
  if (parti.length === 0) return "?";
  const prima = parti[0][0];
  const ultima = parti.length > 1 ? parti[parti.length - 1][0] : "";
  return (prima + ultima).toUpperCase();
}
