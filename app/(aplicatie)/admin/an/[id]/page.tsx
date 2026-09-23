import Link from "next/link";
import { notFound } from "next/navigation";

import { anArhivat } from "@/lib/arhiva";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { ETICHETE_STARE } from "@/lib/citire";
import { dataNumerica, momentLizibil } from "@/lib/util/date";

export const metadata = { title: "Anul arhivat · Puls" };

export default async function PaginaAnArhivat({
  params,
}: PageProps<"/admin/an/[id]">) {
  await ceruteAdmin();
  const { id } = await params;
  const an = await anArhivat(Number(id));
  if (!an) notFound();

  const { f } = an;
  const s = f.statistici;
  const pr = (p: number | null) => (p !== null ? `${p}%` : "-");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/an" className="text-sm text-cenusiu">
          ← Anul bisericesc
        </Link>
        <h1 className="mt-2 text-xl font-bold">Anul {f.nume}</h1>
        <p className="text-sm text-cenusiu">
          {dataNumerica(f.deLa)} – {dataNumerica(f.panaLa)} · arhivat{" "}
          {momentLizibil(an.creatLa)}
          {an.creatDe ? ` de ${an.creatDe}` : ""}. Cifrele sunt cele din ziua
          arhivării.
        </p>
        <a href={`/api/export/an/${an.id}`} className="buton buton-secundar mt-3">
          Descarcă anul în Excel
        </a>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Caseta valoare={String(s.rezumat.intalniri)} eticheta="întâlniri" />
        <Caseta valoare={pr(s.rezumat.procent)} eticheta="prezență medie" />
        <Caseta valoare={String(s.rezumat.membri)} eticheta="pulsiști" />
        <Caseta valoare={String(s.rezumat.botezuri)} eticheta="botezuri" />
        <Caseta valoare={String(s.rezumat.musafiri)} eticheta="musafiri" />
        <Caseta valoare={String(s.rezumat.primitiInGrupa)} eticheta="primiți în grupă" />
        <Caseta valoare={String(s.rezumat.slujiri)} eticheta="slujiri" />
        <Caseta valoare={pr(f.citire.total.procentMediu)} eticheta="citit în medie" />
      </section>

      <Tabel
        titlu="Grupele anului"
        capete={["Grupa", "Lideri", "Întâlniri", "Membri", "%"]}
        randuri={s.peGrupe.map((g) => [
          g.nume,
          f.grupe.find((x) => x.id === g.grupaId)?.lideri.join(", ") || "-",
          g.intalniri,
          g.membri,
          pr(g.procent),
        ])}
      />

      <Tabel
        titlu="Pe luni"
        capete={["Luna", "Întâlniri", "Media", "%"]}
        randuri={s.peLuni.map((l) => [l.nume, l.intalniri, l.prezentiInMedie ?? "-", pr(l.procent)])}
      />

      <Tabel
        titlu="Pe clase"
        capete={["Clasa", "Pulsiști", "%"]}
        randuri={s.peClase.map((c) => [c.nume, c.pulsisti, pr(c.procent)])}
      />

      {f.citire.peGrupe.length > 0 && (
        <Tabel
          titlu="Cititul Bibliei pe grupe"
          capete={["Grupa", "Media", "La zi", "Puțin", "Mult"]}
          randuri={f.citire.peGrupe.map((g) => [
            g.nume,
            pr(g.procentMediu),
            g.laZi,
            g.putin,
            g.mult,
          ])}
        />
      )}

      <Tabel
        titlu={`Pulsiștii anului (${f.pulsisti.length})`}
        capete={["Nume", "Grupa", "Prezent", "%", "Citit"]}
        randuri={[...f.pulsisti]
          .sort((a, b) => a.nume.localeCompare(b.nume, "ro"))
          .map((p) => [
            p.nume,
            p.grupa ?? "-",
            `${p.prezente}/${p.intalniri}`,
            pr(p.procent),
            p.citit ? ETICHETE_STARE[p.citit.stare] : "-",
          ])}
      />

      <section className="card p-4 text-sm">
        <h2 className="mb-2 text-sm font-bold">Ce s-a schimbat la închidere</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-cenusiu">
          <li>
            {f.schimbari.auUrcatClasa
              ? "Toată lumea a urcat o clasă."
              : "Clasele au rămas neschimbate."}
          </li>
          {f.schimbari.auIesit.length > 0 && (
            <li>Au ieșit din Puls: {f.schimbari.auIesit.join(", ")}.</li>
          )}
          <li>
            {f.schimbari.grupeReformate
              ? "Grupele au fost arhivate, pulsiștii au trecut la Nerepartizați."
              : "Grupele au rămas cum erau."}
          </li>
          <li>
            {f.schimbari.planInchis
              ? `Planul de citire (${f.plan.length} zile) a fost închis.`
              : "Planul de citire a rămas."}
          </li>
        </ul>
      </section>
    </div>
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

/** Tabel simplu, derulabil pe orizontală pe telefon. */
function Tabel({
  titlu,
  capete,
  randuri,
}: {
  titlu: string;
  capete: string[];
  randuri: (string | number)[][];
}) {
  if (randuri.length === 0) return null;
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-bold">{titlu}</h2>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-[#e3e7f2] text-left text-xs text-cenusiu">
              {capete.map((c, i) => (
                <th key={c} className={`py-2 font-medium ${i === 0 ? "pr-3" : "px-3 text-right"}`}>
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
                    className={`py-2 ${i === 0 ? "pr-3 font-medium" : "px-3 text-right tabular-nums"}`}
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
