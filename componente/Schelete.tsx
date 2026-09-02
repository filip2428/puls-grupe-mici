/**
 * Scheletele - ce se vede în locul conținutului, cât timp vin datele.
 *
 * Rostul lor nu e să arate frumos, ci ca atingerea să aibă un răspuns pe loc:
 * apeși, pagina se schimbă imediat, iar textul cade peste schelet când ajunge.
 * Fără ele, Next nu are ce pune pe ecran și telefonul pare că a ignorat degetul.
 *
 * Regula când adaugi altele: schija să aibă cam înălțimea textului adevărat,
 * altfel pagina „sare" când sosesc datele.
 */

/** O bară cenușie care pâlpâie. `latime` e o clasă Tailwind, ex. "w-2/3". */
export function Schija({
  latime = "w-full",
  inaltime = "h-4",
  clasa = "",
}: {
  latime?: string;
  inaltime?: string;
  clasa?: string;
}) {
  return <div className={`schelet ${inaltime} ${latime} ${clasa}`} />;
}

/** Titlul paginii plus rândul de explicație de sub el. */
export function ScheletTitlu({ subtitlu = true }: { subtitlu?: boolean }) {
  return (
    <div className="mb-5 flex flex-col gap-2">
      <Schija latime="w-40" inaltime="h-6" />
      {subtitlu && <Schija latime="w-64" inaltime="h-4" />}
    </div>
  );
}

/** Un card gol, de înălțimea unui card cu conținut. */
export function ScheletCard({ randuri = 3 }: { randuri?: number }) {
  const latimi = ["w-1/2", "w-3/4", "w-2/3", "w-5/6"];
  return (
    <div className="card flex flex-col gap-2.5 p-4">
      {Array.from({ length: randuri }).map((_, i) => (
        <Schija
          key={i}
          latime={latimi[i % latimi.length]}
          inaltime={i === 0 ? "h-5" : "h-3.5"}
        />
      ))}
    </div>
  );
}

/** O listă de carduri - forma cea mai des întâlnită în aplicație. */
export function ScheletLista({
  cate = 3,
  randuri = 3,
}: {
  cate?: number;
  randuri?: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: cate }).map((_, i) => (
        <ScheletCard key={i} randuri={randuri} />
      ))}
    </div>
  );
}

/** Rânduri de persoane: bulină rotundă la stânga, nume și detaliu la dreapta. */
export function ScheletOameni({ cate = 6 }: { cate?: number }) {
  return (
    <div className="card divide-y divide-[#eef1f7]">
      {Array.from({ length: cate }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <div className="schelet h-9 w-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Schija latime={i % 2 ? "w-40" : "w-32"} inaltime="h-4" />
            <Schija latime="w-24" inaltime="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
