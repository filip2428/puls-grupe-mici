import type { MetadataRoute } from "next";

/**
 * Manifestul aplicației: cu el, liderii pot pune aplicația pe ecranul de start
 * al telefonului („Adaugă pe ecranul principal") și se deschide ca o aplicație,
 * fără bara de adrese.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Puls · Grupe mici",
    short_name: "Grupe mici",
    description: "Prezența la grupele mici din lucrarea cu adolescenții Puls.",
    lang: "ro",
    start_url: "/grupe",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef1f7",
    theme_color: "#2b328d",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
