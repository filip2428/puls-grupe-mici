/**
 * Generează icoanele aplicației, pornind de la logo-ul din `app/icon.svg`.
 *
 * Rulezi `npm run icoane` doar dacă schimbi logo-ul. Fișierele rezultate se
 * pun în git, ca să nu fie nevoie de `sharp` la construirea aplicației.
 *
 * De ce mai multe variante:
 *  - Android cere PNG (192 și 512) și, separat, o variantă „maskable”: sistemul
 *    o taie în ce formă vrea el (cerc, pătrat rotunjit), deci fundalul trebuie
 *    să meargă până la margine;
 *  - iOS ignoră SVG-ul și rotunjește el colțurile, deci îi dăm un pătrat plin;
 *  - notificările pe Android folosesc o „insignă” mică, doar alb pe transparent.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const ALBASTRU = "#2b328d";
const LIME = "#c1d82f";

/** Litera P din logo, desenată în caroiajul de 512×512. */
const LITERA =
  "M170 132h96c58 0 96 34 96 88s-38 90-96 90h-38v70h-58V132zm58 130h34c24 0 38-15 38-40s-14-40-38-40h-34v80z";

/** Logo pe fundal plin, cu colțuri rotunjite sau drepte, după caz. */
function logo({ rotunjit }: { rotunjit: boolean }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512"${rotunjit ? ' rx="112"' : ""} fill="${ALBASTRU}"/>
  <path d="${LITERA}" fill="${LIME}"/>
</svg>`;
}

/** Insigna pentru notificări: Android păstrează doar forma, nu și culorile. */
const INSIGNA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path d="${LITERA}" fill="#ffffff"/>
</svg>`;

const radacina = path.join(import.meta.dirname, "..");
const inPublic = (nume: string) => path.join(radacina, "public", nume);

const deFacut: { sursa: string; catre: string; latura: number }[] = [
  // Android / manifest.
  { sursa: logo({ rotunjit: true }), catre: inPublic("icon-192.png"), latura: 192 },
  { sursa: logo({ rotunjit: true }), catre: inPublic("icon-512.png"), latura: 512 },
  // „Maskable”: fundalul merge până în colț, sistemul decupează cum vrea.
  {
    sursa: logo({ rotunjit: false }),
    catre: inPublic("icon-maskable-512.png"),
    latura: 512,
  },
  // iOS: pătrat plin, fără colțuri rotunjite (le face el).
  {
    sursa: logo({ rotunjit: false }),
    catre: path.join(radacina, "app", "apple-icon.png"),
    latura: 180,
  },
  // Insigna din bara de notificări.
  { sursa: INSIGNA, catre: inPublic("badge.png"), latura: 96 },
];

async function main() {
  await mkdir(path.join(radacina, "public"), { recursive: true });

  for (const { sursa, catre, latura } of deFacut) {
    const png = await sharp(Buffer.from(sursa))
      .resize(latura, latura)
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(catre, png);
    console.log(`${path.relative(radacina, catre)} - ${latura}px, ${png.length} bytes`);
  }
}

main();
