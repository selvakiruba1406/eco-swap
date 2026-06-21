import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { formatPrice, timeAgo } from "@/lib/marketplace";
import { Star, MessageCircle, MapPin, ImageOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/listing/$id")({
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data: listing, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!listing) throw notFound();

      const [{ data: images }, { data: profile }, { data: reviews }] = await Promise.all([
        supabase.from("listing_images").select("*").eq("listing_id", id).order("sort_order"),
        supabase.from("profiles").select("*").eq("id", listing.seller_id).maybeSingle(),
        supabase.from("reviews").select("rating").eq("reviewee_id", listing.seller_id),
      ]);

      const ratings = reviews ?? [];
      const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null;

      return { listing, images: images ?? [], profile, avgRating: avg, reviewCount: ratings.length };
    },
  });

  const contactSeller = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!data) throw new Error("Listing not loaded");
      if (user.id === data.listing.seller_id) throw new Error("That's your own listing");

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", id)
        .eq("buyer_id", user.id)
        .maybeSingle();

      if (existing) return existing.id;

      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ listing_id: id, buyer_id: user.id, seller_id: data.listing.seller_id })
        .select("id")
        .single();
      if (error) throw error;
      return created.id;
    },
    onSuccess: (convId) => {
      navigate({ to: "/messages", search: { c: convId } as any });
    },
    onError: (e: Error) => {
      if (e.message === "Sign in required") {
        toast.info("Sign in to contact this seller");
        navigate({ to: "/auth" });
      } else {
        toast.error(e.message);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 aspect-square bg-muted rounded-2xl" />
            <div className="lg:col-span-5 space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="max-w-3xl mx-auto w-full px-4 py-20 text-center">
          <h1 className="text-2xl font-medium mb-2">Listing not found</h1>
          <p className="text-muted-foreground mb-6">It may have been removed or sold.</p>
          <Link to="/browse" className="text-brand font-medium hover:underline">Browse all listings →</Link>
        </div>
      </div>
    );
  }

  const { listing, images, profile, avgRating, reviewCount } = data;
  const allImages = listing.cover_image
    ? [{ id: "cover", url: listing.cover_image, sort_order: -1, listing_id: id, created_at: "" }, ...images]
    : images;
  const mainImage = allImages[activeImg]?.url ?? listing.cover_image;
  const isOwn = user?.id === listing.seller_id;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center mb-6">
          ← Back to browse
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <div className="aspect-square w-full bg-zinc-100 rounded-2xl ring-1 ring-black/5 overflow-hidden grid place-items-center mb-4">
              {mainImage ? (
                <img src={mainImage} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <ImageOff className="size-12 text-zinc-400" />
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(i)}
                    className={
                      "size-20 shrink-0 rounded-lg overflow-hidden ring-1 transition " +
                      (i === activeImg ? "ring-brand ring-2" : "ring-black/10")
                    }
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8 bg-card rounded-2xl ring-1 ring-black/5 p-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Seller notes
              </h2>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {listing.description || "No additional details."}
              </p>
            </div>
          </div>

          <aside className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-card rounded-2xl ring-1 ring-black/5 p-6">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-medium leading-tight mb-1">
                    {listing.title}
                  </h1>
                  <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {listing.city} • Listed {timeAgo(listing.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-semibold text-brand">{formatPrice(listing.price)}</div>
                  <div className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-wider rounded border border-emerald-100 capitalize">
                    {listing.condition}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 text-xs text-muted-foreground mb-6">
                <span className="px-2 py-1 rounded-full bg-muted capitalize">{listing.category}</span>
                <span className="px-2 py-1 rounded-full bg-muted capitalize">{listing.status}</span>
              </div>

              {isOwn ? (
                <Link
                  to="/account"
                  className="block w-full py-3 px-4 bg-brand text-brand-foreground font-medium rounded-xl text-center hover:opacity-90"
                >
                  Manage your listing
                </Link>
              ) : listing.status !== "active" ? (
                <button disabled className="w-full py-3 px-4 bg-muted text-muted-foreground font-medium rounded-xl">
                  No longer available
                </button>
              ) : (
                <button
                  onClick={() => contactSeller.mutate()}
                  disabled={contactSeller.isPending}
                  className="w-full py-3 px-4 bg-brand text-brand-foreground font-medium rounded-xl hover:opacity-90 inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <MessageCircle className="size-4" />
                  {contactSeller.isPending ? "Opening chat..." : "Message seller"}
                </button>
              )}
            </div>

            {profile && (
              <Link
                to="/profile/$id"
                params={{ id: profile.id }}
                className="bg-card rounded-2xl ring-1 ring-black/5 p-6 hover:ring-brand/40 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-muted overflow-hidden grid place-items-center">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-medium text-muted-foreground">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{profile.display_name}</h4>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {avgRating !== null ? (
                        <>
                          <Star className="size-3.5 fill-amber-500 text-amber-500" />
                          <span>{avgRating.toFixed(1)}</span>
                          <span>({reviewCount} review{reviewCount === 1 ? "" : "s"})</span>
                        </>
                      ) : (
                        <span>No reviews yet</span>
                      )}
                    </div>
                    {profile.city && <p className="text-xs text-muted-foreground mt-0.5">{profile.city}</p>}
                  </div>
                </div>
              </Link>
            )}
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
