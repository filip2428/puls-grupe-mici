import { Schija, ScheletCard } from "@/componente/Schelete";

export default function SeIncarca() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Schija latime="w-28" inaltime="h-4" />
        <Schija latime="w-48" inaltime="h-7" />
        <Schija latime="w-72" inaltime="h-4" />
        <div className="mt-1 flex gap-2">
          <Schija latime="w-28" inaltime="h-11" />
          <Schija latime="w-28" inaltime="h-11" />
        </div>
      </div>
      <ScheletCard randuri={4} />
      <ScheletCard randuri={5} />
    </div>
  );
}
