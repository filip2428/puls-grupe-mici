import Link from "next/link";

import { ButonCodNou, FormularLiderNou } from "@/componente/AdminLideri";
import { ZonaStergere } from "@/componente/ZonaStergere";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { listaLideri } from "@/lib/interogari/lideri";
import { pierderiLider } from "@/lib/interogari/stergere";
import { momentLizibil } from "@/lib/util/date";
import { schimbaActivLider, schimbaRol, stergeLider } from "../actions";

export const metadata = { title: "Lideri · Puls" };

export default async function PaginaLideri() {
  const admin = await ceruteAdmin();
  const lideri = await listaLideri();
  const pierderi = new Map(
    (await Promise.all(lideri.map((l) => pierderiLider(l.id))))
      .map((p, i) => [lideri[i].id, p] as const)
      .filter(([, p]) => p !== null),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-sm text-cenusiu">
          ← Administrare
        </Link>
        <h1 className="mt-2 text-xl font-bold">Lideri</h1>
        <p className="text-sm text-cenusiu">
          Fiecare lider intră cu codul lui. Repartizarea la grupe se face din
          pagina grupei.
        </p>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Adaugă un lider</h2>
        <FormularLiderNou />
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">{lideri.length} lideri</h2>
        <ul className="flex flex-col divide-y divide-[#eef1f7]">
          {lideri.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {l.nume}
                  {l.rol === "admin" && (
                    <span className="ml-2 rounded-full bg-albastru/10 px-2 py-0.5 text-[11px] text-albastru">
                      administrator
                    </span>
                  )}
                  {!l.activ && (
                    <span className="ml-2 text-xs text-cenusiu">dezactivat</span>
                  )}
                </span>
                <span className="text-xs text-cenusiu">
                  {l.grupe.length > 0
                    ? l.grupe.map((g) => g.nume).join(", ")
                    : "fără grupă"}
                  {" · "}
                  {l.ultimaAutentificare
                    ? `ultima intrare ${momentLizibil(l.ultimaAutentificare)}`
                    : "nu a intrat încă"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ButonCodNou liderId={l.id} />

                {l.id !== admin.id && (
                  <>
                    <form
                      action={schimbaRol.bind(
                        null,
                        l.id,
                        l.rol === "admin" ? "lider" : "admin",
                      )}
                    >
                      <button type="submit" className="buton buton-secundar buton-mic">
                        {l.rol === "admin" ? "Fă-l lider" : "Fă-l admin"}
                      </button>
                    </form>

                    <form action={schimbaActivLider.bind(null, l.id, !l.activ)}>
                      <button type="submit" className="buton buton-secundar buton-mic">
                        {l.activ ? "Dezactivează" : "Activează"}
                      </button>
                    </form>
                  </>
                )}
              </div>

              {l.id !== admin.id && pierderi.get(l.id) && (
                <div className="w-full">
                  <ZonaStergere
                    actiune={stergeLider.bind(null, l.id)}
                    nume={l.nume}
                    titlu={`Șterge ${l.nume} din aplicație`}
                    avertisment={avertismentLider(pierderi.get(l.id)!)}
                    textButon="Șterge definitiv"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Ce se pierde și ce rămâne, spus pe scurt înainte de ștergere. */
function avertismentLider(p: {
  grupe: number;
  intalniriCompletate: number;
  note: number;
  inlocuiri: number;
}): string {
  const dispare = [
    p.grupe > 0
      ? `iese din ${p.grupe === 1 ? "grupa la care e repartizat" : `cele ${p.grupe} grupe la care e repartizat`}`
      : "",
    p.inlocuiri > 0 ? "se anulează înlocuirile" : "",
    "codul de acces nu mai merge",
  ].filter(Boolean);

  const ramane = [
    p.intalniriCompletate > 0
      ? `${p.intalniriCompletate === 1 ? "prezența completată" : `cele ${p.intalniriCompletate} prezențe completate`}`
      : "",
    p.note > 0
      ? `${p.note === 1 ? "nota scrisă" : `cele ${p.note} note scrise`}`
      : "",
  ].filter(Boolean);

  const coada = ramane.length
    ? ` Rămân în aplicație ${ramane.join(" și ")}, doar fără nume lângă ele.`
    : "";

  return `Se șterge definitiv: ${dispare.join(", ")}.${coada} Dacă doar nu mai slujește o vreme, folosește „Dezactivează".`;
}
