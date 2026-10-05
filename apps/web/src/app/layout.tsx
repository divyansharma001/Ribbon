import type { Metadata, Viewport } from "next";
import { Inter, Literata, Nunito } from "next/font/google";
import { getThemeCookie } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  style: ["normal", "italic"],
  display: "swap",
});
const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Ribbon", template: "%s · Ribbon" },
  description: "Read, remember, and never lose your place.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getThemeCookie();
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${inter.variable} ${literata.variable} ${nunito.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-bg text-text">{children}</body>
    </html>
  );
}
