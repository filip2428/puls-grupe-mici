import { ScheletLista, ScheletTitlu } from "@/componente/Schelete";

export default function SeIncarca() {
  return (
    <>
      <ScheletTitlu />
      {/* Cardurile de grupă au și butonul de prezență dedesubt, de-aia 4 rânduri. */}
      <ScheletLista cate={3} randuri={4} />
    </>
  );
}
