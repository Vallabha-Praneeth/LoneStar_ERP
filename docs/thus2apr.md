# AdTruck ERP Schema v2 — Progress Log

## Phase 1: SQL Migration + TypeScript Types (COMPLETED)

**Agent:** Main orchestrator
**Status:** DONE
**Date:** 2026-04-02

### Actions Taken

1. **Created `supabase/migrations/005_schema_v2.sql`**
   - 5 new tables: `drivers`, `routes`, `route_stops`, `cost_types`, `campaign_costs`
   - Altered `driver_shifts`: added `shift_status` (scheduled/active/completed/no_show/cancelled)
   - Altered `campaigns`: added `route_id` FK, `client_billed_amount`
   - Seeded 6 cost types: Driver Wage, Transport, Toll, Fuel, Parking, Other
   - Data backfill: existing drivers, shifts, routes from route_code, costs from flat columns
   - JWT-based RLS on all new tables (no profiles queries in USING/WITH CHECK)
   - `set_updated_at` triggers on drivers, routes
   - Deprecated old columns via COMMENT (route_code, driver_daily_wage, transport_cost, other_cost)

2. **Updated `src/lib/types.ts`**
   - Added types: `ShiftStatus`, `Driver`, `Route`, `RouteStop`, `CostType`, `CampaignCost`
   - Updated `Campaign`: added `route_id`, `client_billed_amount`, deprecated markers on old fields
   - Updated `DriverShift`: added `shift_status`

### Key Decisions
- Old columns kept (not dropped) for backward compatibility during Phase 2 transition
- `drivers.profile_id` is UNIQUE (1:1 with profiles)
- Route uniqueness: `lower(name) + COALESCE(lower(city), '')`
- Driver RLS for campaign_costs: can only see their own campaign's "Driver Wage" cost type
- Cost types seeded but admin can create more at runtime

### Known Issues / Notes for Next Agent
- Migration has NOT been run in Supabase yet (user needs to run manually)
- `002_rls_policies.sql` has a `get_my_role()` function that queries profiles — potential conflict with JWT-based policies in 001/005. May need cleanup.
- Edge function `create-user` does NOT yet create a `drivers` row — needs update in Phase 2 or 3
- Types file still missing Google Drive columns from migration 004 (pre-existing gap, not introduced by this phase)

---

## Phase 2: App Code — Switch to New Schema (COMPLETED)

**Agent:** Phase 2 agent
**Status:** DONE
**Date:** 2026-04-02

### Critical Review of Phase 1
- SQL migration reviewed: no syntax issues, RLS policies correct (JWT-based), indexes present, backfill logic sound
- Types file reviewed: matches schema accurately, deprecated markers in place
- No fixes needed for Phase 1 output

### Files Created
1. **`src/components/CampaignCostEditor.tsx`** — Reusable dynamic cost line-item editor
   - Each row: cost type Select, amount Input, notes Input, Remove button
   - "Add Cost" button to append rows
   - Exports `CostRow` interface for parent components

### Files Modified
2. **`src/pages/admin/AdminCreateCampaign.tsx`**
   - Route Code input replaced with Select dropdown querying `routes` table + "Create New" toggle for inline route creation
   - 3 fixed cost inputs replaced with `CampaignCostEditor` component
   - Added `client_billed_amount` input in a Client Billing section
   - Drivers query now joins `drivers` table to fetch `base_daily_wage`
   - On driver selection, auto-populates a "Driver Wage" cost row if base_daily_wage is set
   - On submit: inserts campaign with `route_id` + `client_billed_amount`, batch-inserts `campaign_costs`, sets deprecated columns to null

3. **`src/pages/admin/AdminEditCampaign.tsx`**
   - Same route/cost/billing changes as CreateCampaign
   - On mount: loads existing `campaign_costs` and populates CampaignCostEditor
   - On save: deletes old campaign_costs, inserts new ones (replace strategy)
   - Queries `route_id` and `client_billed_amount` instead of deprecated columns

4. **`src/pages/admin/AdminCampaignDetail.tsx`**
   - Joins `routes:route_id ( name, city )` — displays route name instead of route_code
   - Joins `campaign_costs ( id, amount, notes, cost_types ( name ) )` — displays cost line items in a table
   - Shows total internal cost, client_billed_amount, profit margin in Financial Summary section
   - Shows `shift_status` badges on driver shifts using Badge component
   - Delete handler now also deletes `campaign_costs` before campaign
   - Added DollarSign, MapPin imports

5. **`src/pages/admin/AdminCampaignList.tsx`**
   - Query now joins `campaign_costs ( amount )` and selects `client_billed_amount`
   - `totalCost()` sums `campaign_costs` amounts instead of flat columns
   - Displays client billed amount in campaign cards when present

6. **`src/pages/driver/DriverCampaign.tsx`**
   - Query joins `routes:route_id ( name )` — displays route name (falls back to route_code)
   - `startShift` includes `shift_status: 'active'`
   - `endShift` sets both `ended_at` and `shift_status: 'completed'`

7. **`src/lib/generateCampaignPdf.ts`**
   - `CampaignPdfData` interface updated: `routes` object instead of `route_code`, `campaign_costs` array instead of flat cost fields, added `client_billed_amount`
   - Route display uses `routes.name`
   - Cost breakdown iterates `campaign_costs` array dynamically
   - Financial Summary includes client billed amount and profit margin rows

8. **`src/components/CreateDriverDialog.tsx`**
   - Added `base_daily_wage` and `city` input fields
   - After profile creation via edge function, inserts a row into `drivers` table
   - Non-fatal handling if drivers insert fails (profile already created)

