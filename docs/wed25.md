# Continuation Guide — Wednesday 25 Mar 2026
# AdTruck Campaign Proof App — LoneStar ERP

---

## Where We Left Off

All major items from the Tue 24 Mar session are complete. The codebase is clean
with no uncommitted work on main for either repo. One feature PR is open, and one
external blocker remains (Meta template review).

---

## Quick Health Check (Run First)

```bash
# Web app CI + latest tag
cd /Users/praneeth/LoneStar_ERP/adtruck-proof-main
git checkout main && git pull
gh run list --repo Vallabha-Praneeth/LoneStar_ERP --limit 3

# Mobile CI + latest tag
cd /Users/praneeth/LoneStar_ERP/adtruck-driver-native
git checkout main && git pull
gh run list --repo Vallabha-Praneeth/LoneStar_EPR_mobile_stack --limit 3

# Check stashes (2 stale ones to clean up)
git stash list

# Check PR #30 status (admin screens)
gh pr view 30 --repo Vallabha-Praneeth/LoneStar_EPR_mobile_stack

# Check WhatsApp template status (manual — open Meta Business Manager)
# https://business.facebook.com → WhatsApp → Message Templates → campaign_photo
```

---

## Priority 1: WhatsApp Template (Blocked on Meta)

**Status:** `campaign_photo` template submitted for Meta review on Tue 24 Mar.

**When approved:**
1. Test edge function end-to-end:
   ```bash
   # Authenticate as admin to get JWT
   curl -s -X POST "https://cleooniqbagrpewlkans.supabase.co/auth/v1/token?grant_type=password" \
     -H "apikey: <ANON_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@adtruck.com","password":"mawqex-rYsneq-kynja5"}' | jq '.access_token'

   # Invoke edge function with a real photo ID
   curl -s -X POST "https://cleooniqbagrpewlkans.supabase.co/functions/v1/send-whatsapp-photo" \
     -H "Authorization: Bearer <ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"campaignId":"00000000-0000-0000-0000-000000000010","photoId":"b364b4d2-695b-41e7-b087-8e6ca403d12e"}'
   ```
2. Verify WhatsApp message arrives with image on the client's phone
3. Test via mobile app: driver uploads photo -> WhatsApp notification fires automatically

**If rejected:** Check rejection reason in Meta Business Manager. Common issues:
- Body text too generic → add more context
- Missing sample values → provide example image URL + text
- Category wrong → might need "Marketing" instead of "Utility"

---

## Priority 2: Merge PR #30 — Admin Mobile Screens

**Branch:** `feature/admin-unified-login`
**PR:** https://github.com/Vallabha-Praneeth/LoneStar_EPR_mobile_stack/pull/30

This is the biggest pending feature — admin mobile screens + unified login + client landing.

**What's in it:**
- Admin layout with sidebar navigation (campaigns, users, reports, create)
- Campaign list + detail screens for admin
- Create campaign screen with client/driver selectors
- Users management screen
- Reports screen
- Client landing screen (placeholder)
- Unified login form (role detection → route to correct dashboard)
- Badge component + tests
- SearchBar, AdminHeader, InfoCard, StatusBadge components

**Pre-merge checklist:**
- [ ] CI passes (check after rebase — it was just pushed)
- [ ] CodeRabbit review (may flag issues)
- [ ] Quick manual test: run on iOS simulator with admin login
- [ ] Merge → tag `v0.4.0`

**To test admin login on simulator:**
```bash
cd /Users/praneeth/LoneStar_ERP/adtruck-driver-native
git checkout feature/admin-unified-login
pnpm start  # Metro bundler
# In another terminal: pnpm ios (if app not already installed)
# Login with: admin / mawqex-rYsneq-kynja5
```

---

## Priority 3: Stash Cleanup

```bash
cd /Users/praneeth/LoneStar_ERP/adtruck-driver-native
git stash list
# stash@{0}: On main: WIP... (from prior session — contents already committed via PRs #31/#32)
# stash@{1}: WIP on fix/date-fns-v3... (uniwind-types.d.ts only — already merged)

# Safe to drop both:
git stash drop stash@{1}
git stash drop stash@{0}
```

---

## Current Versions

| Component | Version | Repo |
|-----------|---------|------|
| Web app | v1.5.0 | Vallabha-Praneeth/LoneStar_ERP |
| Mobile app | v0.3.0 | Vallabha-Praneeth/LoneStar_EPR_mobile_stack |
| Edge function | v7 | cleooniqbagrpewlkans (Supabase) |

