import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VCF System — PT. Industri Nabati Lestari",
  description:
    "Vehicle Control Form (VCF) Digital System — PT. Industri Nabati Lestari, Pabrik Minyak Goreng. No. Dokumen FM-BSHS-42/01",
  keywords: ["VCF", "vehicle control form", "INL", "industri nabati lestari", "keamanan pabrik"],
  authors: [{ name: "PT. Industri Nabati Lestari" }],
  icons: {
    icon: "/logo.svg",
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0a0e1a" />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
