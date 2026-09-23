import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { anArhivat } from "@/lib/arhiva";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { ETICHETE_STARE } from "@/lib/citire";
import { TON, adaugaFoaie, adaugaFoaieDespre } from "@/lib/excel";
import { dataNumerica, momentLizibil } from "@/lib/util/date";
import { etichetaClasa } from "@/lib/util/etichete";

/** Un an arhivat, în Excel: rezumatul, grupele, pulsiștii, cititul și planul. */
export async function GET(
  _cerere: Request,
  { params }: RouteContext<"/api/export/an/[id]">,
) {
  await ceruteAdmin();
  const { id } = await params;
  const an = await anArhivat(Number(id));
  if (!an) return NextResponse.json({ eroare: "Nu există." }, { status: 404 });
  const { f } = an;
  const s = f.statistici;

  const registru = new ExcelJS.Workbook();
  registru.creator = "Puls · Grupe mici";

  adaugaFoaie(registru, {
    nume: "Grupe",
    inghetate: 1,
    coloane: [
      { antet: "Grupa", cheie: "nume", latime: 22 },
      { antet: "Lideri", cheie: "lideri", latime: 30, rupeTextul: true },
      { antet: "Întâlniri", cheie: "intalniri", latime: 10 },
      { antet: "Membri", cheie: "membri", latime: 10 },
      { antet: "Musafiri", cheie: "musafiri", latime: 10 },
      { antet: "Media prezenți", cheie: "medie", latime: 14 },
      { antet: "% prezență", cheie: "procent", latime: 12, format: "procent", ton: TON.procent },
    ],
    randuri: s.peGrupe.map((g) => ({
      nume: g.nume,
      lideri: f.grupe.find((x) => x.id === g.grupaId)?.lideri.join(", ") ?? "",
      intalniri: g.intalniri,
      membri: g.membri,
      musafiri: g.musafiri,
      medie: g.prezentiInMedie,
      procent: g.procent,
    })),
  });

  adaugaFoaie(registru, {
    nume: "Pulsiști",
    inghetate: 1,
    coloane: [
      { antet: "Nume", cheie: "nume", latime: 26 },
      { antet: "Grupa", cheie: "grupa", latime: 20 },
      { antet: "Clasa (atunci)", cheie: "clasa", latime: 14 },
      { antet: "Statut", cheie: "statut", latime: 10, ton: TON.statut },
      { antet: "Întâlniri", cheie: "intalniri", latime: 10 },
      { antet: "Prezent", cheie: "prezente", latime: 10 },
      { antet: "A anunțat", cheie: "anuntate", latime: 10 },
      { antet: "Absent", cheie: "absente", latime: 10 },
      { antet: "% prezență", cheie: "procent", latime: 12, format: "procent", ton: TON.procent },
      { antet: "Zile citite", cheie: "citite", latime: 11 },
      { antet: "Zile cerute din plan", cheie: "asteptate", latime: 14 },
      { antet: "Citit", cheie: "citit", latime: 16 },
    ],
    randuri: [...f.pulsisti]
      .sort((a, b) => a.nume.localeCompare(b.nume, "ro"))
      .map((p) => ({
        nume: p.nume,
        grupa: p.grupa ?? "",
        clasa: etichetaClasa(p.clasa),
        statut: p.status,
        intalniri: p.intalniri,
        prezente: p.prezente,
        anuntate: p.anuntate,
        absente: p.absente,
        procent: p.procent,
        citite: p.citit?.citite ?? null,
        asteptate: p.citit?.asteptate ?? null,
        citit: p.citit ? ETICHETE_STARE[p.citit.stare] : "",
      })),
  });

  adaugaFoaie(registru, {
    nume: "Pe luni",
    coloane: [
      { antet: "Luna", cheie: "nume", latime: 18 },
      { antet: "Întâlniri", cheie: "intalniri", latime: 10 },
      { antet: "Media prezenți", cheie: "medie", latime: 14 },
      { antet: "% prezență", cheie: "procent", latime: 12, format: "procent", ton: TON.procent },
    ],
    randuri: s.peLuni.map((l) => ({
      nume: l.nume,
      intalniri: l.intalniri,
      medie: l.prezentiInMedie,
      procent: l.procent,
    })),
  });

  if (f.plan.length > 0) {
    adaugaFoaie(registru, {
      nume: "Planul de citire",
      coloane: [
        { antet: "Data", cheie: "data", latime: 14, format: "data" },
        { antet: "Plan", cheie: "portiune", latime: 30 },
      ],
      randuri: f.plan,
    });
  }

  adaugaFoaieDespre(registru, {
    titlu: `Anul bisericesc ${f.nume}`,
    detalii: [
      { eticheta: "Perioada", valoare: `${dataNumerica(f.deLa)} - ${dataNumerica(f.panaLa)}` },
      { eticheta: "Arhivat", valoare: `${momentLizibil(an.creatLa)}${an.creatDe ? `, de ${an.creatDe}` : ""}` },
      { eticheta: "Întâlniri", valoare: String(s.rezumat.intalniri) },
      { eticheta: "Prezență medie", valoare: s.rezumat.procent !== null ? `${s.rezumat.procent}%` : "-" },
      { eticheta: "Pulsiști", valoare: String(s.rezumat.membri) },
      { eticheta: "Musafiri", valoare: String(s.rezumat.musafiri) },
      { eticheta: "Primiți în grupă", valoare: String(s.rezumat.primitiInGrupa) },
      { eticheta: "Botezuri", valoare: String(s.rezumat.botezuri) },
      { eticheta: "Slujiri", valoare: String(s.rezumat.slujiri) },
      {
        eticheta: "Citit în medie",
        valoare: f.citire.total.procentMediu !== null ? `${f.citire.total.procentMediu}%` : "-",
      },
      {
        eticheta: "Au ieșit din Puls",
        valoare: f.schimbari.auIesit.length ? f.schimbari.auIesit.join(", ") : "nimeni",
      },
    ],
  });

  const continut = await registru.xlsx.writeBuffer();
  return new NextResponse(continut as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="puls-an-${f.nume}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
