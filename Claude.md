# Big Hit Signage — Project Spec

> A multi-tenant digital signage platform for barbershops. MVP target: Big Hit Barbershop, 3 TVs running rotating paid ad slots.

---

## 1. The Product

A web-based digital signage system that lets a shop owner sell ad slots to local businesses and display them on TVs in their location. Built multi-tenant from day one so the same platform can serve other shops.

**Two surfaces:**

1. **Admin Dashboard** — where the shop owner (and Built by Jason) manages ads, schedules, and clients.
2. **Player** — a fullscreen web page each TV loads on boot. Pulls the playlist and rotates through media.

**The end-user experience for the barber:**

- Turn on TV → ads play. Zero clicks.
- Turn off TV → done.
- Everything else (uploading ads, scheduling, billing) happens from a phone or laptop on the dashboard.

---

## 2. Tech Stack

| Layer                     | Choice                                 | Reason                                                       |
| ------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| Frontend (Admin + Player) | Next.js 14 (App Router)                | Same stack as builtbyjason.dev and existing chatbot platform |
| Styling                   | Tailwind CSS                           | Standard                                                     |
| Database                  | Postgres via Supabase                  | Auth + DB + storage in one. Easy multi-tenant.               |
| Media Storage             | Supabase Storage OR Cloudinary         | Cloudinary if we need on-the-fly image optimization          |
| Auth                      | Supabase Auth (admin only)             | Players don't auth — they use a signed URL token             |
| Hosting                   | Vercel                                 | Already on Vercel for portfolio + Italy planner              |
| Background jobs           | Vercel Cron or Supabase Edge Functions | For scheduled ad rotation, impression rollups                |

**No Railway needed for this one** — fully serverless. Keeps it cheap.

---

## 3. Data Model

Multi-tenant from day one. Every record scoped to a `location`.

```
locations
  id (uuid, pk)
  name (text)              # "Big Hit Barbershop"
  slug (text, unique)      # "big-hit"
  owner_user_id (uuid)     # references auth.users
  created_at

screens
  id (uuid, pk)
  location_id (fk)
  name (text)              # "Front TV", "Back TV", "Waiting Area"
  player_token (text)      # used in player URL, rotatable
  last_seen_at (timestamp) # for health check
  is_online (boolean, derived)

advertisers
  id (uuid, pk)
  location_id (fk)
  business_name (text)
  contact_name (text)
  contact_email (text)
  contact_phone (text)
  notes (text)
  created_at

ads
  id (uuid, pk)
  advertiser_id (fk)
  location_id (fk)         # denormalized for query speed
  title (text)
  media_url (text)         # Supabase Storage or Cloudinary URL
  media_type (enum)        # 'image' | 'video'
  duration_seconds (int)   # how long to display (default 10s for images)
  status (enum)            # 'draft' | 'active' | 'paused' | 'expired'
  start_date (date)
  end_date (date)
  created_at

playlists
  id (uuid, pk)
  location_id (fk)
  name (text)              # "Default Rotation", "Weekend Special"
  is_active (boolean)
  created_at

playlist_items
  id (uuid, pk)
  playlist_id (fk)
  ad_id (fk)
  order_index (int)
  weight (int)             # for weighted rotation (e.g., premium slots show more)

screen_playlists
  screen_id (fk)
  playlist_id (fk)
  # which playlist each screen is currently playing

impressions
  id (uuid, pk)
  ad_id (fk)
  screen_id (fk)
  played_at (timestamp)
  duration_played_seconds (int)
  # for "reporting" to advertisers — proof their ad ran
```

---

## 4. The Player

This is the critical piece. It runs on a Fire TV Stick (or smart TV browser) and just works.

### URL pattern

```
https://signage.builtbyjason.dev/player/<player_token>
```

The token identifies the screen. No login. No clicks.

### Behavior

1. On load: fetch the active playlist for this screen from `/api/player/<token>/playlist`
2. Cache the playlist + media locally (service worker) so it survives WiFi blips
3. Loop through items, displaying each for its `duration_seconds`
4. For videos: play, wait for `ended` event, advance
5. Every 60 seconds: heartbeat ping to `/api/player/<token>/heartbeat` (updates `last_seen_at`)
6. Every 5 minutes: re-fetch playlist (so new ads appear without manual reload)
7. On each ad shown: fire-and-forget `POST /api/player/<token>/impression`

### Technical notes

- Fullscreen via CSS, no chrome
- Black background (no white flashes between slides)
- Preload next item while current is playing
- Hard refresh every 24 hours at 3am to clear any memory leaks
- Build as a Next.js page at `/player/[token]/page.tsx` — client-side rendered

### Service worker

Cache media files aggressively. If WiFi drops, the player should keep playing the last known playlist forever rather than show a broken screen.

---

## 5. Admin Dashboard

Pages needed for MVP:

