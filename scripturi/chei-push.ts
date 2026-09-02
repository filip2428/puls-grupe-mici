/**
 * Generează perechea de chei VAPID, necesară notificărilor pe telefon.
 *
 * Rulezi o singură dată, la început: `npm run chei:push`. Pui cele două linii
 * în `.env.local` (pentru calculatorul tău) și în setările proiectului de pe
 * Vercel (pentru aplicația online).
 *
 * ATENȚIE: dacă schimbi cheile mai târziu, toate telefoanele abonate până
 * atunci nu mai primesc nimic și liderii trebuie să se aboneze din nou.
 */
import webpush from "web-push";

const chei = webpush.generateVAPIDKeys();

console.log("");
console.log("Pune liniile astea in .env.local si in setarile de pe Vercel:");
console.log("");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${chei.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${chei.privateKey}`);
console.log("");
console.log("Cheia privata NU se pune in git si nu se da nimanui.");
console.log("");
