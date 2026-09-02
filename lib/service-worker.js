/**
 * Service worker-ul aplicației.
 *
 * Face două lucruri:
 *
 *  1. NOTIFICĂRI PE TELEFON. Primește mesajele trimise de server (vezi
 *     `lib/push.ts`) și le arată ca notificări de sistem, chiar dacă
 *     aplicația e închisă. La atingere, deschide pagina potrivită.
 *
 *  2. MERGE ȘI FĂRĂ SEMNAL. Ține în telefon fișierele aplicației și ultimele
 *     pagini vizitate, ca aplicația să se deschidă și în subsolul unde nu
 *     prinde net. Paginile salvate se șterg la ieșirea din cont, ca să nu
 *     vadă un lider datele altuia pe un telefon împrumutat.
 *
 * Regula la pagini e „întâi netul”: dacă e semnal, vezi mereu datele proaspete;
 * copia din telefon intră în joc doar când cererea eșuează.
 */

// Schimbă numărul dacă modifici fișierul: golește copiile vechi din telefoane.
const VERSIUNE = "v1";
const DULAP_FISIERE = `puls-fisiere-${VERSIUNE}`;
const DULAP_PAGINI = `puls-pagini-${VERSIUNE}`;

/** Pagina arătată când nu e semnal și n-avem copie salvată. */
const PAGINA_FARA_SEMNAL = "/fara-semnal";

self.addEventListener("install", (eveniment) => {
  eveniment.waitUntil(
    (async () => {
      const dulap = await caches.open(DULAP_FISIERE);
      // Le luăm una câte una: dacă vreuna nu se descarcă acum, service
      // worker-ul se instalează oricum, doar că îi lipsește fișierul acela.
      // `reload` ca să nu luăm cumva o variantă veche din memoria browserului.
      await Promise.all(
        [PAGINA_FARA_SEMNAL, "/icon-192.png", "/badge.png"].map((adresa) =>
          dulap.add(new Request(adresa, { cache: "reload" })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (eveniment) => {
  eveniment.waitUntil(
    (async () => {
      const nume = await caches.keys();
      await Promise.all(
        nume
          .filter((n) => n.startsWith("puls-") && !n.endsWith(VERSIUNE))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Ieșirea din cont: uităm paginile salvate, ca să nu rămână date pe telefon. */
self.addEventListener("message", (eveniment) => {
  if (eveniment.data?.tip === "uita-paginile") {
    eveniment.waitUntil(caches.delete(DULAP_PAGINI));
  }
});

/** Fișierele aplicației au adrese cu amprentă: dacă le avem, sunt bune. */
function esteFisierAplicatie(cale) {
  return (
    (cale.startsWith("/_next/static/") &&
      !cale.startsWith("/_next/static/service-worker/")) ||
    cale.endsWith(".png") ||
    cale.endsWith(".svg") ||
    cale === "/manifest.webmanifest"
  );
}

async function dinDulapAltfelDinNet(cerere, numeDulap) {
  const dulap = await caches.open(numeDulap);
  const salvat = await dulap.match(cerere);
  if (salvat) return salvat;

  const raspuns = await fetch(cerere);
  if (raspuns.ok) await dulap.put(cerere, raspuns.clone());
  return raspuns;
}

async function dinNetAltfelDinDulap(cerere) {
  const dulap = await caches.open(DULAP_PAGINI);
  try {
    const raspuns = await fetch(cerere);
    // Salvăm doar paginile adevărate. Redirectările (de obicei către ecranul
    // de intrare) n-au ce căuta în dulap.
    if (raspuns.ok && !raspuns.redirected) {
      await dulap.put(cerere, raspuns.clone());
    }
    return raspuns;
  } catch (eroare) {
    const salvat = await dulap.match(cerere);
    if (salvat) return salvat;
    const fisiere = await caches.open(DULAP_FISIERE);
    const faraSemnal = await fisiere.match(PAGINA_FARA_SEMNAL);
    if (faraSemnal) return faraSemnal;
    throw eroare;
  }
}

self.addEventListener("fetch", (eveniment) => {
  const cerere = eveniment.request;
  if (cerere.method !== "GET") return;

  const adresa = new URL(cerere.url);
  if (adresa.origin !== self.location.origin) return;
  // API-urile și ecranul de intrare vor mereu net proaspăt.
  if (adresa.pathname.startsWith("/api/")) return;
  if (adresa.pathname === "/intra") return;

  if (esteFisierAplicatie(adresa.pathname)) {
    eveniment.respondWith(dinDulapAltfelDinNet(cerere, DULAP_FISIERE));
    return;
  }

  if (cerere.mode === "navigate") {
    eveniment.respondWith(dinNetAltfelDinDulap(cerere));
  }
});

/** A venit o notificare de la server. */
self.addEventListener("push", (eveniment) => {
  if (!eveniment.data) return;

  let continut;
  try {
    continut = eveniment.data.json();
  } catch {
    continut = { titlu: "Puls", mesaj: eveniment.data.text() };
  }

  eveniment.waitUntil(
    self.registration.showNotification(continut.titlu ?? "Puls", {
      body: continut.mesaj ?? "",
      icon: "/icon-192.png",
      badge: "/badge.png",
      lang: "ro",
      // Aceeași etichetă înlocuiește notificarea veche în loc să se adune.
      tag: continut.eticheta ?? "puls",
      data: { link: continut.link ?? "/setari" },
    }),
  );
});

/** Liderul a atins notificarea: îl ducem unde trebuie. */
self.addEventListener("notificationclick", (eveniment) => {
  eveniment.notification.close();
  const link = eveniment.notification.data?.link ?? "/setari";

  eveniment.waitUntil(
    (async () => {
      const ferestre = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Dacă aplicația e deja deschisă, o aducem în față în loc s-o dublăm.
      for (const fereastra of ferestre) {
        if (new URL(fereastra.url).origin === self.location.origin) {
          await fereastra.focus();
          if ("navigate" in fereastra) await fereastra.navigate(link);
          return;
        }
      }
      await self.clients.openWindow(link);
    })(),
  );
});
