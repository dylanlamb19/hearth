import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

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
              A quieter place for the people you&rsquo;d invite over.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:items-start">
              <Link
                href="/signup"
                className="w-full rounded-full bg-ember-glow px-6 py-3 text-center font-medium text-white transition hover:bg-ember-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100 sm:w-auto"
              >
                Create your account
              </Link>
              <Link
                href="/login"
                className="text-center text-sm text-ink-600 underline-offset-2 hover:underline focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ember-300 sm:text-left"
              >
                I already have an account
              </Link>
              <p className="text-center text-xs text-ink-500 sm:text-left">Google and X sign-in coming soon.</p>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-cream-300 shadow-soft">
            {/*
              Photo: "Cozy living room with fireplace and two armchairs" by Clay Banks (@claybanks),
              https://unsplash.com/photos/lNai4YWMFMc. Free under the Unsplash License
              (https://unsplash.com/license); attribution not required. Cropped to 4:3, WebP.
            */}
            <Image
              src="/landing/hearth-living-room.webp"
              alt="A lamp-lit living room with a fire burning in a stone fireplace, two patterned armchairs and a wooden coffee table with flowers"
              fill
              className="object-cover"
              priority
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
