import "./globals.css";
import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";
import OfflineBanner from "@/components/common/OfflineBanner";
import InAppBrowserPrompt from "@/components/common/InAppBrowserPrompt";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#FF7517",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "CdM LMS",
  description: "Next-Generation Higher Education Learning Management System",
  manifest: "/manifest.json",
  icons: {
    icon: "/logos/logo.png",
    apple: "/logos/logo.png",
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-orange-500 selection:text-white">
        <OfflineBanner />
        <InAppBrowserPrompt />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}