- **`/login`** — Supabase Auth
- **`/dashboard`** — overview: screens online/offline, today's impression count, active ads
- **`/screens`** — list of TVs, status (green/red dot), player URL to bookmark on each Fire Stick
- **`/screens/[id]`** — edit screen name, see live status, rotate player token, change assigned playlist
- **`/advertisers`** — CRUD for local businesses paying for slots
- **`/advertisers/[id]`** — that advertiser's ads + impression reports
- **`/ads`** — list all ads, filter by status, quick pause/resume
- **`/ads/new`** — upload media, set duration, assign to advertiser, set date range
- **`/ads/[id]`** — edit, see impressions
- **`/playlists`** — manage playlists, drag-to-reorder ads, set weights
- **`/settings`** — location info, billing (later)

### Most important UX details

- Drag-and-drop reorder on playlists
- Image/video preview on upload before saving
- One-click "preview this playlist" that opens the player URL in a new tab
- Screen status dots that update live (poll every 30s or use Supabase Realtime)

---

## 6. Hardware Setup (For the Barber)

Per TV:

- **Amazon Fire TV Stick 4K Max** (~$40)
- Install **Fully Kiosk Browser** (sideload via Downloader app)
- Configure Fully Kiosk:
  - Start URL: the player URL for that screen
  - Launch on boot: ON
  - Kiosk mode: ON (locks down exit)
  - Auto-restart on crash: ON
  - Screen never sleeps
- Enable HDMI-CEC on the TV so Fire Stick wakes when TV powers on
- Plug Fire Stick into TV's USB if available (powered with TV)

**Daily flow for the barber:** turn TV on, ads play. Turn TV off, done.

---

## 7. MVP Build Order

Build in this order. Don't skip ahead.

### Phase 1: Player works end-to-end (Weekend 1)

- [ ] Next.js + Supabase project setup
- [ ] Data model migrations
- [ ] Hardcode one playlist with 3 sample images in the DB
- [ ] Build `/player/[token]/page.tsx` that fetches and rotates
- [ ] Test on phone, laptop, then Fire Stick at home
- [ ] Confirm Fully Kiosk auto-launch works

### Phase 2: Admin can upload and schedule (Weekend 2)

- [ ] Supabase Auth + protected routes
- [ ] Locations + Screens CRUD
- [ ] Advertisers CRUD
- [ ] Ads upload (Supabase Storage)
- [ ] Playlists with drag-to-reorder
- [ ] Player picks up changes within 5 minutes

### Phase 3: Health + impressions (Weekend 3)

- [ ] Heartbeat endpoint + online/offline indicators
- [ ] Impression logging
- [ ] Basic impression report per ad (count + date range)

### Phase 4: Polish + deploy to Big Hit

- [ ] Set up 3 Fire Sticks at the shop
- [ ] Onboard first 2-3 paying advertisers
- [ ] Test for one week, fix what breaks

### Phase 5 (later): Sell to other shops

- [ ] Public marketing page on builtbyjason.dev
- [ ] Self-serve location signup
- [ ] Stripe billing for shop subscriptions
- [ ] Stripe Connect for shops to bill their advertisers (way later)

---

## 8. Pricing Ideas (Not Build, Just Thinking)

**For the barber to charge advertisers** (his revenue):

- Per-week slot: $50-150/week depending on screen + rotation frequency
- Per-month package: $150-400/month
- "Featured" slot (higher weight in rotation): premium

**For Built by Jason to charge the barber** (your revenue):

- Setup fee: $500-1000 (hardware + install + first ads loaded)
- Monthly SaaS: $50-100/month per location for 3 screens
- Or: revenue share (10-20% of ad revenue) — better long-term, more aligned

---

## 9. Open Questions to Resolve Before Building

- [ ] What TVs does the barber actually have? (determines if Fire Sticks are needed)
- [ ] Does the shop have reliable WiFi? (test bandwidth before install)
- [ ] Aspect ratio — are TVs all 16:9 horizontal, or any vertical?
- [ ] Will video ads need audio? (probably not — barbershop is loud, ads are visual)
- [ ] Does he want to upload ads himself or have you do it for him?
- [ ] First 2-3 advertisers — who's already interested?

---

## 10. Out of Scope for MVP

Resist building these on day one:

- Stripe billing (handle invoicing manually for first 3 months)
- Advertiser self-serve login (you/barber upload for them)
- Analytics dashboards beyond basic impression count
- AI-generated ad creative
- Mobile app (web works fine)
- Multiple aspect ratios / portrait support
- Approval workflows
- Audience targeting / day-parting beyond basic start/end dates

---

## Notes for Claude Code

- Use App Router, Server Components by default, Client Components only where needed (the player page)
- Supabase client: use `@supabase/ssr` for server, `@supabase/supabase-js` for player
- All admin routes behind middleware auth check
- Player route is public (auth via token in URL)
- Use Zod for input validation
- shadcn/ui for admin components
- Keep the player route DEAD SIMPLE — no fancy state management, no Redux, just useState + useEffect
- Deploy preview branches on Vercel for every PR
