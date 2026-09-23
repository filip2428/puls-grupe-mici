import { NextResponse } from "next/server";

import { scrieAudit } from "@/lib/audit";
import { ceruteAdmin } from "@/lib/auth/sesiune";
import { faCopie } from "@/lib/copie";

export const dynamic = "force-dynamic";

/** Copia de siguranță a întregii baze de date, ca fișier de descărcat. */
export async function GET() {
  const admin = await ceruteAdmin();
  const { nume, continut, rezumat } = await faCopie();
  await scrieAudit(admin.id, "copie:descarcata", {
    randuri: rezumat.totalRanduri,
    marime: continut.length,
  });

  return new NextResponse(new Uint8Array(continut), {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${nume}"`,
      "Cache-Control": "no-store",
    },
  });
}
