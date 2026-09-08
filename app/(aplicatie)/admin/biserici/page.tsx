import Link from "next/link";

import {
  FormularBisericaNoua,
  FormularEditareBiserica,
} from "@/componente/AdminBiserici";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import {
  bisericileCunoscute,
  catiFaraBisericaScrisa,
} from "@/lib/interogari/biserici";
import { stergeBisericaAdmin } from "./actions";

export const metadata = { title: "Biserici · Puls" };

export default async function PaginaAdminBiserici() {
  await ceruteAdmin();

  const [biserici, faraScrisa] = await Promise.all([
    bisericileCunoscute(),
    catiFaraBisericaScrisa(),
  ]);

  const cuOameni = biserici.filter((b) => b.cati > 0).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-sm text-cenusiu">
          ← Administrare
        </Link>
        <h1 className="mt-2 text-xl font-bold">Biserici</h1>
        <p className="text-sm text-cenusiu">
          Bisericile din care ne vin pulsiști. Din lista asta se alege pe fișa
          fiecăruia, iar în statistici de aici vine împărțirea pe biserici.
        </p>
      </div>

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Biserică nouă</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Se poate adăuga una și direct de pe fișa unui pulsist, dacă tocmai
          atunci afli de unde vine.
        </p>
        <FormularBisericaNoua />
      </section>

      {faraScrisa > 0 && (
        <p className="card bg-lime/20 p-3 text-xs text-carbune">
          {faraScrisa === 1
            ? "Un pulsist e trecut ca venind de la altă biserică, fără să știm care."
            : `${faraScrisa} pulsiști sunt trecuți ca venind de la altă biserică, fără să știm care.`}{" "}
          <Link href="/pulsisti" className="text-albastru underline">
            Vezi pulsiștii
          </Link>
        </p>
      )}

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">
          {biserici.length === 1 ? "O biserică" : `${biserici.length} biserici`}
        </h2>
        {biserici.length > 0 && (
          <p className="mb-3 text-xs text-cenusiu">
            {cuOameni === 0
              ? "Deocamdată n-avem niciun pulsist scris din vreuna."
              : cuOameni === biserici.length
                ? "Din toate avem cel puțin un pulsist."
                : `Din ${cuOameni} avem pulsiști acum; restul așteaptă.`}
          </p>
        )}

        {biserici.length === 0 ? (
          <p className="py-3 text-sm text-cenusiu">
            Nicio biserică scrisă încă. Prima se adaugă mai sus.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {biserici.map((b) => (
              <li key={b.id} className="py-3">
                <details>
                  <summary className="flex cursor-pointer items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {b.nume}
                      </span>
                      <span className="text-xs text-cenusiu">
                        {[
                          b.localitate,
                          b.denominatiune,
                          b.cati === 1 ? "1 pulsist" : `${b.cati} pulsiști`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm text-albastru">
                      modifică
                    </span>
                  </summary>

                  <div className="mt-3 rounded-xl bg-fundal p-3">
                    <FormularEditareBiserica
                      bisericaId={b.id}
                      initial={{
                        nume: b.nume,
                        localitate: b.localitate,
                        denominatiune: b.denominatiune,
                      }}
                    />

                    {/*
                      Ștergerea stă sub încă un clic, nu pentru că ar fi
                      catastrofală, ci ca să nu se întâmple din greșeală când
                      cineva voia doar să îndrepte o literă din nume.
                    */}
                    <details className="mt-4 border-t border-[#e3e7f2] pt-3">
                      <summary className="min-h-11 cursor-pointer py-2 text-sm text-red-700">
                        Scoate biserica din listă
                      </summary>
                      <div className="pt-1">
                        <p className="mb-3 text-xs text-cenusiu">
                          {b.cati === 0
                            ? "Nu e nimeni din ea, deci nu se pierde nimic."
                            : b.cati === 1
                              ? "Pulsistul din ea rămâne trecut ca venind de la altă biserică, doar că nu se mai știe care."
                              : `Cei ${b.cati} pulsiști din ea rămân trecuți ca venind de la altă biserică, doar că nu se mai știe care.`}
                        </p>
                        <form action={stergeBisericaAdmin.bind(null, b.id)}>
                          <button type="submit" className="buton buton-secundar">
                            Șterge „{b.nume}&rdquo;
                          </button>
                        </form>
                      </div>
                    </details>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
