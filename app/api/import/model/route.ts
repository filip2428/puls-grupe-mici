import { NextResponse } from "next/server";

import { ceruteAdmin } from "@/lib/auth/sesiune";
import { fisierModel } from "@/lib/import-pulsisti";
import { toateGrupele } from "@/lib/interogari/lideri";

/** Fișierul-model pentru importul pulsiștilor. */
export async function GET() {
  await ceruteAdmin();

  const grupe = await toateGrupele();
  const continut = await fisierModel(
    grupe.filter((g) => g.activa).map((g) => ({ id: g.id, nume: g.nume })),
  );

  return new NextResponse(new Uint8Array(continut), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="model-import-pulsisti.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
