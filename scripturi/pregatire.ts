/**
 * `npm run pregatire`
 *
 * Pregătește aplicația pentru prima pornire:
 *  1. creează fișierul .env.local (cu un secret nou pentru sesiuni);
 *  2. creează baza de date locală și tabelele;
 *  3. creează primul administrator și îți arată codul lui de acces.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import webpush from "web-push";

const radacina = process.cwd();
const caleEnv = resolve(radacina, ".env.local");

function scrieEnv() {
  const chei = webpush.generateVAPIDKeys();

  if (existsSync(caleEnv)) {
    let continut = readFileSync(caleEnv, "utf8");
    const adaugate: string[] = [];

    if (!continut.includes("AUTH_SECRET=")) {
      continut += `\nAUTH_SECRET=${randomBytes(48).toString("base64url")}\n`;
      adaugate.push("AUTH_SECRET");
    }
    if (!continut.includes("VAPID_PRIVATE_KEY=")) {
      continut += [
        "",
        "# Notificările pe telefon. Pentru producție generează altele:",
        "#   npm run chei:push",
        `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${chei.publicKey}`,
        `VAPID_PRIVATE_KEY=${chei.privateKey}`,
        "",
      ].join("\n");
      adaugate.push("cheile pentru notificări");
    }

    if (adaugate.length === 0) {
      console.log("• .env.local există deja - îl las neatins.");
      return;
    }
    writeFileSync(caleEnv, continut, "utf8");
    console.log(`• Am adăugat în .env.local: ${adaugate.join(", ")}.`);
    return;
  }

  const continut = [
    "# Adresa bazei de date.",
    "# Dezvoltare (pe calculatorul tău): un fișier local.",
    "# Producție (Turso): libsql://numele-bazei-....turso.io + DATABASE_AUTH_TOKEN",
    "DATABASE_URL=file:./local.db",
    "# DATABASE_AUTH_TOKEN=",
    "",
    "# Secretul cu care se semnează sesiunile. Nu îl publica nicăieri.",
    `AUTH_SECRET=${randomBytes(48).toString("base64url")}`,
    "",
    "# Notificările pe telefon. Pentru producție generează altele:",
    "#   npm run chei:push",
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${chei.publicKey}`,
    `VAPID_PRIVATE_KEY=${chei.privateKey}`,
    "",
  ].join("\n");
  writeFileSync(caleEnv, continut, "utf8");
  console.log("• Am creat .env.local.");
}

function ruleaza(comanda: string, argumente: string[]) {
  execFileSync(comanda, argumente, { stdio: "inherit", shell: true });
}

scrieEnv();

console.log("• Creez tabelele în baza de date...");
ruleaza("npm", ["run", "db:migrate"]);

console.log("• Creez primul administrator...");
ruleaza("npm", ["run", "lider:nou", "--", "--nume", "Administrator", "--rol", "admin"]);

console.log("\nGata. Pornește aplicația cu:  npm run dev");
