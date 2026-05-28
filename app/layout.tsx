import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EzyGo | Fast & Reliable Courier Delivery",
    template: "%s | EzyGo",
  },
  description:
    "EzyGo is a fast, reliable, and affordable courier and parcel delivery service across Cape Town.",
  keywords: ["courier", "delivery", "parcel", "Cape Town", "logistics"],
  authors: [{ name: "EzyGo" }],
  openGraph: {
    title: "EzyGo — Fast & Reliable Courier Delivery",
    description: "Send parcels across Cape Town with ease.",
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
        className={`${inter.variable} font-sans antialiased transition-colors duration-300`}
        style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)" }}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
