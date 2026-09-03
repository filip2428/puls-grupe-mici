import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { TON, adaugaFoaie, adaugaFoaieDespre } from "@/lib/excel";
import { grupeAccesibile, verificaAccesGrupa } from "@/lib/interogari/acces";
import {
  randuriPulsisti,
  randuriIntalniri,
  randuriPrezente,
} from "@/lib/interogari/export";
import { dataAzi, dataLunga, esteDataValida, momentLizibil } from "@/lib/util/date";

/**
 * Descarcă datele într-un fișier Excel.
 *
 * /api/export?grupa=3&deLa=2026-09-01&panaLa=2026-12-31
 *
 * Fără parametrul `grupa`, adminul primește toate grupele, iar un lider
 * primește doar grupele lui.
 */
export async function GET(cerere: Request) {
  const lider = await ceruteLider();
  const parametri = new URL(cerere.url).searchParams;

  const grupaCeruta = parametri.get("grupa");
  let grupaIds: number[] | undefined;

  if (grupaCeruta) {
    const grupaId = Number(grupaCeruta);
    if (!Number.isInteger(grupaId)) {
      return NextResponse.json({ eroare: "Grupă invalidă." }, { status: 400 });
    }
    const acces = await verificaAccesGrupa(lider, grupaId);
    if (!acces.permis) {
      return NextResponse.json({ eroare: "Nu ai acces." }, { status: 403 });
    }
    grupaIds = [grupaId];
  } else if (lider.rol !== "admin") {
    const aleMele = await grupeAccesibile(lider);
    grupaIds = aleMele.map((g) => g.id);
  }

  const deLaBrut = parametri.get("deLa") ?? "";
  const panaLaBrut = parametri.get("panaLa") ?? "";
  const filtru = {
    grupaIds,
    deLa: esteDataValida(deLaBrut) ? deLaBrut : undefined,
    panaLa: esteDataValida(panaLaBrut) ? panaLaBrut : undefined,
  };

  const [prezente, pulsisti, intalniri] = await Promise.all([
    randuriPrezente(filtru),
    randuriPulsisti(filtru),
    randuriIntalniri(filtru),
  ]);

  const registru = new ExcelJS.Workbook();
  registru.creator = "Puls · Grupe mici";
  registru.created = new Date();

  adaugaFoaie(registru, {
    nume: "Prezențe",
    inghetate: 3,
    coloane: [
      { antet: "Grupa", cheie: "grupa", latime: 22 },
      { antet: "Data", cheie: "data", latime: 12, format: "data" },
      { antet: "Pulsist", cheie: "pulsist", latime: 24 },
      { antet: "Statut", cheie: "statut", latime: 10, ton: TON.statut },
      { antet: "Stare", cheie: "stare", latime: 12, ton: TON.stare },
      { antet: "Subiect", cheie: "subiect", latime: 28, rupeTextul: true },
      { antet: "Completat de", cheie: "marcatDe", latime: 20 },
    ],
    randuri: prezente,
  });

  adaugaFoaie(registru, {
    nume: "Pulsiști",
    inghetate: 2,
    coloane: [
      { antet: "Grupa", cheie: "grupa", latime: 22 },
      { antet: "Nume", cheie: "nume", latime: 24 },
      { antet: "Statut", cheie: "statut", latime: 10, ton: TON.statut },
      { antet: "Sex", cheie: "sex", latime: 8 },
      { antet: "Clasa", cheie: "clasa", latime: 12 },
      { antet: "Telefon", cheie: "telefon", latime: 14 },
      {
        antet: "Data nașterii",
        cheie: "dataNasterii",
        latime: 14,
        format: "data",
      },
      { antet: "Părinte 1", cheie: "parinte1Nume", latime: 22 },
      { antet: "Telefon părinte 1", cheie: "parinte1Telefon", latime: 16 },
      { antet: "Părinte 2", cheie: "parinte2Nume", latime: 22 },
      { antet: "Telefon părinte 2", cheie: "parinte2Telefon", latime: 16 },
      { antet: "Activ", cheie: "activ", latime: 8, ton: TON.activ },
      { antet: "Prezențe", cheie: "prezente", latime: 10 },
      { antet: "Anunțate", cheie: "anuntate", latime: 10 },
      { antet: "Absențe", cheie: "absente", latime: 10 },
      {
        antet: "% prezență",
        cheie: "procent",
        latime: 12,
        format: "procent",
        ton: TON.procent,
      },
    ],
    randuri: pulsisti,
  });

  adaugaFoaie(registru, {
    nume: "Întâlniri",
    inghetate: 2,
    coloane: [
      { antet: "Grupa", cheie: "grupa", latime: 22 },
      { antet: "Data", cheie: "data", latime: 12, format: "data" },
      { antet: "Subiect", cheie: "subiect", latime: 26, rupeTextul: true },
      { antet: "Prezenți", cheie: "prezenti", latime: 10 },
      { antet: "Anunțați", cheie: "anuntati", latime: 10 },
      { antet: "Absenți", cheie: "absenti", latime: 10 },
      { antet: "Musafiri", cheie: "musafiri", latime: 10 },
      { antet: "Completat de", cheie: "marcatDe", latime: 20 },
      { antet: "Prin înlocuire", cheie: "prinInlocuire", latime: 14 },
      { antet: "Notă", cheie: "nota", latime: 50, rupeTextul: true },
    ],
    randuri: intalniri,
  });

  adaugaFoaieDespre(registru, {
    titlu: "Prezențe, pulsiști și întâlniri",
    detalii: [
      { eticheta: "Descărcat de", valoare: lider.nume },
      { eticheta: "Când", valoare: momentLizibil(new Date()) },
      { eticheta: "Grupe", valoare: numeleGrupelor(pulsisti, grupaIds) },
      { eticheta: "Perioada", valoare: perioada(filtru.deLa, filtru.panaLa) },
      { eticheta: "Rânduri de prezență", valoare: String(prezente.length) },
      { eticheta: "Pulsiști", valoare: String(pulsisti.length) },
      { eticheta: "Întâlniri", valoare: String(intalniri.length) },
    ],
    legenda: [
      { ton: "bine", text: "prezent · prezență peste 80%" },
      { ton: "atentie", text: "a anunțat că lipsește · prezență între 50 și 80%" },
      { ton: "slab", text: "absent · prezență sub 50%" },
      { ton: "aparte", text: "musafir - vine, dar nu e (încă) în grupă" },
      { ton: "stins", text: "nu mai vine (inactiv) - rămâne pentru istoric" },
    ],
  });

  const continut = await registru.xlsx.writeBuffer();
  await scrieAudit(lider.id, "export", {
    grupaIds: grupaIds ?? "toate",
    deLa: filtru.deLa,
    panaLa: filtru.panaLa,
    randuri: prezente.length,
  });

  const numeFisier = `puls-grupe-${dataAzi()}.xlsx`;

  return new NextResponse(continut as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${numeFisier}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Ce grupe sunt în fișier.
 *
 * Le luăm din chiar rândurile exportate, nu dintr-o interogare în plus: dacă
 * o grupă n-a intrat în export, n-are ce căuta nici în descriere.
 */
function numeleGrupelor(
  pulsisti: { grupa: string }[],
  grupaIds: number[] | undefined,
): string {
  const nume = [...new Set(pulsisti.map((p) => p.grupa))].sort((a, b) =>
    a.localeCompare(b, "ro"),
  );
  if (nume.length === 0) return "-";
  return grupaIds === undefined ? `toate (${nume.join(", ")})` : nume.join(", ");
}

function perioada(deLa: string | undefined, panaLa: string | undefined): string {
  if (!deLa && !panaLa) return "tot ce e în aplicație";
  if (deLa && panaLa) return `${dataLunga(deLa)} - ${dataLunga(panaLa)}`;
  if (deLa) return `de la ${dataLunga(deLa)}`;
  return `până la ${dataLunga(panaLa!)}`;
}
