import Image from "next/image";
import { Listing, personById } from "@/data/seed";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ListingIllustration } from "./ListingIllustration";
import { ReportMenu } from "./ReportMenu";

export function messageSellerHref(listing: Listing): string {
  const q = new URLSearchParams({ with: listing.sellerId, about: listing.title });
  return `/messages?${q.toString()}`;
}

export function MarketplaceCard({ listing }: { listing: Listing }) {
  const seller = personById(listing.sellerId);
  return (
    <article className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
      <div className="relative aspect-[4/3] bg-cream-200">
        {listing.illustration ? (
          <ListingIllustration kind={listing.illustration} label={listing.title} />
        ) : listing.image ? (
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 33vw"
            unoptimized
          />
        ) : null}
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
          <Button variant="secondary" href={messageSellerHref(listing)} className="w-full">
            Message
          </Button>
        </div>
      </div>
    </article>
  );
}
