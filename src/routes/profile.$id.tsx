import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Star } from "lucide-react";
import { timeAgo } from "@/lib/marketplace";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/$id")({
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const [{ data: profile }, { data: listings }, { data: reviews }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("listings")
          .select("id,title,price,condition,city,cover_image,created_at")
          .eq("seller_id", id)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("id,rating,comment,reviewer_id,created_at")
          .eq("reviewee_id", id)
          .order("created_at", { ascending: false }),
      ]);

      const reviewerIds = (reviews ?? []).map((r) => r.reviewer_id);
      let reviewerProfiles: Record<string, { display_name: string; avatar_url: string | null }> = {};
      if (reviewerIds.length > 0) {
        const { data: rp } = await supabase
          .from("profiles")
          .select("id,display_name,avatar_url")
          .in("id", reviewerIds);
        reviewerProfiles = Object.fromEntries((rp ?? []).map((p) => [p.id, p]));
      }

      const ratings = reviews ?? [];
      const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null;
      return {
        profile,
        listings: (listings ?? []) as ListingCardData[],
        reviews: ratings,
        reviewerProfiles,
        avg,
      };
    },
  });

  const myReview = data?.reviews.find((r) => r.reviewer_id === user?.id);
  const isOwnProfile = user?.id === id;
  const [rating, setRating] = useState(myReview?.rating ?? 5);
  const [comment, setComment] = useState(myReview?.comment ?? "");

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const payload = {
        reviewer_id: user.id,
        reviewee_id: id,
        rating,
        comment: comment.trim().slice(0, 1000),
      };
      const { error } = await supabase.from("reviews").upsert(payload, { onConflict: "reviewer_id,reviewee_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review saved");
      qc.invalidateQueries({ queryKey: ["profile", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="max-w-5xl mx-auto w-full px-4 py-12 animate-pulse">
          <div className="h-32 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="max-w-3xl mx-auto w-full px-4 py-20 text-center">
          <h1 className="text-2xl font-medium mb-2">User not found</h1>
          <Link to="/browse" className="text-brand hover:underline">Browse listings</Link>
        </div>
      </div>
    );
  }

  const { profile, listings, reviews, reviewerProfiles, avg } = data;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="bg-card rounded-2xl ring-1 ring-black/5 p-8 mb-10">
          <div className="flex items-center gap-5">
            <div className="size-20 rounded-full bg-muted overflow-hidden grid place-items-center shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-medium text-muted-foreground">
                  {profile.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-medium">{profile.display_name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                {avg !== null ? (
                  <>
                    <Star className="size-4 fill-amber-500 text-amber-500" />
                    <span className="font-medium text-foreground">{avg.toFixed(1)}</span>
                    <span>· {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
                  </>
                ) : (
                  <span>No reviews yet</span>
                )}
                {profile.city && <span>· {profile.city}</span>}
              </div>
              {profile.bio && <p className="text-sm text-muted-foreground mt-3 max-w-prose">{profile.bio}</p>}
            </div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-medium mb-6">Active listings</h2>
          {listings.length === 0 ? (
            <p className="text-muted-foreground">No active listings.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-medium mb-6">Reviews</h2>

          {!isOwnProfile && user && (
            <div className="bg-card rounded-2xl ring-1 ring-black/5 p-6 mb-6">
              <h3 className="font-medium mb-3">{myReview ? "Update your review" : "Leave a review"}</h3>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} type="button" aria-label={`${n} stars`}>
                    <Star
                      className={
                        "size-6 " +
                        (n <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground")
                      }
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Share your experience..."
                className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:ring-2 ring-brand/20 outline-none"
              />
              <button
                onClick={() => submitReview.mutate()}
                disabled={submitReview.isPending}
                className="mt-3 h-10 rounded-lg bg-brand text-brand-foreground px-4 text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {submitReview.isPending ? "Saving..." : myReview ? "Update review" : "Submit review"}
              </button>
            </div>
          )}

          {!user && !isOwnProfile && (
            <div className="bg-card rounded-2xl ring-1 ring-black/5 p-6 mb-6 text-sm text-muted-foreground">
              <Link to="/auth" className="text-brand font-medium hover:underline">
                Sign in
              </Link>{" "}
              to leave a review.
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => {
                const reviewer = reviewerProfiles[r.reviewer_id];
                return (
                  <div key={r.id} className="bg-card rounded-2xl ring-1 ring-black/5 p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="size-8 rounded-full bg-muted overflow-hidden grid place-items-center text-xs font-medium">
                        {reviewer?.avatar_url ? (
                          <img src={reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          reviewer?.display_name.charAt(0).toUpperCase() ?? "?"
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{reviewer?.display_name ?? "User"}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={"size-3.5 " + (n <= r.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground")}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-foreground/90 leading-relaxed">{r.comment}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
