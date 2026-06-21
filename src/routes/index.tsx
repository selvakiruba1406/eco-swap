import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CategoryChips } from "@/components/category-chips";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import type { Category } from "@/lib/marketplace";
import { Search } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoSwap — A second life for unused electronics" },
      {
        name: "description",
        content:
          "Local marketplace where people sell unused phones, laptops, audio gear, cameras, and more. Direct contact, fair pricing, less e-waste.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [cat, setCat] = useState<Category | "all">("all");
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", "home", cat],
    queryFn: async () => {
      let q = supabase
        .from("listings")
        .select("id,title,price,condition,city,cover_image,created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      if (cat !== "all") q = q.eq("category", cat);
      const { data, error } = await q;
      if (error) throw error;
      return data as ListingCardData[];
    },
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/browse", search: { q: q || undefined } as any });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <header className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="max-w-[52ch]">
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-tight text-balance mb-6">
            Give your old hardware a{" "}
            <span className="font-serif italic text-brand">second life</span>.
          </h1>
          <p className="text-muted-foreground mb-8 text-pretty text-lg">
            The local marketplace for unused electronics. List, browse, message — and keep good gear out of landfill.
          </p>

          <form onSubmit={onSearch} className="relative max-w-xl mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Search for iPhone, MacBook, headphones..."
              className="w-full h-14 rounded-full bg-card pl-12 pr-32 text-base ring-1 ring-black/10 focus:ring-brand/30 outline-none shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 rounded-full bg-brand text-brand-foreground text-sm font-medium hover:opacity-90"
            >
              Search
            </button>
          </form>
        </div>

        <CategoryChips value={cat} onChange={setCat} />
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 w-full flex-1">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-medium">Recent arrivals</h2>
          <Link to="/browse" className="text-sm text-brand font-medium hover:underline">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] bg-muted rounded-2xl mb-4" />
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : listings && listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <EmptyState category={cat} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function EmptyState({ category }: { category: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <h3 className="text-lg font-medium mb-2">
        {category === "all" ? "No listings yet" : "No listings in this category yet"}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Be the first to give your unused electronics a new home.
      </p>
      <Link
        to="/sell"
        className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        List the first item
      </Link>
    </div>
  );
}
