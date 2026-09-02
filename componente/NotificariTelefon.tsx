"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  aboneazaTelefon,
  dezaboneazaTelefon,
  notificareDeProba,
} from "@/app/(aplicatie)/setari/actions";
import { inregistreazaServiceWorker } from "@/componente/ServiceWorker";

/**
 * Pornirea notificărilor pe telefonul de pe care se apasă butonul.
 *
 * Ce se întâmplă, pas cu pas:
 *  1. browserul cere voie omului să afișeze notificări;
 *  2. dacă e de acord, cere o „adresă de livrare" de la Google / Apple / Mozilla;
 *  3. trimitem adresa la server, care de acum poate suna telefonul.
 *
 * Fiecare telefon se abonează separat - de aia butonul zice „telefonul ăsta".
 */

/** Cheia publică vine ca text; browserul o vrea ca șir de octeți. */
function cheieInOcteti(cheie: string): Uint8Array<ArrayBuffer> {
  const umplutura = "=".repeat((4 - (cheie.length % 4)) % 4);
  const curat = (cheie + umplutura).replace(/-/g, "+").replace(/_/g, "/");
  const brut = window.atob(curat);
  const octeti = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i++) octeti[i] = brut.charCodeAt(i);
  return octeti;
}

/** Un nume scurt pentru telefon, ca liderul să știe care e care în listă. */
function descrieTelefonul(): string {
  const ua = navigator.userAgent;
  const sistem = /iPhone|iPad|iPod/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Macintosh/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : "alt dispozitiv";
  const browser = /EdgA?\//.test(ua)
    ? "Edge"
    : /FxiOS|Firefox/.test(ua)
      ? "Firefox"
      : /CriOS|Chrome/.test(ua)
        ? "Chrome"
        : /Safari/.test(ua)
          ? "Safari"
          : "browser";
  return `${sistem} · ${browser}`;
}

type Stare =
  | "verific"
  | "nu-se-poate"
  | "trebuie-instalata"
  | "refuzat"
  | "oprit"
  | "pornit";

