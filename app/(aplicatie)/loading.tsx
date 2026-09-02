import { ScheletLista, ScheletTitlu } from "@/componente/Schelete";

/** Scheletul folosit de paginile care nu au unul făcut pe măsura lor. */
export default function SeIncarca() {
  return (
    <>
      <ScheletTitlu />
      <ScheletLista cate={3} />
    </>
  );
}
