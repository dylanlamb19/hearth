import Link from "next/link";
import { Logo } from "./Logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-ink-100 bg-cream-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <div className="flex flex-wrap gap-4 text-sm text-ink-500">
          <Link href="/about" className="hover:text-ink-800">About</Link>
          <Link href="/help" className="hover:text-ink-800">Help</Link>
          <Link href="/pricing" className="hover:text-ink-800">Pricing</Link>
          <Link href="/terms" className="hover:text-ink-800">Terms</Link>
          <Link href="/privacy" className="hover:text-ink-800">Privacy</Link>
        </div>
        <p className="text-xs text-ink-400">A quieter social network for people you already know.</p>
      </div>
    </footer>
  );
}
