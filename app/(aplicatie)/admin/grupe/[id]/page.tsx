import Link from "next/link";
import { notFound } from "next/navigation";

import { anuleazaInlocuire } from "@/app/(aplicatie)/grupe/[id]/actions";
import { FormularEditareGrupa } from "@/componente/AdminGrupe";
import { ZonaStergere } from "@/componente/ZonaStergere";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { inlocuiriGrupa, liderilGrupei } from "@/lib/interogari/acces";
import { grupa as iaGrupa, membriGrupei } from "@/lib/interogari/grupe";
import { listaLideri, toateGrupele } from "@/lib/interogari/lideri";
import { pierderiGrupa } from "@/lib/interogari/stergere";
import { dataScurta } from "@/lib/util/date";
import {
  mutaMembruDinFormular,
  repartizeazaLiderDinFormular,
  schimbaActivaGrupa,
  scoateLider,
  stergeGrupa,
} from "../../actions";

export default async function PaginaAdminGrupa({
  params,
}: PageProps<"/admin/grupe/[id]">) {
  await ceruteAdmin();

  const { id } = await params;
  const grupaId = Number(id);
  if (!Number.isInteger(grupaId)) notFound();

  const g = await iaGrupa(grupaId);
  if (!g) notFound();

  const [lideriAiGrupei, membri, toti, grupe, inlocuiri, pierderi] =
    await Promise.all([
      liderilGrupei(grupaId),
      membriGrupei(grupaId, { includeInactivi: true, status: "toti" }),
      listaLideri(),
      toateGrupele(),
      inlocuiriGrupa(grupaId),
      pierderiGrupa(grupaId),
    ]);

  const idAiGrupei = new Set(lideriAiGrupei.map((l) => l.id));
  const disponibili = toti.filter((l) => l.activ && !idAiGrupei.has(l.id));
  const alteGrupe = grupe.filter((x) => x.id !== grupaId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/grupe" className="text-sm text-cenusiu">
          ← Grupe
        </Link>
        <h1 className="mt-2 text-xl font-bold">{g.nume}</h1>
        <p className="text-sm text-cenusiu">
          <Link href={`/grupe/${grupaId}`} className="text-albastru underline">
            Vezi grupa ca lider
          </Link>
        </p>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Datele grupei</h2>
        <FormularEditareGrupa
          grupaId={grupaId}
          initial={{
            nume: g.nume,
            oraIntalnire: g.oraIntalnire,
            locatie: g.locatie,
          }}
        />
        <form
          action={schimbaActivaGrupa.bind(null, grupaId, !g.activa)}
          className="mt-4 border-t border-[#eef1f7] pt-4"
        >
          <button type="submit" className="buton buton-secundar">
            {g.activa ? "Arhivează grupa" : "Reactivează grupa"}
          </button>
          <p className="mt-2 text-xs text-cenusiu">
            O grupă arhivată nu se mai vede în listele curente, dar istoricul
            rămâne.
          </p>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Liderii grupei</h2>
        <ul className="mb-4 flex flex-col divide-y divide-[#eef1f7]">
          {lideriAiGrupei.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-2">
              <span className="flex-1 text-sm">{l.nume}</span>
              <form action={scoateLider.bind(null, grupaId, l.id)}>
                <button type="submit" className="buton buton-secundar buton-mic">
                  Scoate
                </button>
              </form>
            </li>
          ))}
          {lideriAiGrupei.length === 0 && (
            <li className="py-2 text-sm text-cenusiu">
              Nimeni nu e repartizat aici.
            </li>
          )}
        </ul>

        {disponibili.length > 0 && (
          <form
            action={repartizeazaLiderDinFormular.bind(null, grupaId)}
            className="flex items-end gap-2 border-t border-[#eef1f7] pt-4"
          >
            <div className="flex-1">
              <label className="eticheta" htmlFor="liderId">
                Adaugă un lider
              </label>
              <select id="liderId" name="liderId" className="camp">
                {disponibili.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nume}
                    {l.rol === "admin" ? " (admin)" : ""}
                    {/*
                      Un lider ține o singură grupă. Dacă are deja una, o
                      spunem aici, în dreptul numelui - e singurul loc unde se
                      hotărăște, deci e singurul loc unde ajută să se vadă.
                    */}
                    {l.rol !== "admin" && l.grupe.length > 0
                      ? ` - ține deja ${l.grupe.map((x) => x.nume).join(", ")}`
                      : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-cenusiu">
                Un lider ține o singură grupă. Dacă trebuie doar să acopere o
                perioadă, mai bine îi dai o înlocuire din pagina grupei.
              </p>
            </div>
            <button type="submit" className="buton buton-principal">
              Adaugă
            </button>
          </form>
        )}

        {inlocuiri.length > 0 && (
          <div className="mt-4 border-t border-[#eef1f7] pt-3">
            <h3 className="mb-2 text-xs font-bold uppercase text-cenusiu">
              Înlocuiri active
            </h3>
            <ul className="text-sm">
              {inlocuiri.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-1">
                  <span className="min-w-0 flex-1">
                    {d.liderNume} · {dataScurta(d.deLa)} – {dataScurta(d.panaLa)}
                  </span>
                  <form action={anuleazaInlocuire.bind(null, grupaId, d.id)}>
                    <button type="submit" className="text-xs text-red-700 underline">
                      șterge
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Pulsiști ({membri.length})</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Poți muta un pulsist în altă grupă - istoricul lui rămâne neatins.
        </p>
        <ul className="flex flex-col divide-y divide-[#eef1f7]">
          {membri.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 py-2">
              <Link href={`/membri/${m.id}`} className="flex-1 text-sm">
                {m.nume}
                {m.status === "musafir" && (
                  <span className="ml-2 rounded-full bg-lime/40 px-2 py-0.5 text-[11px] font-semibold">
                    musafir
                  </span>
                )}
                {!m.activ && (
                  <span className="ml-2 text-xs text-cenusiu">inactiv</span>
                )}
              </Link>
              {alteGrupe.length > 0 && (
                <form
                  action={mutaMembruDinFormular.bind(null, m.id)}
                  className="flex items-center gap-2"
                >
                  <select
                    name="grupaId"
                    className="camp min-h-9 w-auto py-1.5 text-sm"
                    defaultValue={alteGrupe[0].id}
                    aria-label={`Mută pe ${m.nume} în altă grupă`}
                  >
                    {alteGrupe.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nume}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="buton buton-secundar buton-mic">
                    Mută
                  </button>
                </form>
              )}
            </li>
          ))}
          {membri.length === 0 && (
            <li className="py-2 text-sm text-cenusiu">Grupa e goală.</li>
          )}
        </ul>
      </section>

      {pierderi && (
        <ZonaStergere
          actiune={stergeGrupa.bind(null, grupaId)}
          nume={g.nume}
          titlu="Șterge grupa definitiv"
          avertisment={avertismentGrupa(pierderi)}
          textButon="Șterge grupa"
        />
      )}
    </div>
  );
}

