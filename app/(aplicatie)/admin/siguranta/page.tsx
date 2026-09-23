import Link from "next/link";

import { ButonTrimiteCopia, RestaurareCopie } from "@/componente/CopieSiguranta";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { destinatariiCopiei, ultimaCopieTrimisa } from "@/lib/copie";
import { emailActiv } from "@/lib/email";
import { momentLizibil } from "@/lib/util/date";

export const metadata = { title: "Siguranța datelor · Puls" };

export default async function PaginaSiguranta() {
  await ceruteAdmin();
  const [destinatari, ultima] = await Promise.all([
    destinatariiCopiei(),
    ultimaCopieTrimisa(),
  ]);
  const emailPornit = emailActiv();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-sm text-cenusiu">
          ← Administrare
        </Link>
        <h1 className="mt-2 text-xl font-bold">Siguranța datelor</h1>
        <p className="text-sm text-cenusiu">
          O copie a întregii baze de date - pulsiști, prezențe, slujiri, citit,
          lideri - dintr-un singur fișier. Cu ea, orice greșeală se poate da
          înapoi.
        </p>
      </div>

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Descarcă o copie acum</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Un fișier .json.gz, de obicei câteva sute de KB. Ține-l undeva în afara
          telefonului - pe laptop, în Drive.
        </p>
        <a href="/api/copie" className="buton buton-principal">
          Descarcă copia
        </a>
      </section>

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Copia săptămânală pe email</h2>
        {emailPornit ? (
          destinatari.length > 0 ? (
            <p className="mb-3 text-xs text-cenusiu">
              În fiecare duminică dimineață pleacă o copie la administratori:{" "}
              {destinatari.join(", ")}.
            </p>
          ) : (
            <p className="mb-3 rounded-xl bg-lime/25 px-3 py-2 text-xs">
              Niciun administrator nu are adresa de email scrisă, deci copia n-are
              unde să plece. Pune-ți adresa din Setări.
            </p>
          )
        ) : (
          <p className="mb-3 rounded-xl bg-lime/25 px-3 py-2 text-xs">
            Trimiterea pe email nu e încă pornită pe server (EMAIL_PORNIT=da, după
            ce domeniul e verificat în Resend). Până atunci, descarcă copia de
            mână, măcar o dată pe lună.
          </p>
        )}
        <p className="mb-3 text-xs text-cenusiu">
          Ultima copie trimisă:{" "}
          {ultima ? momentLizibil(ultima) : "niciuna până acum"}.
        </p>
        {emailPornit && destinatari.length > 0 && <ButonTrimiteCopia />}
      </section>

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Restaurează dintr-o copie</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Pentru când s-a șters ceva din greșeală sau s-a stricat ceva. Datele
          aplicației devin exact cele din momentul copiei.
        </p>
        <RestaurareCopie />
      </section>
    </div>
  );
}
