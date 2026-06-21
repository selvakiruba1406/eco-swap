import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "My account — EcoSwap" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: profile, isLoading: pLoading } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: myListings } = useQuery({
    queryKey: ["listings", "mine", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,condition,city,cover_image,status,created_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setCity(profile.city ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim().slice(0, 60) || "EcoSwap User",
          city: city.trim().slice(0, 80) || null,
          bio: bio.trim().slice(0, 500) || null,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing removed");
      qc.invalidateQueries({ queryKey: ["listings", "mine", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markSold = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as sold");
      qc.invalidateQueries({ queryKey: ["listings", "mine", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <h1 className="text-3xl font-medium tracking-tight mb-8">My account</h1>

        <section className="bg-card rounded-2xl ring-1 ring-black/5 p-6 mb-10">
          <h2 className="text-lg font-medium mb-4">Profile</h2>
          {pLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <div className="space-y-4 max-w-xl">
              <Field label="Display name">
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" maxLength={60} />
              </Field>
              <Field label="City">
                <input value={city} onChange={(e) => setCity(e.target.value)} className="input" maxLength={80} placeholder="Brooklyn, NY" />
              </Field>
              <Field label="Short bio">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="input" maxLength={500} placeholder="Tell buyers a bit about you..." />
              </Field>
              <button
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
                className="h-10 rounded-lg bg-brand text-brand-foreground px-5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {saveProfile.isPending ? "Saving..." : "Save profile"}
              </button>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">My listings</h2>
            <Link to="/sell" className="text-sm font-medium text-brand hover:underline">+ List a new item</Link>
          </div>

          {!myListings || myListings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-muted-foreground mb-4">You haven't listed anything yet.</p>
              <Link to="/sell" className="inline-flex h-10 items-center rounded-lg bg-brand text-brand-foreground px-4 text-sm font-medium hover:opacity-90">
                Create your first listing
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myListings.map((l) => (
                <div key={l.id} className="bg-card rounded-2xl ring-1 ring-black/5 p-3">
                  <ListingCard listing={l as ListingCardData} />
                  <div className="flex items-center justify-between mt-3 px-1">
                    <span className={
                      "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded " +
                      (l.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : l.status === "sold"
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-muted text-muted-foreground border border-border")
                    }>
                      {l.status}
                    </span>
                    <div className="flex gap-2">
                      {l.status === "active" && (
                        <>
                          <button
                            onClick={() => markSold.mutate(l.id)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Mark sold
                          </button>
                          <button
                            onClick={() => removeListing.mutate(l.id)}
                            className="text-xs text-destructive hover:underline"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
      <style>{`.input{display:block;width:100%;height:2.5rem;border-radius:0.5rem;border:1px solid var(--color-input);background:var(--color-background);padding:0 0.75rem;font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px color-mix(in oklab, var(--brand) 30%, transparent)}textarea.input{height:auto;padding:0.625rem 0.75rem}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
