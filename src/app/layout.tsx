import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Libre_Baskerville({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Hearth — Gather around.",
  description: "A quieter social network for the people you already know.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={sans.variable + " " + serif.variable + " font-sans antialiased"}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
