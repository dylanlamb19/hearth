"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home, Sparkles, Users, MessageCircle, UsersRound, Calendar,
  Store, Clapperboard, Film, Bell, Bookmark, UserRound, Search, Menu, X, LogOut, Settings,
} from "lucide-react";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/moments", label: "Moments", icon: Sparkles },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/people", label: "People", icon: Search },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/groups", label: "Groups", icon: UsersRound },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/clips", label: "Clips", icon: Film },
  { href: "/videos", label: "Videos", icon: Clapperboard },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 text-ink-500">
        Warming the room…
      </div>
    );
  }

  const NavLinks = (
    <nav className="flex flex-col gap-1 p-3">
      <div className="mb-3 flex items-center gap-3 rounded-2xl bg-cream-100 px-3 py-3">
        <Avatar name={user.name} />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{user.name}</p>
          <p className="truncate text-xs text-ink-400">@{user.handle}</p>
        </div>
      </div>
      {nav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
              active ? "bg-cream-200 font-medium text-ink-900" : "text-ink-600 hover:bg-cream-100",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => {
          logout();
          router.push("/");
        }}
        className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-ink-600 hover:bg-cream-100"
      >
        <LogOut className="h-5 w-5" /> Sign out
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="sticky top-0 z-30 border-b border-ink-100/80 bg-cream-100/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button type="button" className="rounded-full p-2 text-ink-600 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
          <div className="relative mx-auto hidden w-full max-w-md md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              placeholder="Search Hearth"
              className="w-full rounded-full border-0 bg-white py-2.5 pl-10 pr-4 text-sm shadow-soft ring-1 ring-ink-100 placeholder:text-ink-400 focus:ring-2 focus:ring-ember-300"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  router.push("/people");
                }
              }}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/messages" className="rounded-full p-2 text-ink-600 hover:bg-cream-200" aria-label="Messages">
              <MessageCircle className="h-5 w-5" />
            </Link>
            <Link href="/notifications" className="rounded-full p-2 text-ink-600 hover:bg-cream-200" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Link>
            <Link href="/profile" className="rounded-full p-1 hover:bg-cream-200" aria-label="Profile">
              <Avatar name={user.name} size="sm" />
            </Link>
            <Link href="/help" className="hidden rounded-full p-2 text-ink-600 hover:bg-cream-200 sm:inline-flex" aria-label="Settings help">
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl border border-ink-100 bg-white shadow-card">{NavLinks}</div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink-950/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(100%,20rem)] overflow-y-auto bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-ink-500" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {NavLinks}
          </div>
        </div>
      )}
    </div>
  );
}
