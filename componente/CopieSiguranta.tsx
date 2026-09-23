"use client";

import { useActionState, useState } from "react";

import {
  restaureaza,
  trimiteCopiaAcum,
  verificaCopia,
  type StareRestaurare,
  type StareTrimitere,
  type StareVerificare,
} from "@/app/(aplicatie)/admin/siguranta/actions";
import { momentLizibil } from "@/lib/util/date";

/** Butonul „trimite copia pe email acum". */
export function ButonTrimiteCopia() {
  const [stare, trimite, seTrimite] = useActionState<StareTrimitere, FormData>(
    () => trimiteCopiaAcum(),
    {},
  );
  return (
    <form action={trimite} className="flex flex-col gap-2">
      <button type="submit" disabled={seTrimite} className="buton buton-secundar self-start">
        {seTrimite ? "Trimit..." : "Trimite o copie pe email acum"}
      </button>
      {stare.mesaj && <p className="text-sm text-green-700">{stare.mesaj}</p>}
      {stare.eroare && <p className="text-sm text-red-700">{stare.eroare}</p>}
    </form>
  );
}

const CONFIRMARE = "restaurează";

/**
 * Restaurarea, în doi pași în același formular: întâi alegi fișierul și vezi
 * ce e în el, apoi scrii cuvântul de confirmare și abia atunci se înlocuiește
 * baza. Fișierul rămâne ales între pași, deci se trimite din nou la al doilea.
 */
export function RestaurareCopie() {
  const [verificare, verifica, seVerifica] = useActionState<
    StareVerificare,
    FormData
  >(verificaCopia, {});
  const [rezultat, restaureazaAcum, seRestaureaza] = useActionState<
    StareRestaurare,
    FormData
  >(restaureaza, {});
  const [scris, setScris] = useState("");

  if (rezultat.reusit) {
    return (
      <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
        Gata: datele sunt acum cele din copie.{" "}
        {rezultat.copieTrimisa
          ? "Starea de dinainte a plecat pe email, pentru orice eventualitate."
          : ""}{" "}
        Dacă aplicația te scoate afară, intră din nou cu codul tău - codurile
        sunt și ele cele din copie.
      </div>
    );
  }

  const r = verificare.rezumat;
  const potrivit =
    scris.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase() ===
    "restaureaza";

  return (
    <form className="flex flex-col gap-3">
      <div>
        <label className="eticheta" htmlFor="copie">
          Fișierul copiei (.json.gz)
        </label>
        <input
          id="copie"
          name="copie"
          type="file"
          accept=".gz,.json,application/gzip,application/json"
          required
          className="camp py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-albastru file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
      </div>

      <button
        type="submit"
        formAction={verifica}
        disabled={seVerifica}
        className="buton buton-secundar self-start"
      >
        {seVerifica ? "Citesc copia..." : "Verifică copia"}
      </button>

      {verificare.eroare && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {verificare.eroare}
        </p>
      )}

      {r && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/50 p-3">
          <p className="text-sm">
            Copia e făcută <strong>{momentLizibil(new Date(r.creatLa))}</strong> și are:
          </p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {r.numere.map((n) => (
              <li key={n.eticheta}>
                <strong>{n.cate}</strong> {n.eticheta}
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-800/90">
            Tot ce e acum în aplicație se înlocuiește cu ce e în copie. Ce s-a
            scris după {momentLizibil(new Date(r.creatLa))} se pierde. Înainte de
            restaurare, starea de acum pleacă automat pe email la administratori
            (dacă emailul e pornit) - dar descarcă și tu o copie de sus, ca să fii
            sigur.
          </p>
          <div>
            <label className="eticheta" htmlFor="confirmare">
              Scrie „{CONFIRMARE}” ca să confirmi
            </label>
            <input
              id="confirmare"
              name="confirmare"
              className="camp"
              value={scris}
              onChange={(e) => setScris(e.target.value)}
              autoComplete="off"
              placeholder={CONFIRMARE}
            />
          </div>
          {rezultat.eroare && <p className="text-sm text-red-700">{rezultat.eroare}</p>}
          <button
            type="submit"
            formAction={restaureazaAcum}
            disabled={!potrivit || seRestaureaza}
            className="buton self-start bg-red-700 text-white"
          >
            {seRestaureaza ? "Restaurez..." : "Restaurează din copie"}
          </button>
        </div>
      )}
    </form>
  );
}
