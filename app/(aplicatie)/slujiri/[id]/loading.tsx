import { Schija, ScheletCard, ScheletOameni } from "@/componente/Schelete";

export default function SeIncarca() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Schija latime="w-24" inaltime="h-4" />
        <Schija latime="w-56" inaltime="h-7" />
      </div>
      <ScheletCard randuri={3} />
      <ScheletOameni cate={5} />
    </div>
  );
}
