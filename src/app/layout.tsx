import type { Metadata } from "next";
import { Rubik, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CRM Lite | Meta & Email Hub",
  description: "Plataforma ligera para gestionar campañas de Meta y Email Marketing.",
  icons: {
    icon: '/img/icon.webp',
    shortcut: '/img/icon.webp',
    apple: '/img/icon.webp',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${rubik.variable} ${dmSans.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
