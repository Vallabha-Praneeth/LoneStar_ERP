# Session Log — Friday 27 Mar 2026
# AdTruck Campaign Proof App — LoneStar ERP

---

## Summary

Today's session focused on **WhatsApp integration go-live**, **mobile PR merge + tagging**, **dependabot cleanup**, **demo environment setup**, and **web E2E test fixes**. The WhatsApp `campaign_photo` template (approved by Meta) was wired up end-to-end with correct template name, language, and body parameters. All 3 dev environments (web, iOS, Android) were brought up and verified with automated E2E tests. 13 stale Playwright web tests were fixed to match current UI.

---

## What We Did Today

### 1. WhatsApp Integration — Go Live

**Goal:** Wire up the Meta-approved `campaign_photo` template and test real message delivery.

**Issues encountered:**
- `WHATSAPP_CLOUD_TEMPLATE_NAME` secret was set to `hello_world` (Meta's default), not `campaign_photo`
- First attempt sent 2 "hello world" messages instead of campaign content
- Template has TEXT header (not IMAGE) — initial code assumed image header
- Template body has 2 params (`{{1}}`=title, `{{2}}`=note) — first deploy sent wrong param count
- Template name `campaign_photo` returned "does not exist in en_US" — language code mismatch (template is `en`, not `en_US`)

**Final architecture (edge function v8):**
1. **Template message** — `campaign_photo` template with body params: campaign title + driver note
2. **Follow-up image message** — actual photo with caption (sent within 24h conversation window opened by template)

**Secrets corrected:**
- `WHATSAPP_CLOUD_TEMPLATE_NAME` = `campaign_photo`
- `WHATSAPP_CLOUD_TEMPLATE_LANGUAGE` = `en`

**Verified:** Real WhatsApp messages arrived on +919494348091 with correct template content + photo image.

**Commits to edge function:**
- Updated `supabase/functions/send-whatsapp-photo/index.ts` — body params + follow-up image message
- Deployed via `npx supabase functions deploy send-whatsapp-photo --no-verify-jwt`

### 2. Mobile PR #33 Merge + Tagging

- **Merged PR #33** (`feat/mobile-ui-polish`) — CI green, all E2E passing
- **Tagged v0.5.0** on main and pushed to origin
- **PR #30** was already merged (no action needed)

### 3. Dependabot PR Cleanup

**Merged 8 PRs:**

| PR | Package | Bump | Notes |
|----|---------|------|-------|
| #21 | `marocchino/sticky-pull-request-comment` | v2 → v3 | GitHub Action |
| #22 | `mobile-dev-inc/action-maestro-cloud` | 1.4.1 → 2.0.2 | GitHub Action |
| #23 | `actions/download-artifact` | v3 → v8 | GitHub Action |
| #24 | `peter-evans/create-pull-request` | v3 → v8 | GitHub Action |
| #27 | `@commitlint/config-conventional` | 20.3.1 → 20.5.0 | Dev dep |
| #29 | `react-i18next` | 16.5.3 → 16.6.1 | Minor |
| #26 | `react-native-mmkv` | 4.1.1 → 4.3.0 | Tested: lint/types/tests pass |
| #28 | `uniwind` | 1.2.4 → 1.6.0 | Tested: lighter deps (-103 +18 packages) |

**Skipped:**
- #25 `expo-device` 8.0.10 → 55.0.10 — major version, requires Expo SDK upgrade

### 4. Campaign Date Update

Updated seed campaign date to `2026-03-27` via Supabase REST API so driver flow works with `campaign_date >= today` filter.

### 5. Demo Environment Setup

Brought up all 3 dev environments for team demo:
- **Web app** — Vite dev server on `http://localhost:8081`
- **iOS Simulator** — iPhone 16e (A4152A57), app launched via deep link
- **Android Emulator** — Pixel_7_API_36, app launched via deep link
- **Metro** — port 8083, serving both mobile platforms

### 6. Mobile E2E Demo Runs

Created Maestro demo flows (`.maestro/demo/`) that work with Expo Go (no `clearState` — avoids the binary-not-found error with Expo Go).

| Flow | iOS | Android |
|------|-----|---------|
| Admin (login → campaigns → detail → reports → users → sign out) | **PASS** | **PASS** |
| Driver (login → start shift → upload photo → submit → end shift) | **PASS** | **PASS** |

**Recordings saved:**
- `demo-recordings/ios-admin-driver-demo.mp4`
- `demo-recordings/android-admin-driver-demo.mp4`

**Key fix:** Android Maestro needed `adb forward tcp:7001 tcp:7001` after fresh emulator boot. iOS and Android Maestro cannot run simultaneously (port 7001 conflict — same as yesterday).

### 7. Web E2E Test Fixes

**13 of 26 Playwright tests were failing** due to stale assertions after UI changes (WhatsApp auto-approve, header text changes).

**Fixes applied:**

| File | Change |
|------|--------|
| `tests/admin/photo-approval.spec.ts` | "pending review" → "Photo Management" heading + `/\d+ photos/i` count |
| `tests/admin/users.spec.ts` | `@admin` → `getByRole('heading', { name: 'Admin User' })` (strict mode) |
| `tests/client/campaign-view.spec.ts` | "acme corp" → "Campaign Portal" header |
| `tests/client/login.spec.ts` | Redirect timeout 15s → 30s |
| `helpers/admin.setup.ts` | Auth timeout 15s → 30s |
| `helpers/client.setup.ts` | Auth timeout 15s → 30s |
| `helpers/driver.setup.ts` | Auth timeout 15s → 30s |
| `playwright.config.ts` | Workers `undefined` → `3` (fixed race condition with Supabase auth) |

**Result:** 26/26 pass.

---

## Files Changed Today

### Edge function (deployed)
| File | Change |
|------|--------|
| `supabase/functions/send-whatsapp-photo/index.ts` | Body params + follow-up image message |

### Mobile repo (committed via PR merges)
| File | Change |
|------|--------|
| `.maestro/demo/ios-admin-demo.yaml` | NEW — Expo Go compatible admin demo |
| `.maestro/demo/ios-driver-demo.yaml` | NEW — Expo Go compatible driver demo |
| `.maestro/demo/android-admin-demo.yaml` | NEW — Expo Go compatible admin demo |
| `.maestro/demo/android-driver-demo.yaml` | NEW — Expo Go compatible driver demo |

### Web E2E tests
| File | Change |
|------|--------|
| `tests/e2e-web/helpers/admin.setup.ts` | Timeout 15s → 30s |
| `tests/e2e-web/helpers/client.setup.ts` | Timeout 15s → 30s |
| `tests/e2e-web/helpers/driver.setup.ts` | Timeout 15s → 30s |
| `tests/e2e-web/tests/admin/photo-approval.spec.ts` | Updated assertions for Photo Management |
| `tests/e2e-web/tests/admin/users.spec.ts` | Strict mode fixes for Admin User |
| `tests/e2e-web/tests/client/campaign-view.spec.ts` | Updated to Campaign Portal header |
| `tests/e2e-web/tests/client/login.spec.ts` | Increased redirect timeout |
| `tests/e2e-web/playwright.config.ts` | Workers capped at 3, BASE_URL 8080 → 8081 |
| `tests/e2e-web/.env.test` | BASE_URL 8080 → 8081 |

---

## E2E Test Results

### Mobile (Maestro)
| Test Flow | iOS (iPhone 16e, iOS 26.3) | Android (Pixel 7 API 36) |
|---|---|---|
| Admin Campaign Flow | **PASS** | **PASS** |
| Driver Shift Flow | **PASS** | **PASS** |

### Web (Playwright)
| Suite | Tests | Status |
|-------|-------|--------|
| Admin (login, photo-mgmt, users) | 10 | **ALL PASS** |
| Client (switcher, view, login) | 12 | **ALL PASS** |
| Driver (campaign, shift, sign-out) | 4 | **ALL PASS** |
| **Total** | **26** | **26 PASS** |

---

## WhatsApp Template Reference

| Field | Value |
|-------|-------|
| Template name | `campaign_photo` |
| Language | `en` |
| Status | APPROVED |
| WABA ID | 27180034878253404 |
| Phone Number ID | 1020192901182431 |
| Sender | +1 555-193-3139 (Test Number) |
| Header | TEXT: "Campaign Photo Update" |
| Body | `New photo uploaded for "{{1}}" - {{2}}` |
| Footer | `LoneStar Campaign Proof` |
| Param {{1}} | Campaign title |
| Param {{2}} | Driver note (or "No additional notes") |

**Also available:**
- `lonestar_proof_ready_v1` (en_US, APPROVED) — 3 body params (client name, campaign, route)
- `hello_world` (en_US, APPROVED) — Meta default test template

---

## Current State

### Branches
| Branch | Status |
|--------|--------|
| `main` (mobile) | v0.5.0 — PR #33 merged, 8 dependabot PRs merged |
| `main` (web) | v1.5.0 — no changes today |

### Infrastructure
| Item | Status |
|------|--------|
| iOS Simulator | iPhone 16e (A4152A57), iOS 26.3, booted |
| Android Emulator | Pixel_7_API_36, Android 36, booted |
| Metro | Running on port 8083 |
| Web app | Running on port 8081 |
| Supabase | cleooniqbagrpewlkans, all data intact |
| Campaign date | 2026-03-27 (needs daily update for driver flow) |
| WhatsApp | LIVE — template approved, messages delivering |
| Edge function | v8 — template + image follow-up |

### Open PRs
| Repo | PR | Status |
|------|----|--------|
| Mobile | #25 (expo-device major bump) | Deferred — needs Expo SDK upgrade |

---

## Remaining Tasks

### Immediate (Start here tomorrow)

1. **Update campaign date** — Must update daily for driver flow:
   ```bash
   # Get admin JWT
   TOKEN=$(curl -s -X POST "https://cleooniqbagrpewlkans.supabase.co/auth/v1/token?grant_type=password" \
     -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZW9vbmlxYmFncnBld2xrYW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NjEyMzUsImV4cCI6MjA4OTAzNzIzNX0.yEG8DbkKijawQ9IfztHEAWjk-Jw5r_-V-slgNLEwwr8" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@adtruck.com","password":"mawqex-rYsneq-kynja5"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

   curl -X PATCH "https://cleooniqbagrpewlkans.supabase.co/rest/v1/campaigns?id=eq.00000000-0000-0000-0000-000000000010" \
     -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZW9vbmlxYmFncnBld2xrYW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NjEyMzUsImV4cCI6MjA4OTAzNzIzNX0.yEG8DbkKijawQ9IfztHEAWjk-Jw5r_-V-slgNLEwwr8" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"campaign_date":"2026-03-28"}'
   ```

2. **Commit web E2E fixes** — The test fixes are local only, need to commit and push.

3. **Commit edge function update** — The WhatsApp edge function changes are deployed but not committed to git.

### Short-term

4. **Campaign date automation** — The daily manual update is error-prone. Consider:
   - Supabase cron job: `UPDATE campaigns SET campaign_date = CURRENT_DATE WHERE id = '00000000-0000-0000-0000-000000000010'`
   - Or modify driver query to skip date filter in dev/test
   - Or create a "recurring" campaign that's always valid

5. **WhatsApp template v2** — Current template has TEXT header. Consider submitting a new version with IMAGE header so the photo appears inline in the template message (instead of as a separate follow-up message).

6. **Branch cleanup** — Delete merged feature branches:
   ```bash
   cd /Users/praneeth/LoneStar_ERP/adtruck-driver-native
   git branch -d fix/date-fns-v3 fix/coderabbit-followups feature/ui-components fix/zod-v4-standard-schema feature/admin-unified-login feat/mobile-ui-polish
   git push origin --delete fix/date-fns-v3 fix/coderabbit-followups feature/ui-components fix/zod-v4-standard-schema feature/admin-unified-login feat/mobile-ui-polish
   ```

7. **Expo SDK upgrade** — Required to merge dependabot PR #25 (expo-device 8 → 55). Plan the Expo 54 → 55 upgrade.

### Medium-term

8. **Hardcoded Metro port** — Maestro flows use hardcoded port 8083. Make configurable via env var.

9. **Hardcoded tab coordinates** — Maestro tab navigation uses device-specific pixel coordinates. Fragile across device sizes.

10. **Web app v1.6.0** — Tag after committing E2E fixes and any other web changes.

---

## Key Learnings / Notes for Tomorrow

1. **WhatsApp template secrets matter** — The `WHATSAPP_CLOUD_TEMPLATE_NAME` secret must match exactly. Use the Meta Graph API to verify: `GET /{WABA_ID}/message_templates?fields=name,status,language,components`

2. **Template language codes** — Meta templates use specific language codes (`en` vs `en_US`). The API returns "does not exist in en_US" even when sending `en` — it auto-maps. Always check the actual template language via the API.

3. **Maestro + Expo Go** — `clearState: true` requires a standalone build binary. For Expo Go, skip `clearState` and use `openLink` directly. Demo flows in `.maestro/demo/` work this way.

4. **Playwright worker race conditions** — Running too many parallel workers against Supabase auth causes flaky test failures. Cap workers at 3 for reliability.

5. **Android Maestro port forwarding** — After fresh emulator boot, run `adb forward tcp:7001 tcp:7001` before Maestro tests.

6. **Port 8081 conflict** — Web app runs on 8081 (Vite), forcing Metro to 8083. Keep this in mind for deep links and test configs.

---

## Test Credentials

| Role | Email | Password | Username |
|------|-------|----------|----------|
| Admin | admin@adtruck.com | mawqex-rYsneq-kyjna5 | admin |
| Driver | driver@adtruck.com | DriverPass123! | driver1 |
| Client | client@acme.com | ClientPass123! | client1 |

---

## Versions After Today

| Component | Version | Notes |
|-----------|---------|-------|
| Mobile app | v0.5.0 | PR #33 merged, 8 dependabot PRs merged |
| Web app | v1.5.0 | E2E fixes local (not yet committed) |
| Edge function | v8 | WhatsApp template + image follow-up |
| Expo SDK | 54 | |
| React Native | 0.81.5 | |
| Maestro | 2.3.0 | |
| Android AVD | Pixel_7_API_36 | |
| iOS Simulator | iPhone 16e, iOS 26.3 | |
| Playwright | 1.58.2 | 26/26 tests pass |
