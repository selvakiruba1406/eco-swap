## EcoSwap — peer-to-peer e-waste marketplace

A real shopping-style marketplace where users list unused electronics and other users browse, contact, and rate sellers. Contact-only model (no online payment).

### Design

Use the selected "Tactile Hardware Shop" direction verbatim:
- Palette: brand `#164e63` (deep teal), accent `#f59e0b`, zinc neutrals, eco emerald for verified badges
- Type: Inter (sans) + Newsreader italic (display accents)
- Generous whitespace, soft `rounded-2xl` cards, `ring-1 ring-black/5` borders
- Sticky translucent nav, dark zinc-900 footer

### Pages (TanStack Start routes)

```text
/                       Home — hero, category chips, search, featured listings
/browse                 Full grid with category + condition + price filters, search
/listing/$id            Detail — gallery, seller card, "Message seller", reviews
/sell                   Multi-photo upload + form (auth required)
/messages               Inbox + thread view (auth required)
/profile/$userId        Public seller profile with ratings & active listings
/account                My listings + settings (auth required)
/auth                   Email/password + Google sign-in
```

### Backend (Lovable Cloud)

Tables:
- `profiles` (id→auth.users, display_name, avatar_url, city, bio, created_at)
- `listings` (id, seller_id, title, description, price, condition, category, city, status, created_at)
- `listing_images` (id, listing_id, storage_path, sort_order)
- `conversations` (id, listing_id, buyer_id, seller_id, last_message_at)
- `messages` (id, conversation_id, sender_id, body, created_at) — realtime
- `reviews` (id, reviewer_id, reviewee_id, listing_id, rating 1-5, comment, created_at)

Storage bucket: `listing-images` (public read, authed write).

RLS: anyone can read listings/profiles/reviews; only owner can write own listings/profile; conversation participants can read/write their messages; reviews require a completed transaction context (simple: any authed user can review another user once).

GRANTs on every public table per the public-schema rule. Profile auto-created via trigger on signup.

### Features

1. **Auth** — Lovable Cloud email/password + Google. `/_authenticated/` gate for sell, messages, account.
2. **Listings** — categories (Phones, Laptops, Audio, Gaming, Cameras, Accessories, Other), condition (Mint, Excellent, Good, Fair), city, price, multi-image upload via Storage.
3. **Browse** — search by title, filter by category/condition/price range, sort by recent/price.
4. **Messaging** — per-listing conversation between buyer & seller, realtime via Supabase channel.
5. **Ratings** — 1–5 stars + comment on a seller's profile; profile shows average rating and review list.
6. **SEO** — unique `head()` per route; listing detail uses listing image as og:image.

### Tech notes

- TanStack Start file-based routes; `createServerFn` for any server-side logic; browser Supabase client for realtime + simple reads.
- Public routes (`/`, `/browse`, `/listing/$id`, `/profile/$id`) use SSR with public read policies.
- Protected routes (`/sell`, `/messages`, `/account`) under `_authenticated/`.
- Generated hero/listing images via image-gen for placeholder seed data on first run.

### Out of scope (v1)
Online payments, shipping, offers/bidding, admin moderation dashboard.
