import Link from "next/link";
import { Logo } from "./Logo";
import { Button } from "./Button";

export function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
      <Logo />
      <nav className="hidden items-center gap-6 text-sm text-ink-600 md:flex">
        <Link href="/about" className="hover:text-ink-900">About</Link>
        <Link href="/pricing" className="hover:text-ink-900">Pricing</Link>
        <Link href="/help" className="hover:text-ink-900">Help</Link>
      </nav>
      <Button href="/login" variant="primary">Sign in</Button>
    </header>
  );
}
