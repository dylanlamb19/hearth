import Link from "next/link";
import { Logo } from "./Logo";

export function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
      <Logo />
      <nav className="hidden items-center gap-6 text-sm text-ink-600 md:flex">
        <Link href="/about" className="hover:text-ink-900">About</Link>
        <Link href="/pricing" className="hover:text-ink-900">Pricing</Link>
        <Link href="/help" className="hover:text-ink-900">Help</Link>
      </nav>
      <Link
        href="/login"
        className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-700 underline-offset-4 hover:text-ink-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300"
      >
        Sign in
      </Link>
    </header>
  );
}
