import { Schija, ScheletOameni, ScheletTitlu } from "@/componente/Schelete";

export default function SeIncarca() {
  return (
    <div className="flex flex-col gap-4">
      <ScheletTitlu />
      {/* Caseta de căutare și filtre. */}
      <div className="card flex flex-col gap-3 p-4">
        <Schija inaltime="h-11" />
        <div className="flex gap-2">
          <Schija inaltime="h-11" latime="w-1/2" />
          <Schija inaltime="h-11" latime="w-1/2" />
        </div>
      </div>
      <ScheletOameni cate={8} />
    </div>
  );
}
