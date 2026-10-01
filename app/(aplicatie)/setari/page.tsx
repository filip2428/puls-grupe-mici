import Link from "next/link";

import { iesi } from "@/app/intra/actions";
import { ButonEmailProba } from "@/componente/ButonEmailProba";
import { FormularSetari } from "@/componente/FormularSetari";
import { Icoana, initiale, type NumeIcoana } from "@/componente/Icoane";
import { InstaleazaAplicatia } from "@/componente/InstaleazaAplicatia";
import { NotificariTelefon } from "@/componente/NotificariTelefon";
import { TitluSectiune } from "@/componente/TitluSectiune";
import { ceruteLider } from "@/lib/auth/sesiune";
import { emailActiv } from "@/lib/email";
import { cheiePublica, pushConfigurat } from "@/lib/push";
import { cateNecitite, notificarileMele } from "@/lib/notificari";
import { momentLizibil } from "@/lib/util/date";
import {
  citesteTot,
  stergeNotificare,
  stergeToateNotificarile,
} from "./actions";

export const metadata = { title: "Setări · Puls" };

/* Iconița fiecărui fel de notificare - desenată, nu emoji: arată la fel pe orice telefon. */
const ICOANE: Record<string, { icoana: NumeIcoana; ton: string }> = {
  zi_nastere: { icoana: "tort", ton: "bg-lime-pal text-carbune" },
  slujire: { icoana: "slujiri", ton: "bg-albastru-deschis/15 text-albastru" },
  prezenta: { icoana: "foaie", ton: "bg-albastru-pal text-albastru" },
  rezumat: { icoana: "grafic", ton: "bg-albastru-pal text-albastru" },
  citire: { icoana: "carte", ton: "bg-albastru-pal text-albastru" },
};

export default async function PaginaSetari() {
  const lider = await ceruteLider();
  const [notificari, necitite] = await Promise.all([
    notificarileMele(lider.id, 30),
    cateNecitite(lider.id),
  ]);

  const arataEmail = emailActiv();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span
          className={`avatar h-14 w-14 text-lg ${
            lider.rol === "admin" ? "bg-albastru text-lime" : ""
          }`}
        >
          {initiale(lider.nume)}
        </span>
        <div className="min-w-0">
          <h1 className="titlu-pagina">Setări</h1>
          <p className="truncate text-sm text-cenusiu">
            {lider.nume}
            {lider.rol === "admin" ? " · coordonator" : " · lider"}
          </p>
        </div>
      </div>

      {/*
        Notificările stau primele: aici te aduce clopoțelul din antet, și e
        singura parte din pagină care se schimbă de la o zi la alta.
      */}
      <section id="notificari" className="card scroll-mt-20 p-4">
        <TitluSectiune
          icoana="clopot"
          className="mb-3"
          dreapta={
            necitite > 0 ? (
              <span className="shrink-0 rounded-full bg-albastru px-2.5 py-0.5 text-[11px] font-bold text-white">
                {necitite} {necitite === 1 ? "nouă" : "noi"}
              </span>
            ) : null
          }
        >
          Ce ai de știut
        </TitluSectiune>

        {(necitite > 0 || notificari.length > 0) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {necitite > 0 && (
              <form action={citesteTot}>
                <button type="submit" className="buton buton-secundar buton-mic">
                  <Icoana nume="bifa" marime={15} grosime={2.2} />
                  Le-am văzut
                </button>
              </form>
            )}
            {notificari.length > 0 && (
              <form action={stergeToateNotificarile}>
                <button
                  type="submit"
                  className="buton buton-secundar buton-mic text-red-700"
                >
                  Șterge tot
                </button>
              </form>
            )}
          </div>
        )}

        {notificari.length === 0 ? (
          <p className="text-sm text-cenusiu">
            Nimic deocamdată. Aici ajung zilele de naștere, slujirile și
            prezențele necompletate.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-linie">
            {notificari.map((n) => {
              const continut = (
                <>
                  <div className="flex items-start gap-3">
                    <span
                      className={`icoana-sectiune h-9 w-9 ${
                        ICOANE[n.tip]?.ton ?? "bg-fundal text-cenusiu"
                      }`}
                    >
                      <Icoana
                        nume={ICOANE[n.tip]?.icoana ?? "clopot"}
                        marime={17}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`block text-sm ${n.citita ? "font-medium" : "font-bold"}`}
                      >
                        {n.titlu}
                      </span>
                      <span className="block text-xs whitespace-pre-line text-cenusiu">
                        {n.mesaj}
                      </span>
                      <span className="mt-1 block text-[11px] text-cenusiu">
                        {momentLizibil(n.creatLa)}
                        {n.trimisaLa ? " · trimisă pe email" : ""}
                      </span>
                    </div>
                    {!n.citita && (
                      <span
                        aria-label="necitită"
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-albastru"
                      />
                    )}
                  </div>
                </>
              );

              return (
                <li key={n.id} className="py-3">
                  {n.link ? (
                    <Link href={n.link} className="-mx-2 block rounded-xl px-2 py-1">
                      {continut}
                    </Link>
                  ) : (
                    continut
                  )}
                  <form
                    action={stergeNotificare.bind(null, n.id)}
                    className="pl-12"
                  >
                    <button
                      type="submit"
                      className="min-h-9 text-xs font-medium text-cenusiu underline"
                    >
                      șterge
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <InstaleazaAplicatia />

      <section className="card p-4">
        <TitluSectiune icoana="telefon" className="mb-1">
          Notificări pe telefon
        </TitluSectiune>
        <p className="mb-4 pl-12 text-xs text-cenusiu">
          Îți sună telefonul când se întâmplă ceva la grupa ta, chiar dacă
          aplicația e închisă.
        </p>
        {pushConfigurat() ? (
          <NotificariTelefon cheiePublica={cheiePublica()} />
        ) : (
          <p className="text-sm text-cenusiu">
            Notificările pe telefon nu sunt încă pornite pe server. Coordonatorul
            trebuie să pună cheile de trimitere.
          </p>
        )}
      </section>

      <section className="card p-4">
        <TitluSectiune icoana="setari" className="mb-1">
          {arataEmail ? "Ce afli și pe email" : "Ce vrei să afli"}
        </TitluSectiune>
        <p className="mb-4 pl-12 text-xs text-cenusiu">
          {arataEmail
            ? "Bifele hotărăsc ce primești, și pe telefon și pe email."
            : "Bifele hotărăsc ce ajunge pe telefon. Ce nu bifezi nu te mai caută."}
        </p>
        <FormularSetari
          initial={{
            email: lider.email,
            notifZileNastere: lider.notifZileNastere,
            notifSlujiri: lider.notifSlujiri,
            notifPrezenta: lider.notifPrezenta,
            notifRezumat: lider.notifRezumat,
          }}
          arataEmail={arataEmail}
        />

        {arataEmail && <ButonEmailProba areAdresa={!!lider.email} />}
      </section>

      <section className="card p-4">
        <TitluSectiune icoana="lider" ton="gri" className="mb-1">
          Codul tău de acces
        </TitluSectiune>
        <p className="mb-3 pl-12 text-xs text-cenusiu">
          Codul nu se poate vedea din nou - dacă l-ai pierdut, cere-i
          coordonatorului să genereze altul.
        </p>
        <form action={iesi}>
          <button type="submit" className="buton buton-secundar w-full">
            <Icoana nume="iesire" marime={18} />
            Ieși din cont
          </button>
        </form>
      </section>
    </div>
  );
}
