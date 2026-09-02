import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { grupeAccesibile, verificaAccesGrupa } from "@/lib/interogari/acces";
import {
  randuriAdolescenti,
  randuriIntalniri,
  randuriPrezente,
} from "@/lib/interogari/export";
import { dataAzi, esteDataValida } from "@/lib/util/date";

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

  const [prezente, adolescenti, intalniri] = await Promise.all([
    randuriPrezente(filtru),
    randuriAdolescenti(filtru),
    randuriIntalniri(filtru),
  ]);

  const registru = new ExcelJS.Workbook();
  registru.creator = "Puls · Grupe mici";
  registru.created = new Date();

  adaugaFoaie(
    registru,
    "Prezențe",
    [
      { header: "Grupa", key: "grupa", width: 22 },
      { header: "Data", key: "data", width: 12 },
      { header: "Adolescent", key: "adolescent", width: 24 },
      { header: "Statut", key: "statut", width: 10 },
      { header: "Stare", key: "stare", width: 12 },
      { header: "Subiect", key: "subiect", width: 24 },
      { header: "Completat de", key: "marcatDe", width: 20 },
    ],
    prezente,
  );

  adaugaFoaie(
    registru,
    "Adolescenți",
    [
      { header: "Grupa", key: "grupa", width: 22 },
      { header: "Nume", key: "nume", width: 24 },
      { header: "Statut", key: "statut", width: 10 },
      { header: "Sex", key: "sex", width: 8 },
      { header: "Clasa", key: "clasa", width: 12 },
      { header: "Telefon", key: "telefon", width: 14 },
      { header: "Data nașterii", key: "dataNasterii", width: 14 },
      { header: "Părinte 1", key: "parinte1Nume", width: 22 },
      { header: "Telefon părinte 1", key: "parinte1Telefon", width: 16 },
      { header: "Părinte 2", key: "parinte2Nume", width: 22 },
      { header: "Telefon părinte 2", key: "parinte2Telefon", width: 16 },
      { header: "Activ", key: "activ", width: 8 },
      { header: "Prezențe", key: "prezente", width: 10 },
      { header: "Anunțate", key: "anuntate", width: 10 },
      { header: "Absențe", key: "absente", width: 10 },
      { header: "% prezență", key: "procent", width: 12 },
    ],
    adolescenti,
  );

  adaugaFoaie(
    registru,
    "Întâlniri",
    [
      { header: "Grupa", key: "grupa", width: 22 },
      { header: "Data", key: "data", width: 12 },
      { header: "Subiect", key: "subiect", width: 24 },
      { header: "Prezenți", key: "prezenti", width: 10 },
      { header: "Anunțați", key: "anuntati", width: 10 },
      { header: "Absenți", key: "absenti", width: 10 },
      { header: "Musafiri", key: "musafiri", width: 10 },
      { header: "Completat de", key: "marcatDe", width: 20 },
      { header: "Prin înlocuire", key: "prinInlocuire", width: 14 },
      { header: "Notă", key: "nota", width: 50 },
    ],
    intalniri,
  );

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

/** Adaugă o foaie de calcul cu antet îngroșat și filtre. */
function adaugaFoaie(
  registru: ExcelJS.Workbook,
  nume: string,
  coloane: Partial<ExcelJS.Column>[],
  randuri: Record<string, unknown>[],
) {
  const foaie = registru.addWorksheet(nume);
  foaie.columns = coloane as ExcelJS.Column[];
  foaie.addRows(randuri);
  foaie.getRow(1).font = { bold: true };
  foaie.views = [{ state: "frozen", ySplit: 1 }];
  if (randuri.length > 0) {
    foaie.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: coloane.length },
    };
  }
}
