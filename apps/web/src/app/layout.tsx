import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";
import OfflineBanner from "@/components/common/OfflineBanner";
import PageTransition from "@/components/common/PageTransition";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0F1724",
};

export const metadata: Metadata = {
  title: "Lumina LMS — Colegio de Montalban",
  description:
    "The official Learning Management System of Colegio de Montalban, Rodriguez, Rizal. Access ICS/ITE and IBE programs.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lumina LMS",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-[family-name:var(--font-inter)] selection:bg-orange-500 selection:text-white">
        <OfflineBanner />
        <ServiceWorkerRegister />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}