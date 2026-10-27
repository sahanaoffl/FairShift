import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistrar } from "@/src/components/PwaRegistrar";

export const metadata: Metadata = {
  title: "FairShift — Fair work. Clear pay. Safer shifts.",
  description: "Transparent pay, safe reporting and healthier work for employee-intensive organisations.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#0f6a56", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<PwaRegistrar /></body></html>;
}
