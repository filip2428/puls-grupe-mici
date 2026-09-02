import Link from "next/link";
import { notFound } from "next/navigation";

import { FormularEchipaEditare } from "@/componente/AdminSlujiri";
import { RandProgramare } from "@/componente/RandProgramare";
import { ZonaStergere } from "@/componente/ZonaStergere";
import { ceruteLider } from "@/lib/auth/sesiune";
import { listaLideri } from "@/lib/interogari/lideri";
import {
  adolescentiInAfaraEchipei,
  echipa as iaEchipa,
  programariViitoare,
} from "@/lib/interogari/slujiri";
import { pierderiEchipa } from "@/lib/interogari/stergere";
import { dataAzi } from "@/lib/util/date";
import {
  adaugaInEchipa,
  schimbaActivaEchipa,
  scoateDinEchipa,
  stergeEchipa,
} from "../actions";

export default async function PaginaEchipa({
  params,
}: PageProps<"/slujiri/[id]">) {
  const { id } = await params;
  const echipaId = Number(id);
  if (!Number.isInteger(echipaId)) notFound();

  const lider = await ceruteLider();
  const date = await iaEchipa(echipaId);
  if (!date) notFound();

  const esteAdmin = lider.rol === "admin";
  const esteResponsabil = date.echipa.responsabilId === lider.id;

  const [disponibili, toateProgramarile, toti, pierderi] = await Promise.all([
    adolescentiInAfaraEchipei(echipaId),
    programariViitoare(50),
    esteAdmin ? listaLideri() : Promise.resolve([]),
    esteAdmin ? pierderiEchipa(echipaId) : Promise.resolve(null),
  ]);

  const programari = toateProgramarile.filter((p) => p.echipaId === echipaId);
  const azi = dataAzi();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/slujiri" className="text-sm text-cenusiu">
          ← Slujiri
        </Link>
        <h1 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold">
          {date.echipa.nume}
          {!date.echipa.activa && (
            <span className="rounded-full bg-fundal px-2 py-0.5 text-xs text-cenusiu">
              arhivată
            </span>
          )}
        </h1>
        <p className="text-sm text-cenusiu">
          {[
            date.echipa.descriere,
            date.echipa.responsabilNume
              ? `coordonează ${date.echipa.responsabilNume}`
              : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {/* Ce urmează pentru echipa asta */}
      {programari.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Ce urmează</h2>
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {programari.map((p) => (
              <li key={p.id} className="py-3">
                <RandProgramare programare={p} azi={azi} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cine e implicat */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">
          Cine slujește ({date.membri.filter((m) => m.activ).length})
        </h2>

        {date.membri.length === 0 ? (
          <p className="text-sm text-cenusiu">
            Nu slujește nimeni aici încă. Adaugă mai jos, sau de pe fișa
            adolescentului.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {date.membri.map((m) => (
              <li key={m.membruId} className="flex flex-wrap items-center gap-2 py-2.5">
                <Link href={`/membri/${m.membruId}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {m.nume}
                    {!m.activ && (
                      <span className="ml-2 text-xs text-cenusiu">inactiv</span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-cenusiu">
                    {m.grupaNume}
                    {m.rol ? ` · ${m.rol}` : ""}
                  </span>
                </Link>
                <form action={scoateDinEchipa.bind(null, echipaId, m.membruId)}>
                  <button type="submit" className="buton buton-secundar buton-mic">
                    Scoate
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-3 border-t border-[#eef1f7] pt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-albastru">
            + Adaugă pe cineva aici
          </summary>
          <form
            action={adaugaInEchipa.bind(null, echipaId)}
            className="flex flex-col gap-3 pt-2"
          >
            <div>
              <label className="eticheta" htmlFor="membruId">
                Cine
              </label>
              <select id="membruId" name="membruId" className="camp" required>
                <option value="">Alege un adolescent</option>
                {disponibili.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nume} ({m.grupaNume})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="eticheta" htmlFor="rol">
                Ce face acolo
              </label>
              <input
                id="rol"
                name="rol"
                className="camp"
                placeholder="opțional, ex. chitară"
                maxLength={60}
              />
            </div>
            <button type="submit" className="buton buton-principal self-start">
              Adaugă
            </button>
          </form>
          {disponibili.length === 0 && (
            <p className="pt-2 text-xs text-cenusiu">
              Toți adolescenții activi slujesc deja aici.
            </p>
          )}
        </details>

        {!esteAdmin && !esteResponsabil && (
          <p className="mt-3 text-xs text-cenusiu">
            Poți adăuga sau scoate doar adolescenți din grupele tale.
          </p>
        )}
      </section>

      {esteAdmin && (
        <section className="card p-4">
          <details>
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-albastru">
              Modifică slujirea
            </summary>
            <div className="pt-2">
              <FormularEchipaEditare
                echipaId={echipaId}
                lideri={toti
                  .filter((l) => l.activ)
                  .map((l) => ({ id: l.id, nume: l.nume }))}
                initial={{
                  nume: date.echipa.nume,
                  descriere: date.echipa.descriere,
                  responsabilId: date.echipa.responsabilId,
                }}
              />

              <form
                action={schimbaActivaEchipa.bind(
                  null,
                  echipaId,
                  !date.echipa.activa,
                )}
                className="mt-4 border-t border-[#eef1f7] pt-4"
              >
                <button type="submit" className="buton buton-secundar">
                  {date.echipa.activa ? "Arhivează" : "Reactivează"}
                </button>
                <p className="mt-2 text-xs text-cenusiu">
                  Arhivată, nu mai apare în liste, dar rămâne cine a slujit
                  acolo.
                </p>
              </form>
            </div>
          </details>
        </section>
      )}

      {esteAdmin && pierderi && (
        <ZonaStergere
          actiune={stergeEchipa.bind(null, echipaId)}
          nume={date.echipa.nume}
          titlu="Șterge slujirea definitiv"
          avertisment={avertismentEchipa(pierderi)}
          textButon="Șterge slujirea"
        />
      )}
    </div>
  );
}

/** Ce dispare odată cu locul de slujire. */
function avertismentEchipa(p: {
  adolescenti: number;
  programari: number;
}): string {
  const bucati = [
    p.adolescenti > 0
      ? `${p.adolescenti === 1 ? "un adolescent nu va mai sluji aici" : `cei ${p.adolescenti} adolescenți nu vor mai sluji aici`}`
      : "",
    p.programari > 0
      ? `${p.programari === 1 ? "o programare iese" : `${p.programari} programări ies`} din calendar`
      : "",
  ].filter(Boolean);

  const lista =
    bucati.length === 0
      ? "Nu slujește nimeni aici și nu e nimic în calendar."
      : `${bucati.join(" și ")}.`;

  return `${lista} Niciun adolescent nu se șterge - dispare doar locul de slujire. Dacă vrei doar să nu mai apară în liste, folosește „Arhivează".`;
}
