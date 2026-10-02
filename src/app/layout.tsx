import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Carfam | Used cars in Rialto, CA (demo)", template: "%s | Carfam demo" },
  description:
    "Private demo of a redesigned Carfam website: used cars, trucks, SUVs, EVs and hybrids in Rialto, CA. Inventory is a captured snapshot, not live stock.",
  // Private demo: never indexed. Hosting-level protection is still required for any preview.
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  // Matches the graphite header the page opens on.
  themeColor: "#161616",
  // Lets env(safe-area-inset-*) report real values for the fixed bottom bars and notches.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
