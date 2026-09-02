import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { grupeAccesibile } from "@/lib/interogari/acces";
import {
  cautaAdolescenti,
  filtruDinParametri,
} from "@/lib/interogari/adolescenti";
import { dataAzi } from "@/lib/util/date";
import { etichetaClasa, etichetaSex } from "@/lib/util/etichete";

/**
 * Tabelul cu adolescenți, în Excel, cu aceleași filtre ca pe pagina
 * /adolescenti (grupă, statut, sex, clasă, vârstă, căutare).
 */
export async function GET(cerere: Request) {
  const lider = await ceruteLider();
  const parametri = new URL(cerere.url).searchParams;
  const filtru = filtruDinParametri(parametri);

  if (lider.rol !== "admin") {
    const aleMele = await grupeAccesibile(lider);
    filtru.grupePermise = aleMele.map((g) => g.id);
  }

  const lista = await cautaAdolescenti(filtru);

  const registru = new ExcelJS.Workbook();
  registru.creator = "Puls · Grupe mici";
  registru.created = new Date();

  const foaie = registru.addWorksheet("Adolescenți");
  foaie.columns = [
    { header: "Nume", key: "nume", width: 26 },
    { header: "Grupa", key: "grupa", width: 20 },
    { header: "Statut", key: "statut", width: 10 },
    { header: "Sex", key: "sex", width: 8 },
    { header: "Clasa", key: "clasa", width: 12 },
    { header: "Vârstă", key: "varsta", width: 8 },
    { header: "Data nașterii", key: "dataNasterii", width: 14 },
    { header: "Telefon", key: "telefon", width: 14 },
    { header: "Părinte 1", key: "parinte1Nume", width: 22 },
    { header: "Telefon părinte 1", key: "parinte1Telefon", width: 16 },
    { header: "Părinte 2", key: "parinte2Nume", width: 22 },
    { header: "Telefon părinte 2", key: "parinte2Telefon", width: 16 },
    { header: "Activ", key: "activ", width: 8 },
    { header: "Întâlniri", key: "intalniri", width: 10 },
    { header: "Prezențe", key: "prezente", width: 10 },
    { header: "% prezență", key: "procent", width: 12 },
    { header: "Primit în grupă la", key: "devenitMembruLa", width: 16 },
  ] as ExcelJS.Column[];

  foaie.addRows(
    lista.map((a) => ({
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
    })),
  );

  foaie.getRow(1).font = { bold: true };
  foaie.views = [{ state: "frozen", ySplit: 1 }];
  if (lista.length > 0) {
    foaie.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: foaie.columns.length },
    };
  }

  const continut = await registru.xlsx.writeBuffer();
  await scrieAudit(lider.id, "export:adolescenti", {
    randuri: lista.length,
    filtru: parametri.toString() || "fara filtre",
  });

  return new NextResponse(continut as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="puls-adolescenti-${dataAzi()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
