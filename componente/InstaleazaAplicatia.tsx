"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Îndrumarul de pus aplicația pe ecranul telefonului.
 *
 * Android arată singur un buton de instalare (evenimentul `beforeinstallprompt`),
 * așa că îl prindem și îl folosim. iPhone-ul nu are așa ceva: acolo omul
 * trebuie să apese Share și „Adaugă pe ecranul principal”, deci îi scriem pașii.
 *
 * Dacă aplicația e deja instalată, secțiunea dispare de tot.
 */

type EvenimentInstalare = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INTREBARE = "(display-mode: standalone)";

function aboneazaLaModAfisare(reactioneaza: () => void) {
  const interogare = window.matchMedia(INTREBARE);
  interogare.addEventListener("change", reactioneaza);
  return () => interogare.removeEventListener("change", reactioneaza);
}

const deschisaCaAplicatie = () => window.matchMedia(INTREBARE).matches;

/**
 * Pe server nu putem ști cum e deschisă aplicația. Spunem „ca aplicație”, ca
 * secțiunea să nu apară o clipă și apoi să dispară la cei care o au instalată.
 */
const peServer = () => true;

export function InstaleazaAplicatia() {
  const instalata = useSyncExternalStore(
    aboneazaLaModAfisare,
    deschisaCaAplicatie,
    peServer,
  );
  const [tocmaiInstalata, setTocmaiInstalata] = useState(false);
  const [invitatie, setInvitatie] = useState<EvenimentInstalare | null>(null);

  useEffect(() => {
    function prinde(eveniment: Event) {
      // Oprim bannerul implicit al browserului: îl arătăm noi, la locul lui.
      eveniment.preventDefault();
      setInvitatie(eveniment as EvenimentInstalare);
    }
    function gata() {
      setTocmaiInstalata(true);
    }

    window.addEventListener("beforeinstallprompt", prinde);
    window.addEventListener("appinstalled", gata);
    return () => {
      window.removeEventListener("beforeinstallprompt", prinde);
      window.removeEventListener("appinstalled", gata);
    };
  }, []);

  if (instalata || tocmaiInstalata) return null;

  const esteIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <section className="card p-4">
      <h2 className="mb-1 text-sm font-bold">Pune aplicația pe telefon</h2>
      <p className="mb-3 text-xs text-cenusiu">
        Se deschide cu o singură atingere, pe tot ecranul, fără bara de adrese.
        Nu se descarcă nimic din magazinul de aplicații.
      </p>

      {invitatie ? (
        <button
          type="button"
          className="buton buton-principal"
          onClick={async () => {
            await invitatie.prompt();
            const alegere = await invitatie.userChoice;
            if (alegere.outcome === "accepted") setTocmaiInstalata(true);
            setInvitatie(null);
          }}
        >
          Instalează aplicația
        </button>
      ) : esteIOS ? (
        <ol className="flex flex-col gap-1.5 text-sm">
          <li>
            <span className="font-medium">1.</span> Deschide aplicația în
            Safari. Din Chrome pe iPhone nu se poate.
          </li>
          <li>
            <span className="font-medium">2.</span> Apasă butonul de partajare,
            pătratul cu săgeata în sus, jos în mijloc.
          </li>
          <li>
            <span className="font-medium">3.</span> Coboară în listă și alege
            Adaugă pe ecranul principal.
          </li>
        </ol>
      ) : (
        <p className="text-sm text-cenusiu">
          Din meniul browserului, alege Instalează aplicația sau Adaugă pe
          ecranul principal.
        </p>
      )}
    </section>
  );
}
