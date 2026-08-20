import "./globals.css";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_KEY } from "@/lib/storage-keys";
import { IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import type { Metadata, Viewport } from "next";

// Serifa da PROSA — inalterada. Enunciado, comentário e alternativas continuam
// aqui; só o chrome virou mono.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

// Mono do CHROME. Mesma superfamília do Plex Sans que saiu, então a métrica e o
// desenho continuam familiares; `latin` cobre a acentuação pt-BR.
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "KrosMed",
  description: "Banco adaptativo de questões e revisão inteligente para residência médica",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260311k6", type: "image/x-icon" },
      { url: "/icon-32.png?v=20260311k6", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png?v=20260311k6", type: "image/png", sizes: "192x192" },
    ],
    shortcut: [{ url: "/favicon.ico?v=20260311k6", type: "image/x-icon" }],
    apple: [{ url: "/apple-touch-icon.png?v=20260311k6", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "KrosMed",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#B8B8AE" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0C08" },
  ],
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

// Anti-FOUC. `ThemeProvider` so aplica a classe no `useEffect`, entao quem usa
// tema escuro via a pagina nascer clara e piscar para escuro a cada entrada.
// Este script roda antes da primeira pintura.
//
// A condicao e' a MESMA de `ThemeProvider` (`saved === "dark" || (!saved &&
// prefersDark)`), e a chave vem da constante em vez de literal — foi assim que
// a primeira versao disto saiu errada, apontando para uma chave inexistente e
// piscando ao contrario.
const THEME_BOOTSTRAP = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${sourceSerif.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="bg-paper">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
