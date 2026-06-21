import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { uploadListingImage } from "@/lib/storage";
import { CATEGORIES, CONDITIONS } from "@/lib/marketplace";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({ meta: [{ title: "List an item — EcoSwap" }] }),
  component: SellPage,
});

const formSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  description: z.string().trim().max(2000),
  price: z.coerce.number().min(0, "Price must be 0 or higher").max(100000),
  category: z.enum(["phones", "laptops", "audio", "gaming", "cameras", "accessories", "other"]),
  condition: z.enum(["mint", "excellent", "good", "fair"]),
  city: z.string().trim().min(1, "City is required").max(80),
});

function SellPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "phones" as (typeof CATEGORIES)[number]["value"],
    condition: "good" as (typeof CONDITIONS)[number]["value"],
    city: "",
  });

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []).slice(0, 6 - files.length);
    setFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const parsed = formSchema.parse(form);
      if (files.length === 0) throw new Error("Please add at least one photo");

      const uploads = await Promise.all(files.map((f) => uploadListingImage(user.id, f)));

      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          title: parsed.title,
          description: parsed.description,
          price: parsed.price,
          category: parsed.category,
          condition: parsed.condition,
          city: parsed.city,
          cover_image: uploads[0].url,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (uploads.length > 1) {
        await supabase.from("listing_images").insert(
          uploads.slice(1).map((u, i) => ({
            listing_id: listing.id,
            url: u.url,
            sort_order: i,
          }))
        );
      }

      toast.success("Listing published!");
      navigate({ to: "/listing/$id", params: { id: listing.id } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to publish listing";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <h1 className="text-3xl font-medium tracking-tight mb-2">
          List an <span className="font-serif italic text-brand">item</span>
        </h1>
        <p className="text-muted-foreground mb-8">Photos, a clear title, and an honest condition help your listing move quickly.</p>

        <form onSubmit={submit} className="space-y-6">
          <div className="bg-card rounded-2xl ring-1 ring-black/5 p-6">
            <label className="text-sm font-medium block mb-3">Photos ({files.length}/6)</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden ring-1 ring-black/5">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 size-6 rounded-full bg-foreground/70 text-background grid place-items-center hover:bg-foreground"
                  >
                    <X className="size-3" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] bg-brand text-brand-foreground px-1.5 py-0.5 rounded">
                      Cover
                    </span>
                  )}
                </div>
              ))}
              {files.length < 6 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/40 hover:bg-muted cursor-pointer grid place-items-center text-muted-foreground">
                  <input type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
                  <ImagePlus className="size-6" />
                </label>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl ring-1 ring-black/5 p-6 space-y-4">
            <Field label="Title">
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. iPhone 13 Mini, 128GB"
                className="input"
                required
                maxLength={120}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Battery health, included accessories, any cosmetic notes..."
                className="input"
                maxLength={2000}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Price (USD)">
                <input
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="450"
                  className="input"
                  required
                />
              </Field>
              <Field label="City">
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Brooklyn, NY"
                  className="input"
                  required
                  maxLength={80}
                />
              </Field>
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof form.category }))}
                  className="input"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Condition">
                <select
                  value={form.condition}
                  onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as typeof form.condition }))}
                  className="input"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl bg-brand text-brand-foreground font-medium hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Publishing..." : "Publish listing"}
          </button>
        </form>
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
