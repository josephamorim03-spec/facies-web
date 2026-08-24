import "./globals.css";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_KEY } from "@/lib/storage-keys";
import { IBM_Plex_Mono, Instrument_Sans, Source_Serif_4 } from "next/font/google";
import type { Metadata, Viewport } from "next";

import { SITE_NAME, SITE_QUALIFICADOR, SITE_URL } from "@/lib/site";

// Serifa da PROSA — inalterada. Enunciado, comentário e alternativas continuam
// aqui; só o chrome virou mono.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

// Sans do CHROME. Humanista com caráter, não a Inter que todo mundo usa. Ela
// substitui a mono como fonte padrão da interface: no KROS/DOS o `sans` do
// Tailwind apontava para a mono de propósito, e era isso que dava a leitura de
// "ferramenta de dev" em vez de instrumento clínico.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

// Mono de DADO, e só: número, tempo, percentual. Deixou de vestir o chrome
// inteiro. `latin` cobre a acentuação pt-BR.
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  // Base para toda URL relativa de metadado. Sem ela o Next emite `og:image`
  // relativo, e raspador de link nao resolve caminho relativo — o cartao chega
  // sem imagem, o build passa, e so se descobre compartilhando.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_QUALIFICADOR}`,
    // O nome do produto NAO precisa ser o texto do titulo (§3.2): quem busca
    // digita "raio-x da prova USP". O template deixa a pagina liderar e mantem
    // a marca no fim, onde ela identifica sem competir.
    template: `%s · ${SITE_NAME}`,
  },
  description: "Inteligência de prova: como a sua prova cobra, e um plano que cabe na sua escala de plantão.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "pt_BR",
  },
  // `summary_large_image` e' o unico formato que mostra a imagem inteira; o
  // `summary` corta em quadrado, e a arte do funil e' uma tabela larga.
  twitter: { card: "summary_large_image" },
  // O `?v=` nao e supersticao: icone e o recurso que o navegador cacheia com
  // mais avidez, e trocar a arte sem trocar a URL deixa a marca antiga na aba
  // por semanas.
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260822f", type: "image/x-icon" },
      // O SVG vem primeiro para quem o suporta: a marca e geometria pura, entao
      // ela e nitida em qualquer densidade sem um PNG por tamanho.
      { url: "/facies-icone-solido.svg?v=20260822f", type: "image/svg+xml" },
      { url: "/icon-32.png?v=20260822f", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png?v=20260822f", type: "image/png", sizes: "192x192" },
    ],
    shortcut: [{ url: "/favicon.ico?v=20260822f", type: "image/x-icon" }],
    apple: [{ url: "/apple-touch-icon.png?v=20260822f", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Fácies",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // Os valores da folha de marca. Os anteriores (#B8B8AE / #0B0C08) eram do
  // e-ink e ja divergiam do `--color-paper` em vigor — a barra do navegador
  // pintava de uma cor que nao existia mais em nenhuma tela.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#096F63" },
    { media: "(prefers-color-scheme: dark)", color: "#131516" },
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
      className={`${sourceSerif.variable} ${instrumentSans.variable} ${ibmPlexMono.variable}`}
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
