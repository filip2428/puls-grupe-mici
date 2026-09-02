import { Schija, ScheletOameni } from "@/componente/Schelete";

export default function SeIncarca() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Schija latime="w-28" inaltime="h-4" />
        <Schija latime="w-32" inaltime="h-7" />
        <Schija latime="w-44" inaltime="h-4" />
      </div>
      <ScheletOameni cate={8} />
    </div>
  );
}
