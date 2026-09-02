import { ScheletCard, ScheletTitlu } from "@/componente/Schelete";

export default function SeIncarca() {
  return (
    <div className="flex flex-col gap-5">
      <ScheletTitlu />
      <ScheletCard randuri={4} />
      <ScheletCard randuri={3} />
    </div>
  );
}
