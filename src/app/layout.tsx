import "./globals.css";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import type { Metadata, Viewport } from "next";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
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
  themeColor: "#f7f3ea",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${sourceSerif.variable} ${ibmPlexSans.variable}`}
    >
      <body className="bg-paper">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
