import { redirect } from "next/navigation";

import { sesiuneCurenta } from "@/lib/auth/sesiune";

/** Pagina de start doar trimite mai departe, în funcție de cine ești. */
export default async function Acasa() {
  const lider = await sesiuneCurenta();
  if (!lider) redirect("/intra");
  redirect(lider.rol === "admin" ? "/admin" : "/grupe");
}
