import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nu anunțăm lumii cu ce e făcută aplicația.
  poweredByHeader: false,

  experimental: {
    /**
     * Când pică netul, Next nu mai aruncă eroare: ține cererea în așteptare și
     * o repetă singur când revine semnalul. Practic, dacă liderul bifează
     * prezența într-un subsol fără semnal, bifa pleacă singură mai târziu.
     * Tot de aici vine și `useOffline()`, folosit de bara de sus.
     */
    useOffline: true,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Fișierele sunt luate ca ce spune serverul, nu ca ce ghicește browserul.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nimeni nu poate încadra aplicația într-un iframe pe alt site.
          { key: "X-Frame-Options", value: "DENY" },
          // Nu trimitem adresa paginii curente către alte site-uri.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nu ne trebuie camera, microfonul sau locația.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
