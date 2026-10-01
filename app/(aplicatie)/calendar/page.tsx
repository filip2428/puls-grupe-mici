import Link from "next/link";

import { Calendar } from "@/componente/Calendar";
import { Icoana } from "@/componente/Icoane";
import { ceruteLider } from "@/lib/auth/sesiune";
import { grupeAccesibile } from "@/lib/interogari/acces";
import { calendarul } from "@/lib/interogari/calendar";
import {
  dataAzi,
  esteLunaValida,
  lunaAcum,
  lunaLizibila,
  lunaMutata,
  zileleGrilei,
} from "@/lib/util/date";

export const metadata = { title: "Calendar · Puls" };

export default async function PaginaCalendar({
  searchParams,
}: PageProps<"/calendar">) {
  const cerute = await searchParams;
  const cerutaLuna = cerute.luna;
  const luna =
    typeof cerutaLuna === "string" && esteLunaValida(cerutaLuna)
      ? cerutaLuna
      : lunaAcum();

  const lider = await ceruteLider();
  const esteAdmin = lider.rol === "admin";
  const grupele = await grupeAccesibile(lider);

  const zile = zileleGrilei(luna);
  const elemente = await calendarul({
    esteAdmin,
    liderId: lider.id,
    grupaIds: grupele.map((g) => g.id),
    deLa: zile[0],
    panaLa: zile[zile.length - 1],
  });

  const azi = dataAzi();
  /*
    Ce zi e deschisă la intrare.

    Cu `?zi=` în adresă se poate trimite cuiva o zi anume - dar numai una din
    grila lunii, altfel ar fi deschisă o zi care nici nu se vede. Fără ea:
    luna curentă se deschide pe azi, iar altă lună pe întâi.
  */
  const cerutaZi = cerute.zi;
  const ziInitiala =
    typeof cerutaZi === "string" && zile.includes(cerutaZi)
      ? cerutaZi
      : azi.slice(0, 7) === luna
        ? azi
        : `${luna}-01`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="titlu-pagina">Calendar</h1>
        <p className="text-sm text-cenusiu">
          {esteAdmin
            ? "Întâlnirile lucrării și slujirile programate. Apasă pe o zi ca s-o vezi sau să adaugi în ea."
            : "Ce are lucrarea în perioada asta și când slujește grupa ta."}
        </p>
      </div>

      {/* Luna: înapoi, înainte, și drumul scurt înapoi la azi. */}
      <div className="flex items-center gap-2">
        <SagataLuna
          catre={lunaMutata(luna, -1)}
          eticheta="Luna dinainte"
          semn="‹"
        />
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <span className="text-lg font-bold tracking-tight first-letter:uppercase">
            {lunaLizibila(luna)}
          </span>
          {luna !== lunaAcum() && (
            <Link
              href="/calendar"
              className="-my-1.5 inline-flex min-h-9 items-center rounded-full px-3 text-xs font-bold text-albastru"
            >
              înapoi la azi
            </Link>
          )}
        </div>
        <SagataLuna
          catre={lunaMutata(luna, 1)}
          eticheta="Luna următoare"
          semn="›"
        />
      </div>

      {/*
        Cheia e luna: la schimbarea lunii calendarul se face din nou, deci
        ziua deschisă nu rămâne una din luna de dinainte.
      */}
      <Calendar
        key={luna}
        luna={luna}
        azi={azi}
        zile={zile}
        elemente={elemente}
        esteAdmin={esteAdmin}
        /*
          Butoanele de prezență sunt pentru liderul care chiar are grupă în
          seara aia. Coordonatorul le vede pe toate din pagina grupelor - un
          șir de zece butoane aici n-ar ajuta pe nimeni.
        */
        grupeleMele={
          esteAdmin
            ? []
            : grupele
                .filter((g) => g.activa)
                .map((g) => ({ id: g.id, nume: g.nume }))
        }
        ziInitiala={ziInitiala}
      />

      {esteAdmin && elemente.length === 0 && (
        <p className="text-xs text-cenusiu">
          Luna asta e goală. Apasă pe ziua în care e întâlnirea și scrie-o -
          dacă se ține în fiecare săptămână, o singură apăsare le pune pe
          toate.
        </p>
      )}
    </div>
  );
}

/** Săgeata către luna dinainte sau de după. */
function SagataLuna({
  catre,
  eticheta,
  semn,
}: {
  catre: string;
  eticheta: string;
  semn: "‹" | "›";
}) {
  return (
    <Link
      href={`/calendar?luna=${catre}`}
      aria-label={eticheta}
      className="buton buton-secundar h-12 w-12 shrink-0 rounded-full p-0"
    >
      <Icoana
        nume="inainte"
        marime={20}
        grosime={2.2}
        className={semn === "‹" ? "rotate-180" : ""}
      />
    </Link>
  );
}
