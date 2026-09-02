import { redirect } from "next/navigation";

import { FormularIntrare } from "@/componente/FormularIntrare";
import { sesiuneCurenta } from "@/lib/auth/sesiune";

export const metadata = { title: "Intră · Puls" };

export default async function PaginaIntrare() {
  const lider = await sesiuneCurenta();
  if (lider) redirect(lider.rol === "admin" ? "/admin" : "/grupe");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-albastru text-2xl font-black text-lime">
            P
          </div>
          <h1 className="text-2xl font-bold text-albastru">Puls · Grupe mici</h1>
          <p className="mt-1 text-sm text-cenusiu">
            Prezența la grupele mici, într-un singur loc.
          </p>
        </div>

        <div className="card p-5 shadow-sm">
          <FormularIntrare />
        </div>

        <p className="mt-6 text-center text-xs text-cenusiu">
          Codul rămâne valabil pe telefonul tău 90 de zile. Dacă îl pierzi,
          coordonatorul îți generează altul.
        </p>
      </div>
    </main>
  );
}
