import type { Metadata } from "next";

export const metadata: Metadata = { title: "Join Hearth" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
