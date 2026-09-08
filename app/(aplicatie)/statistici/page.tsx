import Link from "next/link";

import { ceruteLider } from "@/lib/auth/sesiune";
import { grupeAccesibile } from "@/lib/interogari/acces";
import {
  statisticiPerioada,
  type RandPulsist,
} from "@/lib/interogari/perioada";
import {
  anulBisericesc,
  dataAzi,
  esteDataValida,
  perioadaLizibila,
} from "@/lib/util/date";

export const metadata = { title: "Statistici · Puls" };

export default async function PaginaStatistici({
  searchParams,
}: PageProps<"/statistici">) {
  const lider = await ceruteLider();
  const cerute = await searchParams;

  const azi = dataAzi();
  const anul = anulBisericesc(azi);
  const deLa = dataCeruta(cerute.deLa) ?? anul.deLa;
  const panaLa = dataCeruta(cerute.panaLa) ?? anul.panaLa;

  const grupele = await grupeAccesibile(lider);
  const esteAdmin = lider.rol === "admin";

  /* Filtrul pe o singură grupă, dacă e cerut și dacă are voie s-o vadă. */
  const cerutaGrupa = Number(cerute.grupa);
  const grupaAleasa =
    Number.isInteger(cerutaGrupa) && grupele.some((g) => g.id === cerutaGrupa)
      ? cerutaGrupa
      : undefined;

  const grupaIds = grupaAleasa
    ? [grupaAleasa]
    : esteAdmin
      ? undefined
      : grupele.map((g) => g.id);

  const s = await statisticiPerioada({ deLa, panaLa, grupaIds });
  const parametri = new URLSearchParams({ deLa, panaLa });
  if (grupaAleasa) parametri.set("grupa", String(grupaAleasa));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Statistici</h1>
        <p className="text-sm text-cenusiu">
          Cum a mers lucrarea în perioada aleasă. {perioadaLizibila(deLa, panaLa)}
          {grupaAleasa
            ? ` · ${grupele.find((g) => g.id === grupaAleasa)?.nume}`
            : ""}
          .
        </p>
      </div>

      {/* Perioada */}
      <form action="/statistici" className="card flex flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eticheta" htmlFor="deLa">
              De la
            </label>
            <input
              id="deLa"
              name="deLa"
              type="date"
              className="camp"
              defaultValue={deLa}
            />
          </div>
          <div>
            <label className="eticheta" htmlFor="panaLa">
              Până la
            </label>
            <input
              id="panaLa"
              name="panaLa"
              type="date"
              className="camp"
              defaultValue={panaLa}
            />
          </div>
        </div>

        {grupele.length > 1 && (
          <div>
            <label className="eticheta" htmlFor="grupa">
              Grupa
            </label>
            <select
              id="grupa"
              name="grupa"
              className="camp"
              defaultValue={grupaAleasa ?? ""}
            >
              <option value="">toate grupele</option>
              {grupele.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nume}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="buton buton-principal">
            Arată
          </button>
          <a
            href={`/api/export/statistici?${parametri.toString()}`}
            className="buton buton-secundar"
          >
            Descarcă în Excel
          </a>
        </div>

        {/* Perioadele pe care le ceri cel mai des, la o apăsare. */}
        <div className="flex flex-wrap gap-2 border-t border-[#eef1f7] pt-3">
          <Scurtatura
            eticheta="anul bisericesc"
            deLa={anul.deLa}
            panaLa={anul.panaLa}
            activa={deLa === anul.deLa && panaLa === anul.panaLa}
          />
          <Scurtatura
            eticheta="anul trecut"
            deLa={mutaAnul(anul.deLa, -1)}
            panaLa={mutaAnul(anul.panaLa, -1)}
            activa={deLa === mutaAnul(anul.deLa, -1)}
          />
          <Scurtatura
            eticheta="tot ce avem"
            deLa="2000-01-01"
            panaLa={azi}
            activa={deLa === "2000-01-01"}
          />
        </div>
      </form>

      {s.rezumat.intalniri === 0 ? (
        <div className="card p-6 text-center text-sm text-cenusiu">
          În perioada asta nu e nicio întâlnire cu prezența completată.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Caseta valoare={String(s.rezumat.intalniri)} eticheta="întâlniri" />
            <Caseta
              valoare={
                s.rezumat.procent !== null ? `${s.rezumat.procent}%` : "-"
              }
              eticheta="prezență medie"
            />
            <Caseta
              valoare={String(s.rezumat.prezentiInMedie ?? "-")}
              eticheta="prezenți la o seară"
            />
            <Caseta valoare={String(s.rezumat.membri)} eticheta="pulsiști" />
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-bold">Ce s-a mai întâmplat</h2>
            <dl className="flex flex-col divide-y divide-[#eef1f7] text-sm">
              <Rand
                cheie="Musafiri care au trecut pragul"
                valoare={s.rezumat.musafiri}
              />
              <Rand cheie="Pulsiști noi adăugați" valoare={s.rezumat.pulsistiNoi} />
              <Rand
                cheie="Primiți în grupă"
                valoare={s.rezumat.primitiInGrupa}
              />
              <Rand cheie="Slujiri programate" valoare={s.rezumat.slujiri} />
              <Rand
                cheie="Pulsiști care au slujit"
                valoare={s.rezumat.auSlujit}
              />
              <Rand cheie="Bife „prezent”" valoare={s.rezumat.prezente} />
              <Rand cheie="Bife „a anunțat”" valoare={s.rezumat.anuntate} />
              <Rand cheie="Bife „absent”" valoare={s.rezumat.absente} />
            </dl>
          </section>

          <Tabel
            titlu="Pe grupe"
            explicatie="Procentele sunt doar pe membri - musafirii sunt numărați separat."
            capete={["Grupa", "Întâlniri", "Membri", "Musafiri", "Media", "%"]}
            randuri={s.peGrupe.map((g) => [
              g.nume,
              g.intalniri,
              g.membri,
              g.musafiri,
              g.prezentiInMedie ?? "-",
              g.procent !== null ? `${g.procent}%` : "-",
            ])}
          />

          <Tabel
            titlu="Pe biserici"
            explicatie="De unde vin pulsiștii care au fost pe foaia de prezență, și cât de des vin."
            capete={["Biserica", "Pulsiști", "%"]}
            randuri={s.peBiserici.map((b) => [
              b.nume,
              b.pulsisti,
              b.procent !== null ? `${b.procent}%` : "-",
            ])}
          />

          <Tabel
            titlu="Pe luni"
            explicatie="Unde a urcat și unde a căzut prezența de-a lungul perioadei."
            capete={["Luna", "Întâlniri", "Media", "%"]}
            randuri={s.peLuni.map((l) => [
              l.nume,
              l.intalniri,
              l.prezentiInMedie ?? "-",
              l.procent !== null ? `${l.procent}%` : "-",
            ])}
          />

          <Tabel
            titlu="Pe clase"
            explicatie="Ce vârste ține lucrarea și pe care le pierde."
            capete={["Clasa", "Pulsiști", "%"]}
            randuri={s.peClase.map((c) => [
              c.nume,
              c.pulsisti,
              c.procent !== null ? `${c.procent}%` : "-",
            ])}
          />

          <Tabel
            titlu="Cât de statornic vin"
            explicatie="Câți pulsiști intră în fiecare prag de prezență."
            capete={["Prag", "Pulsiști"]}
            randuri={s.fidelitate.map((f) => [f.prag, f.pulsisti])}
          />

          <ListaOameni
            titlu="De căutat"
            explicatie="Au fost prezenți la mai puțin de jumătate din întâlnirile la care erau așteptați. Merită un telefon."
            oameni={s.deCautat}
            accent
          />

          <ListaOameni
            titlu="N-au lipsit deloc"
            explicatie="Au fost la fiecare întâlnire din perioadă. Cineva ar trebui să le-o spună."
            oameni={s.faraLipsa}
          />
        </>
      )}
    </div>
  );
}

function dataCeruta(brut: string | string[] | undefined): string | undefined {
  const text = Array.isArray(brut) ? brut[0] : brut;
  return text && esteDataValida(text) ? text : undefined;
}

/** „2026-09-01" cu -1 dă „2025-09-01". */
function mutaAnul(data: string, cu: number): string {
  return `${Number(data.slice(0, 4)) + cu}${data.slice(4)}`;
}

function Scurtatura({
  eticheta,
  deLa,
  panaLa,
  activa,
}: {
  eticheta: string;
  deLa: string;
  panaLa: string;
  activa: boolean;
}) {
  return (
    <Link
      href={`/statistici?deLa=${deLa}&panaLa=${panaLa}`}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        activa ? "bg-albastru text-white" : "bg-fundal text-cenusiu"
      }`}
    >
      {eticheta}
    </Link>
  );
}

function Caseta({ valoare, eticheta }: { valoare: string; eticheta: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-2xl font-bold text-albastru">{valoare}</div>
      <div className="text-xs text-cenusiu">{eticheta}</div>
    </div>
  );
}

function Rand({ cheie, valoare }: { cheie: string; valoare: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-cenusiu">{cheie}</dt>
      <dd className="font-semibold tabular-nums">{valoare}</dd>
    </div>
  );
}

/**
 * Un tabel simplu.
 *
 * Pe telefon nu încape niciodată tot, așa că se derulează pe orizontală în
 * cutia lui - pagina însăși rămâne pe loc.
 */
function Tabel({
  titlu,
  explicatie,
  capete,
  randuri,
}: {
  titlu: string;
  explicatie: string;
  capete: string[];
  randuri: (string | number)[][];
}) {
  if (randuri.length === 0) return null;

  return (
    <section className="card p-4">
      <h2 className="text-sm font-bold">{titlu}</h2>
      <p className="mb-3 text-xs text-cenusiu">{explicatie}</p>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-[#e3e7f2] text-left text-xs text-cenusiu">
              {capete.map((c, i) => (
                <th
                  key={c}
                  className={`py-2 font-medium ${i === 0 ? "pr-3" : "px-3 text-right"}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {randuri.map((r, index) => (
              <tr key={index} className="border-b border-[#eef1f7] last:border-0">
                {r.map((celula, i) => (
                  <td
                    key={i}
                    className={`py-2 ${
                      i === 0
                        ? "pr-3 font-medium"
                        : "px-3 text-right tabular-nums"
                    }`}
                  >
                    {celula}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Lista de nume, cu link către fișă - de aici se sună. */
function ListaOameni({
  titlu,
  explicatie,
  oameni,
  accent,
}: {
  titlu: string;
  explicatie: string;
  oameni: RandPulsist[];
  accent?: boolean;
}) {
  if (oameni.length === 0) return null;

  return (
    <section
      className={
        accent ? "rounded-2xl border border-red-100 bg-red-50/50 p-4" : "card p-4"
      }
    >
      <h2 className={`text-sm font-bold ${accent ? "text-red-800" : ""}`}>
        {titlu} ({oameni.length})
      </h2>
      <p
        className={`mb-3 text-xs ${accent ? "text-red-700/80" : "text-cenusiu"}`}
      >
        {explicatie}
      </p>
      <ul className="flex flex-col divide-y divide-[#eef1f7]">
        {oameni.map((o) => (
          <li key={o.membruId} className="py-2">
            <Link
              href={`/membri/${o.membruId}`}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {o.nume}
                </span>
                <span className="text-xs text-cenusiu">
                  {o.grupa} · prezent la {o.prezente} din {o.dinCate}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {o.procent}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
