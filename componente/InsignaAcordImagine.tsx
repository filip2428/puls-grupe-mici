import { Icoana } from "@/componente/Icoane";
import { etichetaAcordImagine } from "@/lib/util/etichete";

/**
 * Semnul că pulsistul nu are voie în poze și în filmări.
 *
 * Spre deosebire de celelalte insigne, asta apare doar la refuz, și apare
 * tare: e singurul lucru de pe fișă pe care echipa trebuie să-l vadă înainte
 * să apese pe „postează", nu după.
 */
export function InsignaAcordImagine({ acord }: { acord: boolean }) {
  if (acord) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800">
      <Icoana nume="alerta" marime={13} />
      {etichetaAcordImagine(acord)}
    </span>
  );
}
