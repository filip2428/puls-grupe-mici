import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { ceruteLider } from "@/lib/auth/sesiune";
import { scrieAudit } from "@/lib/audit";
import { TON, adaugaFoaie, adaugaFoaieDespre } from "@/lib/excel";
import { grupeAccesibile } from "@/lib/interogari/acces";
import { statisticiPerioada } from "@/lib/interogari/perioada";
import {
  anulBisericesc,
  dataAzi,
  esteDataValida,
  momentLizibil,
  perioadaLizibila,
} from "@/lib/util/date";

/**
 * Statisticile pe o perioadă, în Excel.
 *
 * Aceleași cifre ca pe pagina /statistici, doar că fiecare tabel de acolo e
 * aici o foaie - ca să poți face grafice, să le lipești în raportul de sfârșit
 * de an sau doar să le tipărești.
 */
export async function GET(cerere: Request) {
  const lider = await ceruteLider();
  const parametri = new URL(cerere.url).searchParams;

  const anul = anulBisericesc();
  const deLa = citesteData(parametri.get("deLa")) ?? anul.deLa;
  const panaLa = citesteData(parametri.get("panaLa")) ?? anul.panaLa;

  const grupele = await grupeAccesibile(lider);
  const cerutaGrupa = Number(parametri.get("grupa"));
  const grupaAleasa =
    Number.isInteger(cerutaGrupa) && grupele.some((g) => g.id === cerutaGrupa)
      ? cerutaGrupa
      : undefined;

  const grupaIds = grupaAleasa
    ? [grupaAleasa]
    : lider.rol === "admin"
      ? undefined
      : grupele.map((g) => g.id);

  const s = await statisticiPerioada({ deLa, panaLa, grupaIds });

  const registru = new ExcelJS.Workbook();
  registru.creator = "Puls · Grupe mici";
  registru.created = new Date();

  adaugaFoaie(registru, {
    nume: "Rezumat",
    inghetate: 1,
    coloane: [
      { antet: "Ce", cheie: "ce", latime: 34 },
      { antet: "Cât", cheie: "cat", latime: 14 },
    ],
    randuri: [
      { ce: "Întâlniri ținute", cat: s.rezumat.intalniri },
      { ce: "Grupe care s-au întâlnit", cat: s.rezumat.grupe },
      { ce: "Membri care au fost pe foaie", cat: s.rezumat.membri },
      { ce: "Musafiri care au trecut pragul", cat: s.rezumat.musafiri },
      { ce: "Prezenți în medie la o seară", cat: s.rezumat.prezentiInMedie ?? "-" },
      { ce: "Prezență medie (%)", cat: s.rezumat.procent ?? "-" },
      { ce: "Bife „prezent”", cat: s.rezumat.prezente },
      { ce: "Bife „a anunțat”", cat: s.rezumat.anuntate },
      { ce: "Bife „absent”", cat: s.rezumat.absente },
      { ce: "Pulsiști noi adăugați", cat: s.rezumat.pulsistiNoi },
      { ce: "Primiți în grupă", cat: s.rezumat.primitiInGrupa },
      { ce: "Slujiri programate", cat: s.rezumat.slujiri },
      { ce: "Pulsiști care au slujit", cat: s.rezumat.auSlujit },
    ],
  });

  adaugaFoaie(registru, {
    nume: "Pe grupe",
    inghetate: 1,
    coloane: [
      { antet: "Grupa", cheie: "nume", latime: 24 },
      { antet: "Întâlniri", cheie: "intalniri", latime: 11 },
      { antet: "Membri", cheie: "membri", latime: 10 },
      { antet: "Musafiri", cheie: "musafiri", latime: 10 },
      { antet: "Prezenți în medie", cheie: "prezentiInMedie", latime: 17 },
      {
        antet: "% prezență",
        cheie: "procent",
        latime: 12,
        format: "procent",
        ton: TON.procent,
      },
    ],
    randuri: s.peGrupe,
  });

  adaugaFoaie(registru, {
    nume: "Pe biserici",
    inghetate: 1,
    coloane: [
      { antet: "Biserica", cheie: "nume", latime: 30 },
      { antet: "Pulsiști", cheie: "pulsisti", latime: 11 },
      {
        antet: "% prezență",
        cheie: "procent",
        latime: 12,
        format: "procent",
        ton: TON.procent,
      },
    ],
    randuri: s.peBiserici,
  });

  adaugaFoaie(registru, {
    nume: "Pe luni",
    inghetate: 1,
    coloane: [
      { antet: "Luna", cheie: "nume", latime: 20 },
      { antet: "Întâlniri", cheie: "intalniri", latime: 11 },
      { antet: "Prezenți în medie", cheie: "prezentiInMedie", latime: 17 },
      {
        antet: "% prezență",
        cheie: "procent",
        latime: 12,
        format: "procent",
        ton: TON.procent,
      },
    ],
    randuri: s.peLuni,
  });

  adaugaFoaie(registru, {
    nume: "Pe clase",
    inghetate: 1,
    coloane: [
      { antet: "Clasa", cheie: "nume", latime: 18 },
      { antet: "Pulsiști", cheie: "pulsisti", latime: 11 },
      {
        antet: "% prezență",
        cheie: "procent",
        latime: 12,
        format: "procent",
        ton: TON.procent,
      },
    ],
    randuri: s.peClase,
  });

  adaugaFoaie(registru, {
    nume: "Pulsiști",
    inghetate: 1,
    coloane: [
      { antet: "Nume", cheie: "nume", latime: 26 },
      { antet: "Grupa", cheie: "grupa", latime: 22 },
      { antet: "Prezent la", cheie: "prezente", latime: 12 },
      { antet: "A anunțat", cheie: "anuntate", latime: 12 },
      { antet: "Absent", cheie: "absente", latime: 10 },
      { antet: "Din câte", cheie: "dinCate", latime: 11 },
      {
        antet: "% prezență",
        cheie: "procent",
        latime: 12,
        format: "procent",
        ton: TON.procent,
      },
    ],
    /*
      Cele două capete ale listei, într-o singură foaie: mai întâi cei rari,
      pentru că de la ei începe treaba, apoi cei care n-au lipsit deloc.
    */
    randuri: [...s.deCautat, ...s.faraLipsa],
  });

  adaugaFoaieDespre(registru, {
    titlu: `Statistici · ${perioadaLizibila(deLa, panaLa)}`,
    detalii: [
      { eticheta: "Descărcat de", valoare: lider.nume },
      { eticheta: "Când", valoare: momentLizibil(new Date()) },
      { eticheta: "Perioada", valoare: `${deLa} - ${panaLa}` },
      {
        eticheta: "Grupe",
        valoare: grupaAleasa
          ? (grupele.find((g) => g.id === grupaAleasa)?.nume ?? "-")
          : grupaIds === undefined
            ? "toate"
            : grupele.map((g) => g.nume).join(", "),
      },
      { eticheta: "Întâlniri", valoare: String(s.rezumat.intalniri) },
      {
        eticheta: "Cum se socotesc procentele",
        valoare:
          "Doar pe membri. Musafirii se numără separat, dar nu intră în medii.",
      },
    ],
    legenda: [
      { ton: "bine", text: "prezență peste 80%" },
      { ton: "atentie", text: "prezență între 50 și 80%" },
      { ton: "slab", text: "prezență sub 50%" },
    ],
  });

  const continut = await registru.xlsx.writeBuffer();
  await scrieAudit(lider.id, "export:statistici", {
    deLa,
    panaLa,
    grupaId: grupaAleasa ?? "toate",
    intalniri: s.rezumat.intalniri,
  });

  return new NextResponse(continut as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="puls-statistici-${deLa}_${panaLa}-${dataAzi()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

function citesteData(brut: string | null): string | undefined {
  return brut && esteDataValida(brut) ? brut : undefined;
}
