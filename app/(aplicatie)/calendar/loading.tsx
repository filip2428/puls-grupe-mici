import { ScheletCard, ScheletTitlu } from "@/componente/Schelete";

/**
 * Grila lunii, desenată cu schije: cinci rânduri de câte șapte căsuțe, cam
 * de înălțimea celor adevărate, ca pagina să nu sară când sosesc datele.
 */
export default function SeIncarca() {
  return (
    <div className="flex flex-col gap-4">
      <ScheletTitlu />

      <div className="card p-3">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="schelet h-12 rounded-xl" />
          ))}
        </div>
      </div>

      <ScheletCard randuri={3} />
    </div>
  );
}
