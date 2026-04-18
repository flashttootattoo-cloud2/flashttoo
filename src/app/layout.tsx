import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/client-providers";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/install-prompt";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flashttoo – Descubrí tatuadores y diseños flash",
  description:
    "La plataforma para tatuadores que quieren mostrar su galería flash y conectar con clientes.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/Icono-512.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Flashttoo",
  },
  openGraph: {
    title: "Flashttoo – Descubrí tatuadores y diseños flash",
    description:
      "La plataforma para tatuadores que quieren mostrar su galería flash y conectar con clientes.",
    siteName: "Flashttoo",
    images: [{ url: "/logo.png", width: 512, height: 512 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Flashttoo – Descubrí tatuadores y diseños flash",
    description:
      "La plataforma para tatuadores que quieren mostrar su galería flash y conectar con clientes.",
    images: ["/logo.png"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#f0ff42",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${geist.className} bg-zinc-950 text-white antialiased`}>
        <ClientProviders>
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </ClientProviders>
        <InstallPrompt />
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
