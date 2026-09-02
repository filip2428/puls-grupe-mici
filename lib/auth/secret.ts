import "server-only";

/**
 * Secretul cu care semnăm sesiunile (cookie-ul de autentificare) și cu care
 * anonimizăm IP-urile. Se pune în fișierul .env.local (dezvoltare) sau în
 * variabilele de mediu ale găzduirii (producție).
 *
 * Dacă îl schimbi, toți liderii sunt deconectați - dar codurile lor rămân bune.
 */
let cachedKey: Uint8Array | null = null;

export function secretulAplicatiei(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "Lipsește AUTH_SECRET (minim 32 de caractere). Rulează `npm run pregatire` sau adaugă-l în .env.local.",
    );
  }
  return secret;
}

export function cheieSemnatura(): Uint8Array {
  if (!cachedKey) {
    cachedKey = new TextEncoder().encode(secretulAplicatiei());
  }
  return cachedKey;
}
