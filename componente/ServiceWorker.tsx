"use client";

import { useEffect } from "react";

/** Adresa fișierului, împachetat de Next. O folosesc și notificările. */
export function adresaServiceWorker(): URL {
  return new URL("../lib/service-worker.js", import.meta.url);
}

export function serviceWorkerDisponibil(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/** Înregistrează service worker-ul (o dată, la deschiderea aplicației). */
export async function inregistreazaServiceWorker() {
  if (!serviceWorkerDisponibil()) return null;
  return navigator.serviceWorker.register(adresaServiceWorker(), {
    scope: "/",
    updateViaCache: "none",
  });
}

/**
 * Pornește partea care face aplicația să meargă și fără semnal.
 *
 * Nu afișează nimic; stă în cadrul aplicației ca să se înregistreze o singură
 * dată, indiferent pe ce pagină intră liderul.
 */
export function ServiceWorker() {
  useEffect(() => {
    inregistreazaServiceWorker().catch(() => {
      // Fără service worker aplicația merge normal, doar nu și offline.
    });
  }, []);

  return null;
}

/**
 * Șterge paginile salvate în telefon.
 *
 * Se cheamă la ecranul de intrare: dacă liderul a ieșit din cont (sau i-a
 * expirat sesiunea), n-are rost să rămână datele lui în telefon - mai ales
 * dacă telefonul e împrumutat altcuiva.
 */
export function UitaPaginile() {
  useEffect(() => {
    if (!serviceWorkerDisponibil()) return;
    navigator.serviceWorker.ready
      .then((inregistrare) =>
        inregistrare.active?.postMessage({ tip: "uita-paginile" }),
      )
      .catch(() => {});
  }, []);

  return null;
}
