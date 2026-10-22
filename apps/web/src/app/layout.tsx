import "./globals.css";
import type { Metadata, Viewport } from "next";
import { headers } from 'next/headers';
import { Manrope } from "next/font/google";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";
import OfflineBanner from "@/components/common/OfflineBanner";
import PageTransition from "@/components/common/PageTransition";
import InAppBrowserPrompt from "@/components/common/InAppBrowserPrompt";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cdm-body",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0F1724",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "CdM LMS — Colegio de Montalban",
  description:
    "The official Learning Management System of Colegio de Montalban, Rodriguez, Rizal. Access ICS/ITE and IBE programs.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CdM LMS",
    
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers(); // Nonces require a fresh server render for every document.
  return (
    <html lang="en" className={manrope.variable} data-scroll-behavior="smooth">
      <body className="antialiased">
        <OfflineBanner />
        <InAppBrowserPrompt />
        <ServiceWorkerRegister />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
