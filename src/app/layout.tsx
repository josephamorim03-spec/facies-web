import "./globals.css";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "KrosMed",
  description: "FSRS-6 + Planner",
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
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-paper">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
