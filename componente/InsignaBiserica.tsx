import { etichetaBiserica, type Biserica } from "@/lib/util/etichete";

/**
 * Insigna care spune dintr-o privire de unde vine pulsistul.
 *
 * Culorile nu sunt note: albastrul înseamnă „de la noi", nu „mai bun". Cei
 * de la alte biserici capătă lime, ca să sară în ochi când te uiți peste o
 * listă lungă - de ei ai nevoie când suni acasă sau când pregătești o tabără.
 * Cine n-are nimic scris rămâne palid, cu semn de întrebare: e o întrebare
 * nepusă încă, nu un răspuns.
 */
const STILURI: Record<string, string> = {
  harvest: "bg-albastru/10 text-albastru",
  alta: "bg-lime/40 text-carbune",
  fara: "bg-fundal text-cenusiu",
  nescris: "border border-dashed border-[#d7dced] text-cenusiu",
};

export function InsignaBiserica({
  biserica,
  bisericaNume,
}: {
  biserica: Biserica | null;
  bisericaNume: string | null;
}) {
  const stil = STILURI[biserica ?? "nescris"];
  return (
    <span
      className={`max-w-40 truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${stil}`}
    >
      {etichetaBiserica(biserica, bisericaNume)}
    </span>
  );
}
