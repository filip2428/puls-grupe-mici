import Link from "next/link";
import { notFound } from "next/navigation";

import {
  FormularEditareMembru,
  FormularNota,
} from "@/componente/MembruFormulare";
import { InsignaBiserica } from "@/componente/InsignaBiserica";
import { InsignaBotez } from "@/componente/InsignaBotez";
import { mutaMembruDinFormular } from "@/app/(aplicatie)/admin/actions";
import { ceruteLider } from "@/lib/auth/sesiune";
import {
  grupeAccesibile,
  inlocuiriGrupa,
  liderilGrupei,
  verificaAccesMembru,
} from "@/lib/interogari/acces";
import { bisericileCunoscute } from "@/lib/interogari/biserici";
import {
  prieteniiMembrului,
  pulsistiDeLegat,
} from "@/lib/interogari/prietenii";
import {
  grupeActive,
  istoricMembru,
  membru as iaMembru,
  noteleMembrului,
} from "@/lib/interogari/grupe";
import { RandProgramare } from "@/componente/RandProgramare";
import { ZonaStergere } from "@/componente/ZonaStergere";
import {
  adaugaSlujireaMembrului,
  scoateSlujireaMembrului,
} from "@/app/(aplicatie)/slujiri/actions";
import {
  echipeleMembrului,
  programariMembrului,
  slujiriDisponibilePentru,
} from "@/lib/interogari/slujiri";
import { pierderiMembru } from "@/lib/interogari/stergere";
import {
  dataAzi,
  dataCuAn,
  dataScurta,
  momentLizibil,
  varsta,
} from "@/lib/util/date";
import {
  etichetaClasa,
  etichetaGrupa,
  etichetaSex,
} from "@/lib/util/etichete";
import {
  adaugaPrieten,
  primesteInGrupa,
  schimbaActiv,
  scoatePrieten,
  stergeMembru,
  stergeNota,
  treceLaMusafiri,
} from "./actions";

const CULORI: Record<string, string> = {
  prezent: "bg-albastru text-white",
  motivat: "bg-lime text-carbune",
  absent: "bg-carbune/15 text-carbune",
};

const ETICHETE: Record<string, string> = {
  prezent: "P",
  motivat: "A",
  absent: "–",
};

