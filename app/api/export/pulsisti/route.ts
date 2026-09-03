import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { TON, adaugaFoaie, adaugaFoaieDespre } from "@/lib/excel";
import { grupeAccesibile } from "@/lib/interogari/acces";
import {
  cautaPulsisti,
  filtruDinParametri,
  type FiltruPulsisti,
} from "@/lib/interogari/pulsisti";
import { dataAzi, momentLizibil } from "@/lib/util/date";
import { etichetaClasa, etichetaSex } from "@/lib/util/etichete";

/**
 * Tabelul cu pulsiști, în Excel, cu aceleași filtre ca pe pagina
 * /pulsisti (grupă, statut, sex, clasă, vârstă, căutare).
 */
export async function GET(cerere: Request) {
  const lider = await ceruteLider();
  const parametri = new URL(cerere.url).searchParams;
  const filtru = filtruDinParametri(parametri);

  if (lider.rol !== "admin") {
    const aleMele = await grupeAccesibile(lider);
    filtru.grupePermise = aleMele.map((g) => g.id);
  }

  const lista = await cautaPulsisti(filtru);

  const registru = new ExcelJS.Workbook();
  registru.creator = "Puls · Grupe mici";
  registru.created = new Date();

  const randuri = lista.map((a) => ({
    nume: a.nume,
    grupa: a.grupaNume,
    statut: a.status === "musafir" ? "musafir" : "membru",
    sex: etichetaSex(a.sex),
    clasa: etichetaClasa(a.clasa),
    varsta: a.varsta,
    dataNasterii: a.dataNasterii,
    telefon: a.telefon,
    parinte1Nume: a.parinte1Nume,
    parinte1Telefon: a.parinte1Telefon,
    parinte2Nume: a.parinte2Nume,
    parinte2Telefon: a.parinte2Telefon,
    activ: a.activ ? "da" : "nu",
    intalniri: a.intalniri,
    prezente: a.prezente,
    procent: a.procent,
    devenitMembruLa: a.devenitMembruLa,
  }));

  adaugaFoaie(registru, {
    nume: "Pulsiști",
    inghetate: 1,
    coloane: [
      { antet: "Nume", cheie: "nume", latime: 26 },
      { antet: "Grupa", cheie: "grupa", latime: 20 },
      { antet: "Statut", cheie: "statut", latime: 10, ton: TON.statut },
      { antet: "Sex", cheie: "sex", latime: 8 },
      { antet: "Clasa", cheie: "clasa", latime: 12 },
      { antet: "Vârstă", cheie: "varsta", latime: 8 },
      {
        antet: "Data nașterii",
        cheie: "dataNasterii",
        latime: 14,
        format: "data",
      },
      { antet: "Telefon", cheie: "telefon", latime: 14 },
      { antet: "Părinte 1", cheie: "parinte1Nume", latime: 22 },
      { antet: "Telefon părinte 1", cheie: "parinte1Telefon", latime: 16 },
      { antet: "Părinte 2", cheie: "parinte2Nume", latime: 22 },
      { antet: "Telefon părinte 2", cheie: "parinte2Telefon", latime: 16 },
      { antet: "Activ", cheie: "activ", latime: 8, ton: TON.activ },
      { antet: "Întâlniri", cheie: "intalniri", latime: 10 },
      { antet: "Prezențe", cheie: "prezente", latime: 10 },
      {
        antet: "% prezență",
        cheie: "procent",
        latime: 12,
        format: "procent",
        ton: TON.procent,
      },
      {
        antet: "Primit în grupă la",
        cheie: "devenitMembruLa",
        latime: 18,
        format: "data",
      },
    ],
    randuri,
  });

  adaugaFoaieDespre(registru, {
    titlu: "Lista de pulsiști",
    detalii: [
      { eticheta: "Descărcat de", valoare: lider.nume },
      { eticheta: "Când", valoare: momentLizibil(new Date()) },
      { eticheta: "Câți", valoare: String(lista.length) },
      { eticheta: "Filtre", valoare: descrieFiltrul(filtru, randuri) },
    ],
    legenda: [
      { ton: "bine", text: "prezență peste 80%" },
      { ton: "atentie", text: "prezență între 50 și 80%" },
      { ton: "slab", text: "prezență sub 50%" },
      { ton: "aparte", text: "musafir - vine, dar nu e (încă) în grupă" },
      { ton: "stins", text: "nu mai vine (inactiv) - rămâne pentru istoric" },
    ],
  });

  const continut = await registru.xlsx.writeBuffer();
  await scrieAudit(lider.id, "export:pulsisti", {
    randuri: lista.length,
    filtru: parametri.toString() || "fara filtre",
  });

  return new NextResponse(continut as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="puls-pulsisti-${dataAzi()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Filtrele, scrise pe românește.
 *
 * Numele grupei îl luăm din rândurile exportate, nu dintr-o interogare în
 * plus - când s-a filtrat pe o grupă, toate rândurile sunt oricum din ea.
 */
function descrieFiltrul(
  filtru: FiltruPulsisti,
  randuri: { grupa: string }[],
): string {
  const bucati: string[] = [];

  if (filtru.grupaId !== undefined) {
    bucati.push(`grupa ${randuri[0]?.grupa ?? filtru.grupaId}`);
  }
  if (filtru.status) {
    bucati.push(filtru.status === "membru" ? "doar membri" : "doar musafiri");
  }
  if (filtru.sex) bucati.push(filtru.sex === "baiat" ? "doar băieți" : "doar fete");
  if (filtru.clasa !== undefined) bucati.push(`clasa ${filtru.clasa}`);
  if (filtru.varstaMin !== undefined) bucati.push(`de la ${filtru.varstaMin} ani`);
  if (filtru.varstaMax !== undefined) bucati.push(`până la ${filtru.varstaMax} ani`);
  if (filtru.activi === "inactivi") bucati.push("doar cei care nu mai vin");
  else if (filtru.activi === "toti") bucati.push("cu tot cu cei care nu mai vin");
  if (filtru.q) bucati.push(`căutare după „${filtru.q}"`);

  return bucati.length > 0 ? bucati.join(" · ") : "fără filtre - toată lista";
}