export function NotificariTelefon({
  cheiePublica,
}: {
  cheiePublica: string | null;
}) {
  const [stare, setStare] = useState<Stare>("verific");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [lucrez, incepe] = useTransition();

  /**
   * Află în ce stare e telefonul: poate primi notificări, i s-a cerut deja
   * voie, e deja abonat? Totul se citește din browser, deci abia după ce
   * pagina a ajuns pe telefon - pe server nu avem de unde ști.
   */
  const afla = useCallback(async (): Promise<{
    stare: Stare;
    endpoint: string | null;
  }> => {
    const sePoate =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    // Pe iPhone, notificările merg doar din aplicația pusă pe ecranul principal.
    const esteIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const instalata = window.matchMedia("(display-mode: standalone)").matches;

    if (esteIOS && !instalata) {
      return { stare: "trebuie-instalata", endpoint: null };
    }
    if (!sePoate) return { stare: "nu-se-poate", endpoint: null };
    if (Notification.permission === "denied") {
      return { stare: "refuzat", endpoint: null };
    }

    const inregistrare =
      (await navigator.serviceWorker.getRegistration()) ??
      (await inregistreazaServiceWorker());
    const abonament = await inregistrare?.pushManager.getSubscription();

    return {
      stare: abonament ? "pornit" : "oprit",
      endpoint: abonament?.endpoint ?? null,
    };
  }, []);

  useEffect(() => {
    let plecat = false;
    (async () => {
      try {
        const gasit = await afla();
        if (plecat) return;
        setStare(gasit.stare);
        setEndpoint(gasit.endpoint);
      } catch {
        if (!plecat) setStare("nu-se-poate");
      }
    })();
    return () => {
      plecat = true;
    };
  }, [afla]);

  function porneste() {
    setEroare(null);
    setMesaj(null);
    incepe(async () => {
      try {
        if (!cheiePublica) {
          setEroare("Notificările pe telefon nu sunt configurate pe server.");
          return;
        }

        const voie = await Notification.requestPermission();
        if (voie !== "granted") {
          setStare(voie === "denied" ? "refuzat" : "oprit");
          return;
        }

        await inregistreazaServiceWorker();
        const inregistrare = await navigator.serviceWorker.ready;
        const abonament = await inregistrare.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: cheieInOcteti(cheiePublica),
        });

        const raspuns = await aboneazaTelefon(
          JSON.parse(JSON.stringify(abonament)),
          descrieTelefonul(),
        );
        if (raspuns.eroare) {
          setEroare(raspuns.eroare);
          return;
        }
        setEndpoint(abonament.endpoint);
        setStare("pornit");
        setMesaj(raspuns.reusit ?? null);
      } catch {
        setEroare("N-am reușit să pornesc notificările. Mai încearcă o dată.");
      }
    });
  }

  function opreste() {
    setEroare(null);
    setMesaj(null);
    incepe(async () => {
      try {
        const inregistrare = await navigator.serviceWorker.ready;
        const abonament = await inregistrare.pushManager.getSubscription();
        const adresa = abonament?.endpoint ?? endpoint;
        await abonament?.unsubscribe();
        if (adresa) await dezaboneazaTelefon(adresa);
        setEndpoint(null);
        setStare("oprit");
        setMesaj("Am oprit notificările pe telefonul ăsta.");
      } catch {
        setEroare("N-am reușit să le opresc. Mai încearcă o dată.");
      }
    });
  }

  function proba() {
    setEroare(null);
    setMesaj(null);
    incepe(async () => {
      const raspuns = await notificareDeProba();
      if (raspuns.eroare) setEroare(raspuns.eroare);
      else setMesaj(raspuns.reusit ?? null);
    });
  }

  return (
    <div>
      {stare === "verific" && (
        <p className="text-sm text-cenusiu">Verific telefonul...</p>
      )}

      {stare === "nu-se-poate" && (
        <p className="text-sm text-cenusiu">
          Browserul ăsta nu poate primi notificări. Pe telefon, deschide
          aplicația din Chrome (Android) sau Safari (iPhone).
        </p>
      )}

      {stare === "trebuie-instalata" && (
        <p className="text-sm text-cenusiu">
          Pe iPhone, notificările merg doar dacă pui întâi aplicația pe ecranul
          principal. Vezi mai jos cum se face - durează zece secunde.
        </p>
      )}

      {stare === "refuzat" && (
        <p className="text-sm text-cenusiu">
          Notificările sunt blocate pentru aplicația asta. Se pornesc înapoi din
          setările telefonului, la aplicații sau la site-uri, unde apare
          Notificări.
        </p>
      )}

      {stare === "oprit" && (
        <>
          <p className="mb-3 text-sm text-cenusiu">
            Telefonul ăsta nu primește deocamdată notificări.
          </p>
          <button
            type="button"
            onClick={porneste}
            disabled={lucrez || !cheiePublica}
            className="buton buton-principal"
          >
            {lucrez ? "Un moment..." : "Pornește notificările aici"}
          </button>
        </>
      )}

      {stare === "pornit" && (
        <>
          <p className="mb-3 text-sm">
            <span className="font-medium">Telefonul ăsta primește notificări.</span>{" "}
            <span className="text-cenusiu">{descrieTelefonul()}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={proba}
              disabled={lucrez}
              className="buton buton-secundar buton-mic"
            >
              Trimite-mi una de probă
            </button>
            <button
              type="button"
              onClick={opreste}
              disabled={lucrez}
              className="buton buton-secundar buton-mic"
            >
              Oprește aici
            </button>
          </div>
        </>
      )}

      {mesaj && <p className="mt-3 text-sm text-albastru">{mesaj}</p>}
      {eroare && <p className="mt-3 text-sm text-red-700">{eroare}</p>}
    </div>
  );
}
