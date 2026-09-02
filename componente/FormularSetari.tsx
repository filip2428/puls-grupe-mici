"use client";

import { useActionState } from "react";

import {
  salveazaSetari,
  type StareSetari,
} from "@/app/(aplicatie)/setari/actions";

export type PreferinteNotificari = {
  email: string | null;
  notifZileNastere: boolean;
  notifSlujiri: boolean;
  notifPrezenta: boolean;
  notifRezumat: boolean;
};

const TIPURI = [
  {
    camp: "notifZileNastere",
    titlu: "Zile de naștere",
    explicatie: "Cu trei zile înainte, ca să ai timp să pregătești un mesaj.",
  },
  {
    camp: "notifSlujiri",
    titlu: "Slujirile grupei",
    explicatie: "Când grupa ta sau pulsiștii tăi sunt programați la o slujire.",
  },
  {
    camp: "notifPrezenta",
    titlu: "Prezența necompletată",
    explicatie: "Un ghiont, dacă a trecut ziua întâlnirii și prezența lipsește.",
  },
  {
    camp: "notifRezumat",
    titlu: "Rezumatul de luni",
    explicatie: "Cum a fost săptămâna trecută și cine ar trebui căutat.",
  },
] as const;

export function FormularSetari({
  initial,
  emailConfigurat,
}: {
  initial: PreferinteNotificari;
  emailConfigurat: boolean;
}) {
  const [stare, actiune, seTrimite] = useActionState<StareSetari, FormData>(
    salveazaSetari,
    {},
  );

  return (
    <form action={actiune} className="flex flex-col gap-4">
      <div>
        <label className="eticheta" htmlFor="email">
          Adresa ta de email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="camp"
          defaultValue={initial.email ?? ""}
          placeholder="numele.tau@exemplu.ro"
          autoComplete="email"
          inputMode="email"
          maxLength={120}
        />
        <p className="mt-1 text-xs text-cenusiu">
          Fără adresă, notificările se văd doar aici, în aplicație. Nu se
          folosește la autentificare - intri tot cu codul tău.
        </p>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="eticheta">Ce vrei să afli</legend>
        {TIPURI.map((t) => (
          <label
            key={t.camp}
            className="flex min-h-11 items-start gap-3 border-b border-[#eef1f7] py-2 last:border-0"
          >
            <input
              type="checkbox"
              name={t.camp}
              value="da"
              defaultChecked={initial[t.camp]}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#2b328d]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t.titlu}</span>
              <span className="block text-xs text-cenusiu">{t.explicatie}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {!emailConfigurat && (
        <p className="rounded-xl bg-lime/25 px-3 py-2 text-xs">
          Trimiterea pe email nu e pornită încă pe server. Până atunci
          notificările se adună aici, în aplicație.
        </p>
      )}

      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
      {stare.reusit && <p className="text-sm text-green-700">Salvat.</p>}

      <button
        type="submit"
        disabled={seTrimite}
        className="buton buton-principal self-start"
      >
        {seTrimite ? "Salvez..." : "Salvează"}
      </button>
    </form>
  );
}