---

## Open PRs

| # | Repo | Branch | Title | Status |
|---|------|--------|-------|--------|
| 30 | mobile | feature/admin-unified-login | Admin screens + unified login | Open — rebased, CI pending |

---

## Branch State

### Web (`adtruck-proof-main`)
- `main` at v1.5.0 — clean, all PRs merged
- No open feature branches

### Mobile (`adtruck-driver-native`)
- `main` at v0.3.0 — clean
- `feature/admin-unified-login` — 2 commits ahead of main, PR #30 open
- `fix/date-fns-v3` — stale, can be deleted after stash cleanup
- `fix/coderabbit-followups` — already merged, can be deleted
- `feature/ui-components` — already merged, can be deleted
- `fix/zod-v4-standard-schema` — already merged, can be deleted

**Branch cleanup command:**
```bash
git branch -d fix/date-fns-v3 fix/coderabbit-followups feature/ui-components fix/zod-v4-standard-schema
git push origin --delete fix/date-fns-v3 fix/coderabbit-followups feature/ui-components fix/zod-v4-standard-schema
```

---

## Key Context for Next Session

1. **Maestro on iOS 26.3:** `openLink` deep link doesn't work (`LSApplicationWorkspaceErrorDomain error 115`). Workaround: tap `http://localhost:8081` in the dev client UI, then close the dev menu. The `full-test-noclean.yaml` approach (skip clearState, tap from login screen) works. **On Android, the shift-flow.yaml handles this natively** — clearState + openLink works correctly.

2. **Photo picker selectors:** `PXGGridLayout-Info` works for selecting the first photo. `Photo, .*` text selector does NOT work on iOS 26.3 but is optional so the flow continues.

3. **Campaign date:** The seed campaign (ID `...0010`) date needs to be updated each day for the mobile app to show it (query filters `campaign_date >= today`). Update via admin JWT:
   ```bash
   curl -X PATCH "https://cleooniqbagrpewlkans.supabase.co/rest/v1/campaigns?id=eq.00000000-0000-0000-0000-000000000010" \
     -H "apikey: <ANON_KEY>" \
     -H "Authorization: Bearer <ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"campaign_date":"2026-03-25"}'
   ```

4. **Supabase RLS:** All policies use JWT claims. Anon key returns empty arrays for most tables. Must authenticate to read data. Admin JWT required for cross-table reads.

5. **`validators: schema as any` is FIXED.** Zod v4 + Standard Schema. No adapter needed. Don't re-add `@tanstack/zod-form-adapter`.

6. **Java 25 breaks Android builds.** Kotlin compiler's `JavaVersion.parse` can't handle "25.0.2". Always set `JAVA_HOME` to Java 17 for Android:
   ```bash
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
   ```

7. **Android E2E tests pass.** Both driver and admin flows verified on Pixel 9a (API 36). Run:
   ```bash
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
   export ANDROID_HOME=~/Library/Android/sdk
   export PATH="$ANDROID_HOME/platform-tools:$PATH"
   maestro test .maestro/driver/shift-flow.yaml
   maestro test .maestro/admin/admin-campaign-flow.yaml
   ```

8. **WhatsApp env vars on Supabase:**
   - `WHATSAPP_CLOUD_ACCESS_TOKEN` — Meta permanent token
   - `WHATSAPP_CLOUD_PHONE_NUMBER_ID` — sender phone number ID
   - `WHATSAPP_CLOUD_GRAPH_VERSION` — defaults to `v22.0`
   - `WHATSAPP_CLOUD_TEMPLATE_NAME` — defaults to `campaign_photo`
   - `WHATSAPP_CLOUD_TEMPLATE_LANGUAGE` — defaults to `en`

---

## Test Credentials

| Role | Email | Password | Username |
|------|-------|----------|----------|
| Admin | admin@adtruck.com | mawqex-rYsneq-kynja5 | admin |
| Driver | driver@adtruck.com | DriverPass123! | driver1 |
| Client | client@acme.com | ClientPass123! | client1 |

---

## Decision Points for Tomorrow

1. **Should PR #30 merge as-is or does it need more work?** The admin screens are functional but the client landing screen is a placeholder. Decide if that's OK for v0.4.0 or if it needs implementation first.

2. **Mobile app scope:** Is the mobile app driver-only for MVP, or do admin/client views matter for the demo? PR #30 adds admin views but client is just a placeholder.

3. **WhatsApp template:** If Meta rejects, what's the fallback? Could send a text-only template without the image header as a simpler alternative.
