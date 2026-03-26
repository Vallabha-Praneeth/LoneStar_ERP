# Session Summary — Sunday 23 Mar 2026 (Evening) + Tuesday 24 Mar 2026
# AdTruck Campaign Proof App — LoneStar ERP

---

## What We Were Doing (The Plan)

Two sessions that blurred together due to a power outage on Sunday evening.

**Sunday 23 Mar (evening):** Add WhatsApp photo notifications — when a driver uploads a
campaign photo, automatically send it to the client via WhatsApp Business API. Remove the
manual admin approval workflow (photos auto-approve on upload).

**Tuesday 24 Mar (continuation):** Diagnose why WhatsApp images weren't arriving despite
API success, fix the delivery mechanism with a proper Meta template, test all 3 roles,
unstash mobile WIP, fix Zod workaround, merge PRs, and tag releases.

---

## What We Did

### 1. WhatsApp Integration — Edge Function (23 Mar Evening)

Created `supabase/functions/send-whatsapp-photo/index.ts` — a Supabase edge function that:
- Fetches campaign -> client -> phone_number from DB
- Generates a 7-day signed URL for the photo from Supabase storage
- Sends a WhatsApp message via Meta Cloud API (Graph API)
- Original approach: two-step (hello_world template + separate image message)

Deployed to Supabase project `cleooniqbagrpewlkans`. Tested via curl — API returned
message IDs but WhatsApp image never actually arrived.

### 2. Client Phone Number Migration (23 Mar Evening)

Created `supabase/migrations/003_client_phone_number.sql`:
- Adds optional `phone_number` column to clients table
- E.164 format validation constraint

### 3. Driver Upload Auto-Approve (23 Mar Evening)

Modified `src/pages/driver/DriverUpload.tsx`:
- Photos now insert with `status: "approved"` instead of `"pending"`
- Fire-and-forget call to the send-whatsapp-photo edge function after upload

### 4. Removed Admin Photo Approval Workflow (23 Mar Evening)

| File | Change |
|------|--------|
| `src/components/PhotoCard.tsx` | Approve/reject buttons replaced with delete button |
| `src/pages/admin/AdminPhotoApproval.tsx` | Removed approval workflow, added delete functionality |
| `src/pages/admin/AdminCampaignDetail.tsx` | Simplified photo stats (just total count) |
| `src/pages/admin/AdminReports.tsx` | Removed approved/pending metrics from stats + CSV export |

### 5. Diagnosed WhatsApp Image Delivery Failure (24 Mar)

**Root cause:** WhatsApp Business API conversation window rules. The two-step approach
(template message + separate image message) fails because free-form messages (including
standalone images) require the recipient to have responded within 24 hours. Meta's API
accepts the request and returns a message ID but silently doesn't deliver.

### 6. Created Custom WhatsApp Template (24 Mar)

Created `campaign_photo` template in Meta Business Manager:
- **Category:** Utility
- **Language:** English
- **Header:** Image (dynamic — accepts image URL parameter)
- **Body:** `New photo uploaded for "{{1}}" - {{2}}` (campaign title + driver note)
- **Footer:** `LoneStar Campaign Proof`
- Submitted for Meta review (still pending as of end of session)

### 7. Refactored Edge Function (24 Mar)

Changed from two-step (template + separate image) to a single template call:
- Uses `campaign_photo` template with image header component + body parameters
- Default template name: `campaign_photo`, language: `en`
- Redeployed to Supabase (send-whatsapp-photo v7)

### 8. Full Driver E2E Test on iOS Simulator (24 Mar)

Ran Maestro E2E test covering the complete driver flow:
- Login (driver1/DriverPass123!) -> Campaign screen (shift already active)
- Upload photo -> Gallery picker -> Select photo -> Submit -> "Photo Submitted!"
- Back to campaign -> End shift -> Returns to login screen
- **Verified in Supabase:** photo record landed (`status: approved`, `submitted_at: 2026-03-24T04:47`), shift record has start/end timestamps

### 9. Admin + Client Role Verification (24 Mar)

Tested via Supabase REST API with JWT auth:

**Admin:** Full access confirmed — 2 campaigns, 8 photos (including today's), 14 shifts, 3 profiles, 1 client. Vercel deployment loads correctly (200 OK).

**Client (RLS):** Correctly scoped — 2 campaigns (own client_id only), 2 photos (only `approved` — pending hidden), 14 shifts (own campaigns), 1 profile (own only — admin/driver blocked), 0 client rows (no cross-client leakage).

### 10. UI Components Unstashed + PR #31 (24 Mar)

Unstashed WIP from prior session + recovered card/icon-button from `feature/admin-unified-login`:
- **Card** component — styled container with padding/shadow
- **IconButton** component — size/variant support + test coverage
- **Button** improvements — `leftIcon`/`rightIcon` props, 44px touch target, `active:opacity-80` press feedback, dark mode fix for `link` variant, `hitSlop` on `sm` size
- **Button tests** fixed — replaced fragile tree traversal with `testID` lookups
- PR #31 merged into main

### 11. Zod v4 Upgrade — Removed `as any` Workaround (24 Mar)

- Removed `@tanstack/zod-form-adapter` (deprecated)
- Zod was already at v4.3.6 — Standard Schema support built-in
- Removed `as any` casts from `login-form.tsx` and `add-post-screen.tsx`
- TanStack Form accepts Zod v4 schemas directly without adapter
- PR #32 merged into main

### 12. PR Merges + Tagging (24 Mar)

| PR | Repo | Title | Status |
|----|------|-------|--------|
| #7 | web | WhatsApp photo notifications | Merged (fixed `no-explicit-any` lint errors first) |
| #31 | mobile | Card, IconButton, Button improvements | Merged |
| #32 | mobile | Zod v4 + remove adapter workaround | Merged |
| #30 | mobile | Admin screens + unified login | Open (rebased + polished, awaiting review) |

**Tags pushed:**
- Web: `v1.4.0` -> `v1.5.0`
- Mobile: `v0.2.0` -> `v0.3.0`

### 13. Admin-Unified-Login Branch Polished (24 Mar)

Rebased `feature/admin-unified-login` onto updated main (includes UI components + Zod fix).
Applied stashed uncommitted changes (StatusBadge simplification, InfoCard layout, Input dark mode, campaign screen styling). PR #30 updated.

### 14. Android E2E Tests — Both Flows Pass (24 Mar)

Built the app for Android (`Pixel_9a` emulator, API 36) and ran both Maestro E2E tests:

| Test | Steps | Status |
|------|-------|--------|
| Driver shift flow | login → start shift → upload photo → "Photo Submitted!" → end shift → logout | **PASS** |
| Admin campaign flow | login → campaign list → tap campaign → detail screen → Reports tab → Users tab → sign out | **PASS** |

Created two new Maestro files:
- `.maestro/admin/admin-campaign-flow.yaml` — full admin E2E test
- `.maestro/utils/admin-login.yaml` — reusable admin login util

**Issue:** Java 25 (Temurin 25.0.2) broke the Kotlin compiler in React Native's Gradle plugin — `JavaVersion.parse("25.0.2")` throws `IllegalArgumentException`. Fixed by setting `JAVA_HOME` to Java 17 for the Android build.

---

## Issues Faced

| # | Problem | How We Found It | Resolution |
|---|---------|----------------|------------|
| 1 | WhatsApp image not arriving despite API success | Curl test returned 200 + message ID but no notification | Root cause: conversation window rules — free-form messages need recipient response within 24hrs. Fix: use template with image header |
| 2 | Meta template validation: "Variables can't be at start/end" | Template submission rejected | Added static text around variables: `New photo uploaded for "{{1}}" - {{2}}` + footer |
| 3 | Power outage lost session + unsaved tue24.md | Power went out Sunday evening | Reconstructed from git diff, screenshots, and memory |
| 4 | Maestro `openLink` deep link fails on iOS 26.3 | `LSApplicationWorkspaceErrorDomain error 115` on `xcrun simctl openurl` and Maestro `openLink` | Tapped `http://localhost:8081` in dev client UI via Maestro, closed dev menu, then ran flow from login screen |
| 5 | Expo dev client showed dev menu instead of app | Tapped Metro URL in dev client which opened the dev tools menu | Added `tapOn: "Close"` step to dismiss dev menu before proceeding |
| 6 | Maestro `Photo, .*` text selector failed on iOS 26.3 | `optional: true` allowed flow to continue but logged warning | `PXGGridLayout-Info` selector worked; the text-based fallback was unnecessary |
| 7 | PR #7 CI failed — `no-explicit-any` in AdminUsers + DriverCampaign | GitHub Actions CI check on web repo | Replaced `any` types with proper inline types matching Supabase select shape |
| 8 | card.tsx and icon-button.tsx not in stash | Mon23 session doc listed them but `git stash show` only had 6 tracked files | Files existed as committed code on `feature/admin-unified-login` branch — extracted with `git show` |
| 9 | ESLint export ordering in index.tsx | `perfectionist/sort-exports` rule — `checkbox` must come before `icon-button` alphabetically | Reordered exports |
| 10 | Button nested ternary lint errors | `style/multiline-ternary` — ESLint wanted newlines in nested ternaries | Refactored render logic into `renderContent()` function with if/return instead of nested ternaries |
| 11 | Campaign not showing on mobile (from earlier in session) | Driver campaign screen showed "No active campaign" | Campaign date was 2026-03-23 (yesterday), query filters `>= today`. Updated to 2026-03-24 via admin JWT |
| 12 | Java 25 breaks Android Gradle build | `JavaVersion.parse("25.0.2")` → `IllegalArgumentException` in Kotlin compiler | Set `JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home` for Android builds |
| 13 | Maestro suite run only found 1 flow | `maestro test .maestro/` doesn't recurse into subdirectories | Run flows individually: `maestro test .maestro/driver/shift-flow.yaml` then `maestro test .maestro/admin/admin-campaign-flow.yaml` |

---

## Files Changed This Session

### Web repo (`adtruck-proof-main`) — merged in PR #7
```
src/components/PhotoCard.tsx              — approve/reject → delete button
src/pages/admin/AdminPhotoApproval.tsx    — removed approval workflow, added delete
src/pages/admin/AdminCampaignDetail.tsx   — simplified photo stats
src/pages/admin/AdminReports.tsx          — removed approved/pending metrics
src/pages/admin/AdminUsers.tsx            — fixed no-explicit-any lint error
src/pages/driver/DriverCampaign.tsx       — fixed no-explicit-any lint error
src/pages/driver/DriverUpload.tsx         — auto-approve + WhatsApp fire-and-forget
supabase/functions/send-whatsapp-photo/index.ts — NEW edge function
supabase/migrations/003_client_phone_number.sql — NEW migration
docs/mon23.md                             — previous session doc
```

### Mobile repo (`adtruck-driver-native`) — PRs #31, #32
```
# PR #31 — UI Components
.maestro/driver/shift-flow.yaml           — iOS/Android platform split for launch
docs/fri19.md                             — session doc from Mar 19
src/components/ui/button.tsx              — leftIcon/rightIcon, 44px touch target, dark mode
src/components/ui/button.test.tsx         — fixed tests to use testID
src/components/ui/card.tsx                — NEW component
src/components/ui/icon-button.tsx         — NEW component
src/components/ui/icon-button.test.tsx    — NEW tests
src/components/ui/index.tsx               — added card + icon-button exports
uniwind-types.d.ts                        — interface syntax fix

# PR #32 — Zod v4
package.json                              — removed @tanstack/zod-form-adapter
pnpm-lock.yaml                            — updated lockfile
src/features/auth/components/login-form.tsx — removed `as any` casts
src/features/feed/add-post-screen.tsx      — removed `as any` cast

# PR #30 (open) — Admin Unified Login (rebased + polished + E2E)
src/components/info-card.tsx              — layout fix
src/components/status-badge.tsx           — simplified variant mapping
src/components/ui/input.tsx               — dark mode adjustments
src/features/admin/campaign-detail-screen.tsx — styling refinements
src/features/admin/campaign-list-screen.tsx — styling refinements
src/features/auth/components/login-form.tsx — polish
src/features/auth/components/login-form.test.tsx — import fix
.maestro/admin/admin-campaign-flow.yaml   — NEW admin E2E test
.maestro/utils/admin-login.yaml           — NEW admin login util
```

---

## Current Project State

### Web App (`adtruck-proof-main`) — v1.5.0
- Deployed on Vercel: `https://lonestar-adtruck-proof.vercel.app`
- WhatsApp integration deployed, template pending Meta approval
- Photo approval workflow removed — photos auto-approve on upload

### Mobile App (`adtruck-driver-native`) — v0.3.0
- Full driver E2E verified on iOS simulator
- UI components (card, icon-button, improved button) merged
- Zod v4 + Standard Schema — no more `as any` workaround
- PR #30 open: admin mobile screens + unified login (awaiting review)

### Edge Function
- `send-whatsapp-photo` v7 deployed to Supabase
- Uses `campaign_photo` template (pending Meta approval)

---

## What's Left — Next Session (Wed 25 Mar 2026)

### Blocked
- [ ] WhatsApp `campaign_photo` template — waiting on Meta approval
- [ ] End-to-end WhatsApp test once approved

### Ready
- [ ] Review + merge PR #30 (admin screens + unified login)
- [ ] Clean up remaining stashes (`git stash list` shows 2 stale stashes)
- [ ] Consider v0.4.0 tag after PR #30 merges

---

## Infrastructure

- **Web Vercel:** `https://lonestar-adtruck-proof.vercel.app`
- **Supabase:** `https://cleooniqbagrpewlkans.supabase.co`
- **GitHub (web):** `https://github.com/Vallabha-Praneeth/LoneStar_ERP`
- **GitHub (mobile):** `https://github.com/Vallabha-Praneeth/LoneStar_EPR_mobile_stack`
- **Web version:** v1.5.0
- **Mobile version:** v0.3.0
- **Edge function:** send-whatsapp-photo v7
- **WhatsApp template:** `campaign_photo` (pending Meta approval)
- **iOS Simulator:** iPhone 16e (A4152A57-003A-47D9-8713-D7E0FFB3D04D)

---

## Test Credentials

| Role | Email | Password | Username |
|------|-------|----------|----------|
| Admin | admin@adtruck.com | mawqex-rYsneq-kynja5 | admin |
| Driver | driver@adtruck.com | DriverPass123! | driver1 |
| Client | client@acme.com | ClientPass123! | client1 |

---

## Git Log (Recent)

### Web repo
```
0222906  feat: WhatsApp photo notifications with campaign_photo template (#7)
```
**Tags:** v1.4.0 -> v1.5.0

### Mobile repo
```
1246c7a  fix: upgrade Zod to v4 + remove zod-form-adapter workaround (#32)
a06f6a9  feat(ui): add card + icon-button components, improve button variants (#31)
c95f0c9  Merge pull request #20 — fix: address CodeRabbit post-merge follow-ups
```
**Tags:** v0.2.0 -> v0.3.0

### Open PRs
- **Mobile PR #30:** feat: admin mobile screens + unified login (rebased, polished, awaiting review)