export default async function PaginaMembru({ params }: PageProps<"/membri/[id]">) {
  const { id } = await params;
  const membruId = Number(id);
  if (!Number.isInteger(membruId)) notFound();

  const lider = await ceruteLider();
  const date = await iaMembru(membruId);
  if (!date) notFound();

  const acces = await verificaAccesMembru(lider, date.membru.grupaId);
  if (!acces.permis) notFound();

  /*
    Un pulsist poate să n-aibă grupă: abia a fost înscris și nu s-a hotărât
    unde merge, ori grupa lui a fost ștearsă. Fișa merge și așa - doar că în
    locul cartonașului cu grupa și liderii ei apare unul de repartizare.
  */
  const grupa = date.grupa;

  /*
    Cu cine poate fi legat ca prieten: liderul alege dintre pulsiștii grupelor
    lui, coordonatorul dintre toți. Prieteniile trec peste grupe - de-aia și
    ajută la împărțirea pe camere - dar cine le scrie rămâne cel care are
    treabă cu amândoi.
  */
  const grupePermise =
    lider.rol === "admin"
      ? undefined
      : (await grupeAccesibile(lider)).map((g) => g.id);

  const [
    istoric,
    note,
    echipe,
    disponibile,
    slujiri,
    pierderi,
    lideriiGrupei,
    inlocuiri,
    prieteni,
    deLegat,
    biserici,
    grupeDeAles,
  ] = await Promise.all([
    istoricMembru(membruId, 16),
    noteleMembrului(membruId),
    echipeleMembrului(membruId),
    slujiriDisponibilePentru(membruId),
    programariMembrului(membruId, 3),
    pierderiMembru(membruId),
    liderilGrupei(date.membru.grupaId),
    inlocuiriGrupa(date.membru.grupaId),
    prieteniiMembrului(membruId),
    pulsistiDeLegat(membruId, grupePermise),
    bisericileCunoscute(),
    grupa ? [] : grupeActive(),
  ]);
  const azi = dataAzi();

  /* Cine ține locul chiar azi - nu și înlocuirile care abia urmează. */
  const tinLocul = inlocuiri.filter((d) => d.deLa <= azi && d.panaLa >= azi);

  const candSeVede = [
    grupa?.oraIntalnire ? `ora ${grupa.oraIntalnire}` : "",
    grupa?.locatie ?? "",
  ]
    .filter(Boolean)
    .join(" · ");

  /* `undefined` la coordonator înseamnă „vede tot", nu „nu vede nimic". */
  /*
    Cine n-are grupă e al coordonatorilor, deci fișa lui se deschide doar de
    către ei - `grupePermise === undefined` înseamnă chiar „e coordonator".
  */
  const potVedea = (grupaId: number | null) =>
    grupePermise === undefined || (grupaId !== null && grupePermise.includes(grupaId));

  const m = date.membru;
  const ani = varsta(m.dataNasterii);
  const prezenteNr = istoric.filter((i) => i.stare === "prezent").length;
  const esteMusafir = m.status === "musafir";

  const detalii = [
    etichetaClasa(m.clasa),
    ani !== null ? `${ani} ani` : "",
    etichetaSex(m.sex),
    // Insigna spune deja „botezat"; aici adăugăm doar când, dacă se știe.
    m.botezatLa ? `botezat ${dataCuAn(m.botezatLa)}` : "",
    m.activ ? "" : "inactiv",
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <div>
        {grupa ? (
          <Link href={`/grupe/${grupa.id}`} className="text-sm text-cenusiu">
            ← {grupa.nume}
          </Link>
        ) : (
          <Link href="/admin/nerepartizati" className="text-sm text-cenusiu">
            ← Nerepartizați
          </Link>
        )}
        <h1 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold">
          {m.nume}
          {esteMusafir && (
            <span className="rounded-full bg-lime/40 px-2 py-0.5 text-xs font-semibold">
              musafir
            </span>
          )}
          <InsignaBiserica
            biserica={m.biserica}
            bisericaNume={date.bisericaNume}
          />
          <InsignaBotez botez={m.botez} />
        </h1>
        <p className="text-sm text-cenusiu">
          {detalii.join(" · ")}
          {istoric.length > 0 &&
            `${detalii.length ? " · " : ""}prezent la ${prezenteNr} din ultimele ${istoric.length} întâlniri`}
        </p>

        {(m.telefon || m.email) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {m.telefon && (
              <>
                <a href={`tel:${m.telefon}`} className="buton buton-secundar">
                  Sună {m.telefon}
                </a>
                <a
                  href={`https://wa.me/${numarInternational(m.telefon)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="buton buton-secundar"
                >
                  WhatsApp
                </a>
              </>
            )}
            {m.email && (
              <a href={`mailto:${m.email}`} className="buton buton-secundar">
                {m.email}
              </a>
            )}
          </div>
        )}
      </div>

      {/*
        Grupa lui, cu liderii ei - primul lucru pe care vrei să-l știi.
        Când n-are grupă, în locul cartonașului stă chiar repartizarea: e locul
        unde te uiți oricum, și ai sub ochi clasa și vârsta când alegi.
      */}
      {!grupa ? (
        <section className="card p-4">
          <h2 className="text-sm font-bold">Nu e încă într-o grupă</h2>
          <p className="mt-1 text-sm text-cenusiu">
            Până e repartizat nu apare pe nicio foaie de prezență și nu intră în
            statistici. Datele lui sunt însă toate aici.
          </p>
          {grupeDeAles.length === 0 ? (
            <p className="mt-3 text-sm text-cenusiu">
              Nu e nicio grupă activă în care să-l pui.{" "}
              <Link href="/admin/grupe" className="text-albastru">
                Fă una întâi
              </Link>
              .
            </p>
          ) : (
            <form
              action={mutaMembruDinFormular.bind(null, membruId)}
              className="mt-3 flex flex-wrap items-end gap-2 border-t border-[#eef1f7] pt-3"
            >
              <div className="min-w-40 flex-1">
                <label className="eticheta" htmlFor="grupaId">
                  Pune-l în
                </label>
                <select id="grupaId" name="grupaId" className="camp" defaultValue="">
                  <option value="">- alege grupa -</option>
                  {grupeDeAles.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nume}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="buton buton-principal">
                Repartizează
              </button>
            </form>
          )}
        </section>
      ) : (
      <section className="card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-sm font-bold">
            <Link href={`/grupe/${grupa.id}`} className="text-albastru">
              {grupa.nume}
            </Link>
          </h2>
          {candSeVede && (
            <span className="text-xs text-cenusiu">{candSeVede}</span>
          )}
        </div>

        <ul className="mt-3 flex flex-col gap-2 border-t border-[#eef1f7] pt-3">
          {lideriiGrupei.length === 0 && (
            <li className="text-sm text-cenusiu">
              Grupa n-are niciun lider repartizat.
            </li>
          )}
          {lideriiGrupei.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{l.nume}</span>
              {l.rol === "admin" && (
                <span className="rounded-full bg-fundal px-2 py-0.5 text-[11px] text-cenusiu">
                  coordonator
                </span>
              )}
              {!l.activ && (
                <span className="text-xs text-cenusiu">inactiv</span>
              )}
              {l.telefon && (
                <a
                  href={`tel:${l.telefon}`}
                  className="buton buton-secundar buton-mic ml-auto"
                >
                  Sună
                </a>
              )}
            </li>
          ))}
        </ul>

        {/*
          Cine ține locul azi. Fără rândul ăsta, cine se uită pe fișă ar suna
          liderul titular tocmai în săptămâna în care el lipsește.
        */}
        {tinLocul.map((d) => (
          <p
            key={d.id}
            className="mt-2 rounded-xl bg-lime/25 px-3 py-2 text-xs"
          >
            <span className="font-semibold">{d.liderNume}</span> ține locul
            până pe {dataScurta(d.panaLa)}
            {d.motiv ? ` · ${d.motiv}` : ""}
          </p>
        ))}

        {/* Musafir sau membru */}
        <div className="mt-3 border-t border-[#eef1f7] pt-3">
          {esteMusafir ? (
            <>
              <p className="mb-3 text-xs text-cenusiu">
                Vine în vizită, dar nu e (încă) parte din grupă: nu intră în
                statistici și nu apare la „de căutat”.
              </p>
              <form action={primesteInGrupa.bind(null, membruId)}>
                <button type="submit" className="buton buton-principal">
                  Primește-l în grupă
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mb-3 text-xs text-cenusiu">
                E parte din grupă
                {m.devenitMembruLa
                  ? ` din ${dataScurta(m.devenitMembruLa)}`
                  : ""}
                : intră în statistici și în alertele de absență.
              </p>
              <form action={treceLaMusafiri.bind(null, membruId)}>
                <button
                  type="submit"
                  className="buton buton-secundar buton-mic"
                >
                  Trece-l înapoi la musafiri
                </button>
              </form>
            </>
          )}
        </div>
      </section>
      )}

      {/* Părinții */}
      {(m.parinte1Nume ||
        m.parinte1Telefon ||
        m.parinte1Email ||
        m.parinte2Nume ||
        m.parinte2Telefon ||
        m.parinte2Email) && (
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Părinți</h2>
          <ul className="flex flex-col gap-3">
            <Parinte
              nume={m.parinte1Nume}
              telefon={m.parinte1Telefon}
              email={m.parinte1Email}
            />
            <Parinte
              nume={m.parinte2Nume}
              telefon={m.parinte2Telefon}
              email={m.parinte2Email}
            />
          </ul>
        </section>
      )}

      {/* Prietenii apropiați - de ei ținem cont când împărțim camerele */}
      <section className="card p-4">
        <h2 className="text-sm font-bold">Prieteni apropiați</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Cu cine se are bine. Prietenia merge în amândouă părțile: apare și pe
          fișa celuilalt.
        </p>

        {prieteni.length === 0 ? (
          <p className="text-sm text-cenusiu">
            Nu e legat încă de nimeni.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {prieteni.map((p) => {
              const detaliiPrieten = [
                etichetaGrupa(p.grupaNume),
                etichetaClasa(p.clasa),
                p.status === "musafir" ? "musafir" : "",
                p.activ ? "" : "nu mai vine",
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li key={p.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    {/*
                      Numele e link doar dacă cel care se uită are acces la
                      grupa prietenului. Altfel rămâne text: se vede cu cine
                      se are bine, fără să se deschidă o fișă străină.
                    */}
                    {potVedea(p.grupaId) ? (
                      <Link
                        href={`/membri/${p.id}`}
                        className="text-sm font-medium text-albastru"
                      >
                        {p.nume}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium">{p.nume}</span>
                    )}
                    <span className="block text-xs text-cenusiu">
                      {detaliiPrieten}
                    </span>
                  </div>
                  <form action={scoatePrieten.bind(null, membruId, p.id)}>
                    <button
                      type="submit"
                      className="buton buton-secundar buton-mic"
                    >
                      Scoate
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        {deLegat.length > 0 ? (
          <form
            action={adaugaPrieten.bind(null, membruId)}
            className="mt-3 flex items-end gap-2 border-t border-[#eef1f7] pt-3"
          >
            <div className="min-w-0 flex-1">
              <label className="eticheta" htmlFor="prietenId">
                Adaugă un prieten
              </label>
              <select id="prietenId" name="prietenId" className="camp" required>
                <option value="">Alege</option>
                {deLegat.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nume} - {etichetaGrupa(p.grupaNume)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="buton buton-secundar shrink-0">
              Adaugă
            </button>
          </form>
        ) : (
          <p className="mt-3 border-t border-[#eef1f7] pt-3 text-xs text-cenusiu">
            {lider.rol === "admin"
              ? "Nu mai e nimeni de legat."
              : "Poți lega doar pulsiști din grupele tale. Pentru prietenii din alte grupe, cere-i coordonatorului."}
          </p>
        )}
      </section>

      {/* Unde slujește */}
      <section className="card p-4">
        <h2 className="text-sm font-bold">Unde slujește</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Locurile în care e implicat: Harvest Kids, cafeneaua, laudă și
          așa mai departe.
        </p>

        {echipe.length === 0 ? (
          <p className="text-sm text-cenusiu">Nu slujește nicăieri deocamdată.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#eef1f7]">
            {echipe.map((e) => (
              <li key={e.echipaId} className="flex items-center gap-2 py-2.5">
                <Link
                  href={`/slujiri/${e.echipaId}`}
                  className="min-w-0 flex-1 text-sm font-medium text-albastru"
                >
                  {e.nume}
                  {e.rol && (
                    <span className="font-normal text-cenusiu"> · {e.rol}</span>
                  )}
                  {!e.activa && (
                    <span className="ml-2 text-xs text-cenusiu">arhivată</span>
                  )}
                </Link>
                <form
                  action={scoateSlujireaMembrului.bind(null, membruId, e.echipaId)}
                >
                  <button type="submit" className="buton buton-secundar buton-mic">
                    Scoate
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {disponibile.length > 0 ? (
          <form
            action={adaugaSlujireaMembrului.bind(null, membruId)}
            className="mt-3 flex flex-col gap-3 border-t border-[#eef1f7] pt-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="eticheta" htmlFor="echipaId">
                  Adaugă o slujire
                </label>
                <select id="echipaId" name="echipaId" className="camp" required>
                  <option value="">Alege</option>
                  {disponibile.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nume}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="eticheta" htmlFor="rolSlujire">
                  Ce face acolo
                </label>
                <input
                  id="rolSlujire"
                  name="rol"
                  className="camp"
                  placeholder="opțional"
                  maxLength={60}
                />
              </div>
            </div>
            <button type="submit" className="buton buton-secundar self-start">
              Adaugă
            </button>
          </form>
        ) : (
          <p className="mt-3 border-t border-[#eef1f7] pt-3 text-xs text-cenusiu">
            {echipe.length > 0
              ? "E deja în toate locurile de slujire din aplicație."
              : "Nu e creat niciun loc de slujire încă. Coordonatorul le adaugă din pagina Slujiri."}
          </p>
        )}

        {slujiri.length > 0 && (
          <div className="mt-4 border-t border-[#eef1f7] pt-3">
            <h3 className="mb-2 text-xs font-bold text-cenusiu uppercase">
              Ce urmează
            </h3>
            <ul className="flex flex-col divide-y divide-[#eef1f7]">
              {slujiri.map((p) => (
                <li key={p.id} className="py-3">
                  <RandProgramare programare={p} azi={azi} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Istoricul prezenței */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold">Ultimele întâlniri</h2>
        {istoric.length === 0 ? (
          <p className="text-sm text-cenusiu">Nu are încă nicio prezență trecută.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {[...istoric].reverse().map((i) => (
              <li
                key={i.data}
                className={`flex w-16 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs ${CULORI[i.stare]}`}
                title={`${i.data}${i.subiect ? ` · ${i.subiect}` : ""}`}
              >
                <span className="text-base font-bold">{ETICHETE[i.stare]}</span>
                <span className="opacity-80">{dataScurta(i.data)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-cenusiu">
          P = prezent · A = a anunțat că lipsește · – = absent
        </p>
      </section>

      {/* Note */}
      <section className="card p-4">
        <h2 className="mb-1 text-sm font-bold">Note</h2>
        <p className="mb-3 text-xs text-cenusiu">
          Le văd doar liderii grupei și coordonatorii.
        </p>

        <FormularNota membruId={membruId} />

        {note.length > 0 && (
          <ul className="mt-4 flex flex-col divide-y divide-[#eef1f7]">
            {note.map((n) => (
              <li key={n.id} className="py-3">
                <p className="text-sm whitespace-pre-wrap">{n.text}</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-xs text-cenusiu">
                    {n.autorNume ?? "cineva"} · {momentLizibil(n.creatLa)}
                  </span>
                  {(n.autorId === lider.id || lider.rol === "admin") && (
                    <form action={stergeNota.bind(null, membruId, n.id)}>
                      <button
                        type="submit"
                        className="text-xs text-red-700 underline"
                      >
                        șterge
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Editare */}
      <section className="card p-4">
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-albastru">
            Modifică datele și părinții
          </summary>
          <div className="pt-2">
            <FormularEditareMembru
              bisericiCunoscute={biserici}
              membruId={membruId}
              initial={{
                nume: m.nume,
                telefon: m.telefon,
                email: m.email,
                dataNasterii: m.dataNasterii,
                sex: m.sex,
                clasa: m.clasa,
                biserica: m.biserica,
                bisericaId: m.bisericaId,
                botez: m.botez,
                botezatLa: m.botezatLa,
                parinte1Nume: m.parinte1Nume,
                parinte1Telefon: m.parinte1Telefon,
                parinte1Email: m.parinte1Email,
                parinte2Nume: m.parinte2Nume,
                parinte2Telefon: m.parinte2Telefon,
                parinte2Email: m.parinte2Email,
              }}
            />

            <form
              action={schimbaActiv.bind(null, membruId, !m.activ)}
              className="mt-4 border-t border-[#eef1f7] pt-4"
            >
              <button type="submit" className="buton buton-secundar">
                {m.activ
                  ? "Marchează ca inactiv (nu mai vine)"
                  : "Readu-l în grupă"}
              </button>
              <p className="mt-2 text-xs text-cenusiu">
                Nu se șterge nimic - doar nu mai apare pe foaia de prezență.
              </p>
            </form>
          </div>
        </details>
      </section>

      {/* Ștergerea definitivă */}
      {pierderi && (
        <ZonaStergere
          actiune={stergeMembru.bind(null, membruId)}
          nume={m.nume}
          titlu="Șterge definitiv din aplicație"
          avertisment={`${pierderiText(pierderi)} Nu se mai poate aduce înapoi. Dacă doar nu mai vine, folosește „Marchează ca inactiv” - acolo istoricul rămâne întreg.`}
          textButon="Șterge definitiv"
        />
      )}
    </div>
  );
}

/** „Dispar cu totul 4 prezențe, 2 note și o echipă de slujire." */
function pierderiText(p: {
  prezente: number;
  note: number;
  echipe: number;
  prieteni: number;
}): string {
  const bucati = [
    p.prezente === 0
      ? ""
      : p.prezente === 1
        ? "o prezență"
        : `${p.prezente} prezențe`,
    p.note === 0 ? "" : p.note === 1 ? "o notă" : `${p.note} note`,
    p.echipe === 0
      ? ""
      : p.echipe === 1
        ? "o echipă de slujire"
        : `${p.echipe} echipe de slujire`,
    p.prieteni === 0
      ? ""
      : p.prieteni === 1
        ? "o prietenie"
        : `${p.prieteni} prietenii`,
  ].filter(Boolean);

  if (bucati.length === 0) {
    return "Nu are nimic în istoric, deci nu se pierde decât fișa lui.";
  }
  const lista =
    bucati.length === 1
      ? bucati[0]
      : `${bucati.slice(0, -1).join(", ")} și ${bucati.at(-1)}`;
  return `Dispar cu totul ${lista}.`;
}

/** Un părinte, cu butoane de contact. */
function Parinte({
  nume,
  telefon,
  email,
}: {
  nume: string | null;
  telefon: string | null;
  email: string | null;
}) {
  if (!nume && !telefon && !email) return null;
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {nume ?? "Părinte"}
      </span>
      {telefon && (
        <>
          <a href={`tel:${telefon}`} className="buton buton-secundar buton-mic">
            Sună {telefon}
          </a>
          <a
            href={`https://wa.me/${numarInternational(telefon)}`}
            target="_blank"
            rel="noreferrer"
            className="buton buton-secundar buton-mic"
          >
            WhatsApp
          </a>
        </>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className="buton buton-secundar buton-mic max-w-full truncate"
        >
          {email}
        </a>
      )}
    </li>
  );
}

/** 0722... -> 40722... (formatul cerut de WhatsApp) */
function numarInternational(telefon: string): string {
  return telefon.replace(/[^0-9]/g, "").replace(/^0/, "40");
}
