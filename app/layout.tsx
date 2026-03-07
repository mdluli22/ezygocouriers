import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EzyGo — Fast & Reliable Courier Delivery",
    template: "%s | EzyGo",
  },
  description:
    "EzyGo is a fast, reliable, and affordable courier and parcel delivery service across South Africa.",
  keywords: ["courier", "delivery", "parcel", "South Africa", "logistics"],
  authors: [{ name: "EzyGo" }],
  openGraph: {
    title: "EzyGo — Fast & Reliable Courier Delivery",
    description: "Send parcels across South Africa with ease.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-white dark:bg-[#1A2F2F] text-slate-900 dark:text-slate-100 transition-colors duration-300`}
      >
        {children}
      </body>
    </html>
  );
}
