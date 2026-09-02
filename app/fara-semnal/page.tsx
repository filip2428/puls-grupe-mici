import { ButonReincarca } from "@/componente/ButonReincarca";

export const metadata = { title: "Fără semnal · Puls" };

/**
 * Ce vede liderul când deschide aplicația fără net, la o pagină pe care n-a
 * mai deschis-o de pe telefonul lui.
 *
 * Pagina asta e salvată în telefon de service worker, deci se afișează chiar
 * și când nu se poate ajunge la server.
 */
export default function PaginaFaraSemnal() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-albastru text-2xl font-black text-lime">
          P
        </div>
        <h1 className="text-xl font-bold text-albastru">Nu ai semnal</h1>
        <p className="mt-2 text-sm text-cenusiu">
          Pagina asta n-a mai fost deschisă pe telefonul tău, așa că nu e
          salvată aici. Paginile pe care le-ai vizitat deja se văd și fără net.
        </p>
        <p className="mt-4 text-sm text-cenusiu">
          Dacă bifezi prezența și îți pică netul, nu se pierde nimic: se trimite
          singură când revine semnalul.
        </p>
        <div className="mt-6">
          <ButonReincarca />
        </div>
      </div>
    </main>
  );
}
