import Link from "next/link";
import { notFound } from "next/navigation";

import { FormularInlocuire } from "@/componente/FormularInlocuire";
import { FormularMembruNou } from "@/componente/FormularMembruNou";
import { ceruteLider } from "@/lib/auth/sesiune";
import {
  inlocuiriGrupa,
  liderilGrupei,
  liderilPotentiali,
  verificaAccesGrupa,
} from "@/lib/interogari/acces";
import { grupa as iaGrupa, intalniriGrupei, membriGrupei } from "@/lib/interogari/grupe";
import { alerteAbsenteGrupa } from "@/lib/interogari/statistici";
import { ZILE_SAPTAMANA, dataAzi, dataLunga, dataScurta, varsta } from "@/lib/util/date";

export default async function PaginaGrupa({ params }: PageProps<"/grupe/[id]">) {
  const { id } = await params;
  const grupaId = Number(id);
  if (!Number.isInteger(grupaId)) notFound();

  const lider = await ceruteLider();
  const acces = await verificaAccesGrupa(lider, grupaId);
  if (!acces.permis) notFound();

  const g = await iaGrupa(grupaId);
  if (!g) notFound();

  const azi = dataAzi();
  const [membri, intalniri, alerte, lideri, inlocuiri, potentiali] =
    await Promise.all([
      membriGrupei(grupaId),
      intalniriGrupei(grupaId, 10),
      alerteAbsenteGrupa(grupaId),
      liderilGrupei(grupaId),
      inlocuiriGrupa(grupaId),
      liderilPotentiali(grupaId),
    ]);

  const poateOrganiza = !acces.prinInlocuire || acces.esteAdmin;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/grupe" className="text-sm text-cenusiu">
          ← Grupele mele
        </Link>
        <h1 className="mt-2 text-xl font-bold">{g.nume}</h1>
        <p className="text-sm text-cenusiu">
          {g.ziIntalnire !== null && ZILE_SAPTAMANA[g.ziIntalnire]}
          {g.oraIntalnire ? `, ora ${g.oraIntalnire}` : ""}
          {g.locatie ? ` · ${g.locatie}` : ""}
          {` · ${membri.length} adolescenți`}
        </p>
        {acces.prinInlocuire && (
          <p className="mt-2 rounded-xl bg-lime/25 px-3 py-2 text-sm">
            Ești aici ca <strong>înlocuitor</strong>. Prezența pe care o
            completezi apare cu numele tău.
          </p>
        )}
      </div>

      {/* Prezența */}
      <section className="card p-4">
        <Link
          href={`/grupe/${grupaId}/prezenta?data=${azi}`}
          className="block rounded-xl bg-albastru px-4 py-3 text-center text-base font-semibold text-white"
        >
          Fă prezența de azi
        </Link>
        <p className="mt-2 text-center text-xs text-cenusiu">{dataLunga(azi)}</p>

        <form
          action={`/grupe/${grupaId}/prezenta`}
          className="mt-4 flex items-end gap-2 border-t border-[#eef1f7] pt-4"
        >
          <div className="flex-1">
            <label className="eticheta" htmlFor="data">
              Sau altă dată
            </label>
            <input
              id="data"
              name="data"
              type="date"
              defaultValue={azi}
              className="camp"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-[#d7dced] px-4 py-2.5 text-sm font-medium"
          >
            Deschide
          </button>
        </form>
      </section>

      {/* Cine ar trebui căutat */}
      {alerte.length > 0 && (
        <section className="card border-red-100 bg-red-50/50 p-4">
          <h2 className="text-sm font-bold text-red-800">De căutat</h2>
          <p className="mb-3 text-xs text-red-700/80">
            Au lipsit de cel puțin două ori la rând.
          </p>
          <ul className="flex flex-col gap-2">
            {alerte.map((a) => (
              <li
                key={a.membruId}
                className="flex items-center justify-between gap-3 rounded-lg bg-hartie px-3 py-2"
              >
                <Link href={`/membri/${a.membruId}`} className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {a.nume}
                  </span>
                  <span className="text-xs text-cenusiu">
                    {a.absenteConsecutive} absențe la rând
                    {a.ultimaPrezenta
                      ? ` · ultima dată prezent ${dataScurta(a.ultimaPrezenta)}`
                      : " · nu a fost prezent deloc"}
                  </span>
                </Link>
                {a.telefon && (
                  <a
                    href={`tel:${a.telefon}`}
                    className="shrink-0 rounded-lg border border-[#d7dced] px-3 py-1.5 text-xs font-medium"
                  >
                    Sună
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Istoricul întâlnirilor */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold">Ultimele întâlniri</h2>
          <a
            href={`/api/export?grupa=${grupaId}`}
            className="text-xs text-albastru underline"
          >
            Descarcă în Excel
          </a>
        </div>
        {intalniri.length === 0 ? (
          <p className="text-sm text-cenusiu">
            Nu s-a făcut încă nicio prezență la grupa asta.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {intalniri.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/grupe/${grupaId}/prezenta?data=${i.data}`}
                  className="flex items-center gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {dataLunga(i.data)}
                    </span>
                    <span className="text-xs text-cenusiu">
                      {i.subiect ? `${i.subiect} · ` : ""}
                      completat de {i.marcatDe ?? "?"}
                      {i.prinInlocuire ? " (înlocuire)" : ""}
                      {i.numarInvitati > 0 ? ` · ${i.numarInvitati} invitați` : ""}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm">
                    <span className="font-semibold text-albastru">{i.prezenti}</span>
                    <span className="text-cenusiu">
                      /{i.prezenti + i.motivati + i.absenti}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Adolescenții */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Adolescenți</h2>
        {membri.length === 0 ? (
          <p className="text-sm text-cenusiu">Grupa nu are încă membri.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {membri.map((m) => {
              const ani = varsta(m.dataNasterii);
              return (
                <li key={m.id}>
                  <Link
                    href={`/membri/${m.id}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="truncate text-sm font-medium">{m.nume}</span>
                    <span className="shrink-0 text-xs text-cenusiu">
                      {ani !== null ? `${ani} ani` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <details className="mt-3 border-t border-[#eef1f7] pt-3">
          <summary className="cursor-pointer text-sm font-medium text-albastru">
            + Adaugă un adolescent
          </summary>
          <div className="pt-3">
            <FormularMembruNou grupaId={grupaId} />
          </div>
        </details>
      </section>

      {/* Liderii și înlocuirile */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Liderii grupei</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {lideri.map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <span>{l.nume}</span>
              {!l.activ && <span className="text-xs text-cenusiu">(inactiv)</span>}
            </li>
          ))}
          {lideri.length === 0 && (
            <li className="text-sm text-cenusiu">
              Grupa nu are lideri repartizați.
            </li>
          )}
        </ul>

        {inlocuiri.length > 0 && (
          <div className="mt-4 border-t border-[#eef1f7] pt-3">
            <h3 className="mb-2 text-xs font-bold text-cenusiu uppercase">
              Înlocuiri
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {inlocuiri.map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{d.liderNume}</span>
                  <span className="text-cenusiu">
                    {" "}
                    · {dataScurta(d.deLa)} – {dataScurta(d.panaLa)}
                    {d.motiv ? ` · ${d.motiv}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {poateOrganiza && (
          <details className="mt-4 border-t border-[#eef1f7] pt-3">
            <summary className="cursor-pointer text-sm font-medium text-albastru">
              Nu poți ajunge? Cere unui alt lider să țină locul
            </summary>
            <div className="pt-3">
              <FormularInlocuire
                grupaId={grupaId}
                lideri={potentiali}
                azi={azi}
              />
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