### Build Status
- TypeScript: 0 errors (`npx tsc --noEmit` passes)
- Vite build: succeeds in 2.4s

---

### Known Issues / Notes for Phase 3
- Edge function `create-user` does NOT create a `drivers` row — the client-side `CreateDriverDialog` handles it. Consider moving this to the edge function for consistency.
- The `drivers` query in `AdminCreateCampaign` uses a join through profiles → drivers. If a driver profile has no `drivers` row (pre-migration driver created before backfill ran), `base_daily_wage` will be null — this is acceptable behavior.
- Deprecated columns (`route_code`, `driver_daily_wage`, `transport_cost`, `other_cost`) are still in the DB and set to null on writes. Phase 3 cleanup migration should drop them.
- `DriverCampaign` route display falls back to `route_code` for campaigns created before migration. After cleanup migration drops `route_code`, this fallback can be removed.

---

## Phase 3: New Admin Pages + Cleanup (COMPLETED)

**Agent:** Phase 3 agent
**Status:** DONE
**Date:** 2026-04-02

### Critical Review of Phase 2
- All 8 files reviewed: no TypeScript errors, Supabase queries well-formed, cost calculations correct
- `shift_status` set correctly on start ("active") and end ("completed")
- `CampaignCostEditor` component clean and reusable
- `generateCampaignPdf` properly iterates campaign_costs array with profit margin
- `CreateDriverDialog` correctly inserts drivers table row after profile creation
- `DriverCampaign` route display falls back to `route_code` for pre-migration data (acceptable)
- No fixes needed for Phase 2 output

### Files Created
1. **`src/pages/admin/AdminRouteList.tsx`** — `/admin/routes`
   - Lists all routes with name, city, active status, stop count
   - Search/filter by name or city
   - Toggle `is_active` via Switch component
   - "Create Route" button links to create page
   - Card-based list matching AdminCampaignList patterns

2. **`src/pages/admin/AdminRouteForm.tsx`** — `/admin/routes/create` and `/admin/routes/:id/edit`
   - Shared create/edit form (detects edit mode via `:id` param)
   - Route name, city, is_active toggle
   - Dynamic stop list with ordered stops (venue_name, address)
   - Add/remove stops, up/down reorder buttons
   - Create: inserts route then batch-inserts stops
   - Edit: loads existing route + stops, updates route, replaces stops (delete old + insert new)

3. **`src/pages/admin/AdminDriverDetail.tsx`** — `/admin/drivers/:id`
   - Loads driver record by profile_id (`:id` = profile UUID)
   - Editable fields: license_number, license_type, license_expiry, emergency_contact_name, emergency_contact_phone, base_daily_wage, city
   - Handles case where drivers row doesn't exist yet (creates it on save)
   - Shows profile display_name and username in header

4. **`src/pages/admin/AdminCostTypes.tsx`** — `/admin/settings/cost-types`
   - Lists all cost types with active status
   - Inline form to add new cost type
   - Toggle is_active (deactivate rather than delete for historical data)
   - Clean table/list layout inside a card

5. **`supabase/migrations/006_drop_deprecated.sql`**
   - Drops deprecated columns: `route_code`, `driver_daily_wage`, `transport_cost`, `other_cost` from campaigns table

### Files Modified
6. **`src/App.tsx`** — Added lazy imports + 5 new routes under admin layout:
   - `/admin/routes`, `/admin/routes/create`, `/admin/routes/:id/edit`
   - `/admin/drivers/:id`
   - `/admin/settings/cost-types`

7. **`src/components/AdminSidebar.tsx`** — Added "Routes" (MapPin icon) and "Settings" (Settings icon) nav items

8. **`src/components/AdminLayout.tsx`** — Added "Routes" and "Settings" to mobile nav items

9. **`src/pages/admin/AdminUsers.tsx`** — Added "Details" link button for driver-role users, linking to `/admin/drivers/:id`

### Build Status
- TypeScript: 0 errors (`npx tsc --noEmit` passes)
- Vite build: succeeds in 2.28s

---

## Summary: Schema v2 Migration (Complete)

### Phase 1 — SQL Migration + Types
- Created 5 new tables: `drivers`, `routes`, `route_stops`, `cost_types`, `campaign_costs`
- Added `shift_status` to `driver_shifts`, `route_id` + `client_billed_amount` to `campaigns`
- JWT-based RLS on all new tables
- Updated TypeScript types to match

### Phase 2 — App Code Switch
- All campaign pages (create, edit, detail, list) switched to normalized schema
- Dynamic cost line-item editor (`CampaignCostEditor`)
- Route selector with inline creation
- Financial summary with profit margin in detail view and PDF
- Driver shift status badges
- `CreateDriverDialog` creates `drivers` table row

### Phase 3 — New Admin Pages + Cleanup
- 4 new admin pages: Route List, Route Form (create/edit), Driver Detail, Cost Types
- Router, sidebar, and mobile nav updated
- Driver detail link added to Users page
- Cleanup migration ready to drop deprecated columns

### Remaining TODOs
- Run `005_schema_v2.sql` and `006_drop_deprecated.sql` in Supabase SQL editor
- After running 006, remove `route_code` fallback from `DriverCampaign.tsx` (line 227)
- After running 006, remove deprecated column writes (`route_code: null`, `driver_daily_wage: null`, etc.) from `AdminCreateCampaign.tsx` and `AdminEditCampaign.tsx`
- Consider moving `drivers` table insert from `CreateDriverDialog` to `create-user` edge function
- WhatsApp integration still broken (Meta account removed — see docs/thus2.md)
