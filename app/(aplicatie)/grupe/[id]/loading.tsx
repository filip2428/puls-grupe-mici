import { Schija, ScheletCard, ScheletOameni } from "@/componente/Schelete";

export default function SeIncarca() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Schija latime="w-24" inaltime="h-4" />
        <Schija latime="w-52" inaltime="h-7" />
        <Schija latime="w-64" inaltime="h-4" />
      </div>
      <ScheletCard randuri={2} />
      <ScheletOameni cate={7} />
    </div>
  );
}
