import Link from "next/link";

import { iesi } from "@/app/intra/actions";
import { FormularSetari } from "@/componente/FormularSetari";
import { InstaleazaAplicatia } from "@/componente/InstaleazaAplicatia";
import { NotificariTelefon } from "@/componente/NotificariTelefon";
import { ceruteLider } from "@/lib/auth/sesiune";
import { emailConfigurat } from "@/lib/email";
import { cheiePublica, pushConfigurat } from "@/lib/push";
import { cateNecitite, notificarileMele } from "@/lib/notificari";
import { momentLizibil } from "@/lib/util/date";
import {
  citesteTot,
  stergeNotificare,
  stergeToateNotificarile,
} from "./actions";

export const metadata = { title: "Setări · Puls" };

const ICOANE: Record<string, string> = {
  zi_nastere: "🎂",
  slujire: "🙌",
  prezenta: "📋",
  rezumat: "📊",
};

export default async function PaginaSetari() {
  const lider = await ceruteLider();
  const [notificari, necitite] = await Promise.all([
    notificarileMele(lider.id, 30),
    cateNecitite(lider.id),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Setări</h1>
        <p className="text-sm text-cenusiu">
          {lider.nume}
          {lider.rol === "admin" ? " · coordonator" : " · lider"}
        </p>
      </div>

      <InstaleazaAplicatia />

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Notificări pe telefon</h2>
        <p className="mb-4 text-xs text-cenusiu">
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
        <h2 className="mb-1 text-sm font-bold">Notificări pe email</h2>
        <p className="mb-4 text-xs text-cenusiu">
          Aceleași vești, dar scrise pe email. Bifele de mai jos hotărăsc ce
          primești, și pe telefon și pe email.
        </p>
        <FormularSetari
          initial={{
            email: lider.email,
            notifZileNastere: lider.notifZileNastere,
            notifSlujiri: lider.notifSlujiri,
            notifPrezenta: lider.notifPrezenta,
            notifRezumat: lider.notifRezumat,
          }}
          emailConfigurat={emailConfigurat()}
        />
      </section>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">
            Ce ai de știut
            {necitite > 0 && (
              <span className="ml-2 rounded-full bg-albastru px-2 py-0.5 text-[11px] font-semibold text-white">
                {necitite} {necitite === 1 ? "nouă" : "noi"}
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            {necitite > 0 && (
              <form action={citesteTot}>
                <button type="submit" className="buton buton-secundar buton-mic">
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
        </div>

        {notificari.length === 0 ? (
          <p className="text-sm text-cenusiu">
            Nimic deocamdată. Aici ajung zilele de naștere, slujirile și
            prezențele necompletate.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {notificari.map((n) => {
              const continut = (
                <>
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="text-lg leading-none">
                      {ICOANE[n.tip] ?? "•"}
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
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-albastru"
                      />
                    )}
                  </div>
                </>
              );

              return (
                <li key={n.id} className="py-3">
                  {n.link ? (
                    <Link href={n.link} className="block">
                      {continut}
                    </Link>
                  ) : (
                    continut
                  )}
                  <form
                    action={stergeNotificare.bind(null, n.id)}
                    className="mt-1 pl-8"
                  >
                    <button
                      type="submit"
                      className="text-xs text-cenusiu underline"
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

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Codul tău de acces</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Codul nu se poate vedea din nou - dacă l-ai pierdut, cere-i
          coordonatorului să genereze altul.
        </p>
        <form action={iesi}>
          <button type="submit" className="buton buton-secundar">
            Ieși din cont
          </button>
        </form>
      </section>
    </div>
  );
}
