import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "EzyGo Couriers",
  manifest: "/manifest.webmanifest",
  title: {
    default: "EzyGo",
    template: "%s | EzyGo",
  },
  description:
    "EzyGo is a fast, reliable, and affordable courier and parcel delivery service across Cape Town.",
  keywords: ["courier", "delivery", "parcel", "Cape Town", "logistics"],
  authors: [{ name: "EzyGo" }],
  icons: {
    icon: { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
    apple: "/EzyGoIcon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EzyGo",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "EzyGo",
    description: "Send parcels across Cape Town with ease.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2f4f4f" },
    { media: "(prefers-color-scheme: dark)", color: "#173d38" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased transition-colors duration-300`}
        style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)" }}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
