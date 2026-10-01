import { redirect } from "next/navigation";

import { FormularIntrare } from "@/componente/FormularIntrare";
import { UitaPaginile } from "@/componente/ServiceWorker";
import { sesiuneCurenta } from "@/lib/auth/sesiune";

export const metadata = { title: "Intră · Puls" };

export default async function PaginaIntrare() {
  const lider = await sesiuneCurenta();
  if (lider) redirect(lider.rol === "admin" ? "/admin" : "/grupe");

  return (
    <main className="flex min-h-dvh flex-col">
      {/* Ecranul de intrare = cineva a ieșit din cont. Uităm ce era salvat. */}
      <UitaPaginile />

      {/*
        Partea de sus în culorile lucrării: e primul lucru pe care îl vede un
        lider nou, și singurul ecran pe care nu-l deschide cu treabă.
      */}
      <div className="relative overflow-hidden bg-linear-to-br from-albastru to-albastru-inchis px-5 pt-[max(3.5rem,env(safe-area-inset-top))] pb-24 text-center text-white">
        <div
          aria-hidden
          className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-albastru-deschis/25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-28 -left-10 h-56 w-56 rounded-full bg-lime/20 blur-3xl"
        />
        <div className="relative">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white/10 text-3xl font-extrabold text-lime ring-1 ring-white/20">
            P
          </div>
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight">
            Puls · Grupe mici
          </h1>
          <p className="mt-1.5 text-sm text-white/75">
            Prezența la grupele mici, într-un singur loc.
          </p>
        </div>
      </div>

      <div className="relative -mt-16 flex flex-1 flex-col items-center px-5 pb-10">
        <div className="w-full max-w-sm">
          <div className="card p-5 shadow-[0_20px_40px_-24px_rgb(27_31_59/0.35)]">
            <FormularIntrare />
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-cenusiu">
            Codul rămâne valabil pe telefonul tău 90 de zile. Dacă îl pierzi,
            coordonatorul îți generează altul.
          </p>
        </div>
      </div>
    </main>
  );
}
