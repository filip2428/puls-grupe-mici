import Link from "next/link";

import { ZonaStergere } from "@/componente/ZonaStergere";
import { ultimeleAuditari } from "@/lib/audit";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { momentLizibil } from "@/lib/util/date";
import { golesteJurnalul } from "../actions";

export const metadata = { title: "Jurnal · Puls" };

/** Traducerea acțiunilor în limbaj omenesc. */
const TEXTE: Record<string, string> = {
  autentificare: "a intrat în aplicație",
  deconectare: "a ieșit din aplicație",
  "prezenta:creata": "a făcut prezența",
  "prezenta:modificata": "a modificat prezența",
  "membru:adaugat": "a adăugat un pulsist",
  "membru:modificat": "a modificat un pulsist",
  "membru:inactivat": "a marcat un pulsist ca inactiv",
  "membru:reactivat": "a readus un pulsist în grupă",
  "membru:mutat": "a mutat un pulsist în altă grupă",
  "nota:adaugata": "a scris o notă",
  "nota:stearsa": "a șters o notă",
  "inlocuire:creata": "a trecut o înlocuire",
  "inlocuire:anulata": "a anulat o înlocuire",
  "inlocuire:stearsa": "a șters o înlocuire",
  "prezenta:stearsa": "a șters prezența unei zile",
  "membru:sters": "a șters definitiv un pulsist",
  "membru:trecut-la-musafiri": "a trecut un pulsist înapoi la musafiri",
  "musafir:adaugat": "a adăugat un musafir",
  "musafir:primit-in-grupa": "a primit un musafir în grupă",
  "pulsisti:importati": "a importat pulsiști dintr-un Excel",
  "lider:sters": "a șters definitiv un lider",
  "grupa:stearsa": "a șters definitiv o grupă",
  "echipa:creata": "a creat un loc de slujire",
  "echipa:modificata": "a modificat un loc de slujire",
  "echipa:arhivata": "a arhivat un loc de slujire",
  "echipa:reactivata": "a reactivat un loc de slujire",
  "echipa:stearsa": "a șters un loc de slujire",
  "echipa:pulsist-adaugat": "a trecut un pulsist la o slujire",
  "echipa:pulsist-scos": "a scos un pulsist dintr-o slujire",
  "programare:creata": "a programat o slujire",
  "programare:modificata": "a modificat o programare",
  "programare:stearsa": "a scos o programare din calendar",
  "intalnire:creata": "a trecut o întâlnire în calendar",
  "intalnire:modificata": "a modificat o întâlnire din calendar",
  "intalnire:stearsa": "a scos o întâlnire din calendar",
  "notificari:rulate": "a rulat notificările",
  "notificari:sterse": "și-a șters notificările",
  "setari:salvate": "și-a schimbat setările",
  "jurnal:golit": "a golit jurnalul",
  "lider:creat": "a creat un lider",
  "lider:cod-nou": "a generat un cod nou",
  "lider:activat": "a activat un lider",
  "lider:dezactivat": "a dezactivat un lider",
  "lider:rol": "a schimbat rolul unui lider",
  "grupa:creata": "a creat o grupă",
  "grupa:modificata": "a modificat o grupă",
  "grupa:arhivata": "a arhivat o grupă",
  "grupa:reactivata": "a reactivat o grupă",
  "grupa:lider-adaugat": "a repartizat un lider la o grupă",
  "grupa:lider-scos": "a scos un lider dintr-o grupă",
  export: "a descărcat datele",
};

export default async function PaginaJurnal() {
  await ceruteAdmin();
  const intrari = await ultimeleAuditari(150);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin" className="text-sm text-cenusiu">
          ← Administrare
        </Link>
        <h1 className="mt-2 text-xl font-bold">Jurnal</h1>
        <p className="text-sm text-cenusiu">
          Ultimele modificări din aplicație. Util dacă ceva pare schimbat fără
          explicație.
        </p>
      </div>

      <section className="card p-4">
        <ul className="flex flex-col divide-y divide-[#eef1f7]">
          {intrari.map((i) => (
            <li key={i.id} className="py-2.5">
              <p className="text-sm">
                <span className="font-medium">{i.liderNume ?? "cineva"}</span>{" "}
                {TEXTE[i.actiune] ?? i.actiune}
              </p>
              <p className="text-xs text-cenusiu">
                {momentLizibil(i.creatLa)}
                {i.detalii && i.actiune !== "autentificare" ? ` · ${i.detalii}` : ""}
              </p>
            </li>
          ))}
          {intrari.length === 0 && (
            <li className="py-2 text-sm text-cenusiu">Nimic încă.</li>
          )}
        </ul>
      </section>

      {intrari.length > 0 && (
        <ZonaStergere
          actiune={golesteJurnalul}
          nume="golește"
          titlu="Golește jurnalul"
          avertisment="Jurnalul e singura urmă a cine ce a schimbat, inclusiv a ștergerilor. Golit, nu se mai poate reface. Rămâne scris doar că l-ai golit tu, acum."
          textButon="Golește jurnalul"
        />
      )}
    </div>
  );
}
