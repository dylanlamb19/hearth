import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/Button";

const features = [
  { title: "A quieter feed", body: "Posts, photos, video, and comments from people you actually chose." },
  { title: "Moments", body: "Photos that last a day. Enough time to see them, not enough to archive them." },
  { title: "Friends, for real", body: "Requests, suggestions, and a contacts list that stays on the side of the room." },
  { title: "Chat", body: "One-to-one messages. No rooms, no noise." },
  { title: "Groups & events", body: "Cooking clubs, trail notes, listening rooms. RSVP and show up." },
  { title: "Market", body: "Bikes, skillets, stools, cuttings. Local and priced in dollars." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream-100">
      <PublicHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">A social network</p>
            <h1 className="mt-4 font-display text-5xl leading-tight text-ink-900 sm:text-6xl">Gather around.</h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-600">
              Hearth is a place for the people you already know — feed, friends, chat, groups, events, market, videos, and the small talk in between.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/signup" variant="primary">Continue with Google</Button>
              <Button href="/signup" variant="primary">Continue with X</Button>
              <Button href="/signup" variant="outline">Email instead</Button>
            </div>
            <p className="mt-4 text-sm text-ink-500">
              Already here? <Link href="/login" className="font-medium text-ink-800 underline-offset-2 hover:underline">Sign in</Link>
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-cream-300 shadow-soft">
            <Image
              src="https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1400&q=80"
              alt="A cozy picnic spread on linen in the grass"
              fill
              className="object-cover"
              priority
              unoptimized
              sizes="(max-width:1024px) 100vw, 50vw"
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="font-display text-3xl text-ink-900 sm:text-4xl">Everything a living room needs</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card">
                <h3 className="font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
