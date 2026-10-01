import Link from "next/link";
import type { ReactNode } from "react";

import { ButonNotificari } from "@/componente/ButonNotificari";
import { Icoana, type NumeIcoana } from "@/componente/Icoane";
import { TitluSectiune } from "@/componente/TitluSectiune";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { cautaPulsisti } from "@/lib/interogari/pulsisti";
import { evolutiePrezenta, rezumatGrupe } from "@/lib/interogari/statistici";
import { dataScurta } from "@/lib/util/date";

export const metadata = { title: "Administrare · Puls" };

export default async function PaginaAdmin() {
  await ceruteAdmin();

  const [rezumate, evolutie, nerepartizati] = await Promise.all([
    rezumatGrupe(),
    evolutiePrezenta(10),
    cautaPulsisti({ faraGrupa: true, activi: "toti" }),
  ]);

  const active = rezumate.filter((r) => r.activa);
  const totalPulsisti = active.reduce((s, r) => s + r.membriActivi, 0);
  const totalAlerte = active.reduce((s, r) => s + r.alerte, 0);
  const medii = active.filter((r) => r.mediePrezenta !== null);
  const medieGenerala = medii.length
    ? Math.round(medii.reduce((s, r) => s + (r.mediePrezenta ?? 0), 0) / medii.length)
    : null;

  const maxim = Math.max(1, ...evolutie.map((e) => e.prezenti));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="titlu-pagina">Administrare</h1>
        <p className="text-sm text-cenusiu">
          Toată lucrarea, dintr-o privire.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Caseta
          icoana="grupe"
          valoare={String(active.length)}
          eticheta="grupe active"
        />
        <Caseta
          icoana="oameni"
          valoare={String(totalPulsisti)}
          eticheta="pulsiști"
        />
        <Caseta
          icoana="grafic"
          valoare={medieGenerala !== null ? `${medieGenerala}%` : "-"}
          eticheta="prezență medie"
        />
        <Caseta
          icoana="alerta"
          valoare={String(totalAlerte)}
          eticheta="de căutat"
          accent={totalAlerte > 0}
        />
      </div>

      {nerepartizati.length > 0 && (
        <Link
          href="/admin/nerepartizati"
          className="card flex items-center gap-3 border-lime bg-lime-pal p-4 text-sm"
        >
          <span className="icoana-sectiune bg-lime text-carbune">
            <Icoana nume="asteapta" marime={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">
              {nerepartizati.length === 1
                ? "Un pulsist așteaptă o grupă"
                : `${nerepartizati.length} pulsiști așteaptă o grupă`}
            </span>
            <span className="mt-0.5 block text-xs text-carbune/75">
              Până sunt repartizați nu apar pe nicio foaie de prezență.
              Repartizează-i.
            </span>
          </span>
          <Icoana nume="inainte" marime={20} className="shrink-0" />
        </Link>
      )}

      {/*
        Treisprezece scurtături într-un singur grilaj se citesc ca o listă de
        cuvinte. Pe teme, găsești ce cauți după întrebarea pe care o ai:
        „cine?", „ce s-a întâmplat?", „cum scot/pun datele?".
      */}
      <nav aria-label="Administrare" className="flex flex-col gap-4">
        <GrupScurtaturi titlu="Oameni și grupe">
          <Buton href="/pulsisti" text="Pulsiști" icoana="oameni" />
          <Buton href="/admin/lideri" text="Lideri" icoana="lider" />
          <Buton href="/admin/grupe" text="Grupe" icoana="grupe" />
          <Buton
            href="/admin/nerepartizati"
            text="Nerepartizați"
            icoana="asteapta"
          />
          <Buton href="/admin/biserici" text="Biserici" icoana="biserica" />
        </GrupScurtaturi>
        <GrupScurtaturi titlu="Activitate">
          <Buton href="/slujiri" text="Slujiri" icoana="slujiri" />
          <Buton href="/statistici" text="Statistici" icoana="grafic" />
          <Buton href="/admin/citire" text="Planul de citire" icoana="carte" />
          <Buton href="/admin/jurnal" text="Jurnal" icoana="jurnal" />
        </GrupScurtaturi>
        <GrupScurtaturi titlu="Date și an">
          <Buton href="/admin/import" text="Import Excel" icoana="incarca" />
          <Buton href="/admin/export" text="Export" icoana="descarca" />
          <Buton
            href="/admin/siguranta"
            text="Siguranța datelor"
            icoana="scut"
          />
          <Buton href="/admin/an" text="Anul bisericesc" icoana="arhiva" />
        </GrupScurtaturi>
      </nav>

      <section className="card p-4">
        <TitluSectiune icoana="clopot" className="mb-1">
          Notificări
        </TitluSectiune>
        <p className="mb-3 pl-12 text-xs text-cenusiu">
          Se generează singure în fiecare dimineață: zile de naștere, slujiri
          care urmează, prezențe necompletate, rezumatul de luni și cititul
          Bibliei nebifat. Butonul le rulează acum, dacă vrei să verifici că
          totul merge.
        </p>
        <ButonNotificari />
      </section>

      {evolutie.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-1 titlu-sectiune">Prezența pe săptămâni</h2>
          <p className="mb-4 text-xs text-cenusiu">
            Câți pulsiști au fost prezenți în toată lucrarea, pe săptămâni.
          </p>
          <ul className="flex items-end gap-2">
            {evolutie.map((e) => (
              <li key={e.data} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-albastru">
                  {e.prezenti}
                </span>
                <div
                  className="w-full rounded-t bg-albastru-deschis"
                  style={{ height: `${Math.round((e.prezenti / maxim) * 80) + 4}px` }}
                />
                <span className="text-[11px] text-cenusiu">
                  {dataScurta(e.data)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <TitluSectiune icoana="grupe" className="mb-2">
          Grupele
        </TitluSectiune>
        <ul className="flex flex-col divide-y divide-linie">
          {rezumate.map((r) => (
            <li key={r.grupaId}>
              <Link
                href={`/admin/grupe/${r.grupaId}`}
                className="flex min-h-14 items-center gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {r.nume}
                    {!r.activa && (
                      <span className="ml-2 text-xs text-cenusiu">arhivată</span>
                    )}
                  </span>
                  <span className="text-xs text-cenusiu">
                    {r.membriActivi} pulsiști
                    {r.ultimaIntalnire
                      ? ` · ultima întâlnire ${dataScurta(r.ultimaIntalnire)}`
                      : " · fără întâlniri"}
                    {r.mediePrezenta !== null ? ` · ${r.mediePrezenta}% prezență` : ""}
                  </span>
                </div>
                {r.alerte > 0 && (
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700"
                    title="De căutat"
                  >
                    <Icoana nume="alerta" marime={13} grosime={2.2} />
                    {r.alerte}
                  </span>
                )}
                <Icoana
                  nume="inainte"
                  marime={18}
                  className="shrink-0 text-cenusiu"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Caseta({
  icoana,
  valoare,
  eticheta,
  accent,
}: {
  icoana: NumeIcoana;
  valoare: string;
  eticheta: string;
  accent?: boolean;
}) {
  return (
    <div className={`card p-3.5 ${accent ? "border-red-200 bg-red-50" : ""}`}>
      <span
        className={`icoana-sectiune mb-2 h-8 w-8 rounded-[0.625rem] ${
          accent ? "bg-red-100 text-red-700" : ""
        }`}
      >
        <Icoana nume={icoana} marime={16} />
      </span>
      <div
        className={`text-[1.75rem] leading-none font-extrabold tracking-tight ${
          accent ? "text-red-700" : "text-carbune"
        }`}
      >
        {valoare}
      </div>
      <div className="mt-1 text-xs font-medium text-cenusiu">{eticheta}</div>
    </div>
  );
}

function GrupScurtaturi({
  titlu,
  children,
}: {
  titlu: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-bold tracking-wider text-cenusiu uppercase">
        {titlu}
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{children}</div>
    </section>
  );
}

function Buton({
  href,
  text,
  icoana,
}: {
  href: string;
  text: string;
  icoana: NumeIcoana;
}) {
  return (
    <Link
      href={href}
      className="card flex min-h-14 items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-carbune"
    >
      <span className="icoana-sectiune h-8 w-8 rounded-[0.625rem]">
        <Icoana nume={icoana} marime={16} />
      </span>
      <span className="min-w-0 leading-tight">{text}</span>
    </Link>
  );
}
