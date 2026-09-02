import type { MetadataRoute } from "next";

/**
 * Manifestul aplicației: cu el, liderii pot pune aplicația pe ecranul de start
 * al telefonului („Adaugă pe ecranul principal") și se deschide ca o aplicație,
 * fără bara de adrese.
 *
 * Icoanele se generează cu `npm run icoane`. Cea „maskable" are fundalul până
 * în colț, pentru că Android o decupează în ce formă vrea el.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Puls · Grupe mici",
    short_name: "Grupe mici",
    description: "Prezența la grupele mici din lucrarea cu adolescenții Puls.",
    lang: "ro",
    start_url: "/grupe",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef1f7",
    theme_color: "#2b328d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Grupele mele", url: "/grupe" },
      { name: "Adolescenți", url: "/adolescenti" },
      { name: "Slujiri", url: "/slujiri" },
    ],
  };
}