/**
 * Ce dispare odată cu grupa, spus pe șleau înainte de confirmare.
 *
 * Pulsiștii nu mai sunt pe lista pierderilor - ei rămân, fără grupă - dar
 * prezența lor de la întâlnirile grupei se duce, și asta trebuie spus înainte,
 * nu descoperit după.
 */
function avertismentGrupa(p: {
  pulsisti: number;
  intalniri: number;
  prezente: number;
  programari: number;
  programariGoale: number;
}): string {
  const bucati = [
    p.intalniri > 0
      ? `${p.intalniri === 1 ? "o întâlnire" : `${p.intalniri} întâlniri`} cu ${p.prezente} ${p.prezente === 1 ? "prezență" : "prezențe"}`
      : "",
    p.programariGoale > 0
      ? `${p.programariGoale === 1 ? "o zi de slujire, la care slujea singură" : `${p.programariGoale} zile de slujire, la care slujea singură`}`
      : "",
  ].filter(Boolean);

  const lista =
    bucati.length === 0
      ? "Grupa n-are istoric, deci nu se pierde nimic."
      : `Dispar cu totul ${bucati.join(" și ")}.`;

  const impreuna = p.programari - p.programariGoale;
  const calendar =
    impreuna > 0
      ? ` ${impreuna === 1 ? "Mai e o zi în calendar la care" : `Mai sunt ${impreuna} zile în calendar la care`} slujea împreună cu alții - ${impreuna === 1 ? "ea rămâne" : "ele rămân"}, fără grupa asta.`
      : "";

  const oameni =
    p.pulsisti === 0
      ? ""
      : ` ${p.pulsisti === 1 ? "Pulsistul din ea rămâne" : `Cei ${p.pulsisti} pulsiști din ea rămân`} în aplicație, fără grupă, și îi găsești la „Nerepartizați" ca să le dai alta.`;

  return `${lista}${calendar}${oameni} Liderii rămân și ei, doar nu mai sunt repartizați aici. Dacă grupa doar nu se mai ține, „Arhivează" e alegerea potrivită: păstrează și istoricul.`;
}
