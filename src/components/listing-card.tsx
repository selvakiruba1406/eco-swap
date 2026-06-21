import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/marketplace";
import { ImageOff } from "lucide-react";

export type ListingCardData = {
  id: string;
  title: string;
  price: number | string;
  condition: string;
  city: string;
  cover_image: string | null;
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className="group block"
    >
      <div className="w-full aspect-[4/5] bg-zinc-200 rounded-2xl outline-1 -outline-offset-1 outline-black/5 mb-4 overflow-hidden grid place-items-center">
        {listing.cover_image ? (
          <img
            src={listing.cover_image}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <ImageOff className="size-8 text-zinc-400" />
        )}
      </div>
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground truncate">{listing.title}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {listing.city} • <span className="capitalize">{listing.condition}</span>
          </p>
        </div>
        <span className="font-semibold text-brand whitespace-nowrap">{formatPrice(listing.price)}</span>
      </div>
    </Link>
  );
}
