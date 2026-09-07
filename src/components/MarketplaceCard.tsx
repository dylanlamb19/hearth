import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Listing, personById } from "@/data/seed";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ReportMenu } from "./ReportMenu";

export function MarketplaceCard({ listing }: { listing: Listing }) {
  const seller = personById(listing.sellerId);
  return (
    <article className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
      <div className="relative aspect-[4/3] bg-cream-200">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover"
          sizes="(max-width:768px) 100vw, 33vw"
          unoptimized
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-ink-900">{listing.title}</h3>
            <p className="mt-1 text-lg font-semibold text-ember-600">${listing.price}</p>
          </div>
          <ReportMenu subject={seller?.name ?? listing.title} subjectId={listing.sellerId} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <span className="rounded-full bg-cream-200 px-2.5 py-1 text-ink-700">{listing.condition}</span>
          <span>{listing.distance}</span>
          <span>·</span>
          <span>{listing.postedAt}</span>
        </div>
        <p className="mt-3 text-sm text-ink-600">{listing.description}</p>
        {seller && (
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
            <Avatar name={seller.name} size="sm" />
            <p className="min-w-0 truncate">
              <span className="text-ink-500">{seller.name}</span>
              <span className="mx-1">·</span>
              @{seller.handle}
            </p>
          </div>
        )}
        <div className="mt-4">
          <Button variant="secondary" href="/messages" className="w-full">
            Message
          </Button>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-cream-100 px-3 py-2.5 text-xs text-ink-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ember-500" aria-hidden />
          <p>Meet in public if you can — trust your gut.</p>
        </div>
      </div>
    </article>
  );
}
