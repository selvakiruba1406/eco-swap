import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CategoryChips } from "@/components/category-chips";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { CONDITIONS, type Category, type Condition } from "@/lib/marketplace";
import { Search } from "lucide-react";

const searchSchema = z.object({
  q: z.string().optional(),
  cat: z.enum(["phones", "laptops", "audio", "gaming", "cameras", "accessories", "other"]).optional(),
});

export const Route = createFileRoute("/browse")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Browse Electronics — EcoSwap" },
      { name: "description", content: "Browse pre-owned phones, laptops, cameras, audio gear, and accessories from sellers near you." },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const cat = (search.cat ?? "all") as Category | "all";
  const [q, setQ] = useState(search.q ?? "");
  const [condition, setCondition] = useState<Condition | "all">("all");
  const [sort, setSort] = useState<"recent" | "price_asc" | "price_desc">("recent");

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", "browse", cat, search.q, condition, sort],
    queryFn: async () => {
      let qb = supabase
        .from("listings")
        .select("id,title,price,condition,city,cover_image,created_at")
        .eq("status", "active");
      if (cat !== "all") qb = qb.eq("category", cat);
      if (condition !== "all") qb = qb.eq("condition", condition);
      if (search.q) qb = qb.ilike("title", `%${search.q}%`);
      if (sort === "recent") qb = qb.order("created_at", { ascending: false });
      if (sort === "price_asc") qb = qb.order("price", { ascending: true });
      if (sort === "price_desc") qb = qb.order("price", { ascending: false });
      const { data, error } = await qb.limit(60);
      if (error) throw error;
      return data as ListingCardData[];
    },
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (s: z.infer<typeof searchSchema>) => ({ ...s, q: q || undefined }) });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <h1 className="text-3xl md:text-4xl font-medium tracking-tight mb-2">
          Browse <span className="font-serif italic text-brand">all gear</span>
        </h1>
        <p className="text-muted-foreground mb-8">Locally listed electronics, ready for a second life.</p>

        <form onSubmit={submitSearch} className="relative max-w-xl mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Search by title..."
            className="w-full h-11 rounded-full bg-card pl-11 pr-4 text-sm ring-1 ring-black/10 focus:ring-brand/30 outline-none"
          />
        </form>

        <div className="flex flex-col gap-4">
          <CategoryChips
            value={cat}
            onChange={(v) => navigate({ search: (s: z.infer<typeof searchSchema>) => ({ ...s, cat: v === "all" ? undefined : v }) })}
          />
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition | "all")}
              className="h-9 rounded-full bg-card ring-1 ring-black/5 px-3 text-sm"
            >
              <option value="all">Any condition</option>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-9 rounded-full bg-card ring-1 ring-black/5 px-3 text-sm"
            >
              <option value="recent">Most recent</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-24 flex-1">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] bg-muted rounded-2xl mb-4" />
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : listings && listings.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Showing {listings.length} listing{listings.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <h3 className="text-lg font-medium mb-2">No matching listings</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
