import { etichetaBotez, type Botez } from "@/lib/util/etichete";

/**
 * Insigna care spune dintr-o privire dacă pulsistul e botezat.
 *
 * Nu e o notă și nu e o bifă de îndeplinit: „nebotezat" nu e o problemă de
 * rezolvat, e doar unde e omul acum. De-aia amândouă răspunsurile stau
 * potolit, în gri-albastru, iar singurul care iese în evidență e cel
 * necompletat - fiindcă acela e o întrebare nepusă încă.
 */
const STILURI: Record<string, string> = {
  botezat: "bg-albastru/10 text-albastru",
  nebotezat: "bg-fundal text-cenusiu",
  nescris: "border border-dashed border-[#d7dced] text-cenusiu",
};

export function InsignaBotez({ botez }: { botez: Botez | null }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STILURI[botez ?? "nescris"]}`}
    >
      {etichetaBotez(botez)}
    </span>
  );
}
