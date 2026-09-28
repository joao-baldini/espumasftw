import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Espumas — Composições Valorant",
  description: "Composições, agentes e estratégias do time Espumas para cada mapa do campeonato.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
