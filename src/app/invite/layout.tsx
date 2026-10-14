import type { Metadata } from "next";

export const metadata: Metadata = { title: "You’re invited" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
