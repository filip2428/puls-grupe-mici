import { NextResponse } from "next/server";

import { ceruteAdmin } from "@/lib/auth/sesiune";
import { fisierModelPlan } from "@/lib/import-plan-citire";

/** Fișierul-model pentru planul de citire a Bibliei. */
export async function GET() {
  await ceruteAdmin();

  const continut = await fisierModelPlan();
  return new NextResponse(new Uint8Array(continut), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="model-plan-citire.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
