# Supabase Schema Plan

This document turns [docs/screen-data-map.md](/Users/praneeth/LoneStar_ERP/adtruck-proof-main/docs/screen-data-map.md) into a concrete Supabase plan for the MVP.

Scope:

- 3 roles: `admin`, `driver`, `client`
- Supabase used for auth, Postgres, and storage
- password-based auth only
- schema should stay minimal and match the current UI
- no application code or migrations in this document

## Auth Model

- Use Supabase `auth.users` as the canonical authentication identity table.
- Use a public `profiles` table for app-facing identity, role, username, and display data.
- Keep `clients` separate from `profiles`.
- For MVP, the schema supports username/password by making `profiles.username` unique and required.
- The exact sign-in implementation is outside schema scope. Practical note: Supabase auth is still anchored to `auth.users`; username lookup will need an app-side or server-side auth flow later.

## Final Table List

1. `auth.users`
2. `public.profiles`
3. `public.clients`
4. `public.campaigns`
5. `public.driver_shifts`
6. `public.campaign_photos`

This is the minimal set needed for the current screens.

Not included for MVP:

- no payroll tables
- no GPS tables
- no chat tables
- no analytics tables
- no invoice tables
- no dedicated PDF/report table yet
- no campaign-to-client access join table yet

Reason for skipping a client access join table in MVP:

- the current UI only needs one client organization on each campaign
- a `client` user can be tied to one `clients` row through `profiles.client_id`
- campaign visibility can then be enforced by matching `profiles.client_id = campaigns.client_id`
- if product later needs per-user exceptions or multi-client sharing on a campaign, add a join table then

## Table Plan

### `auth.users`

- Purpose: Supabase-managed credential store and session identity.
- Primary key:
  - `id uuid`
- Columns relevant to this app:
  - Supabase-managed standard columns
- Foreign keys:
  - referenced by `profiles.id`
- Suggested indexes:
  - use Supabase defaults
- Enum/check recommendations:
  - none at app level
- Screens depending on this table:
  - all login flows
  - all protected routes indirectly through session state
- Role read/write:
  - no direct client app reads/writes
  - auth operations only
- RLS policy intention:
  - handled by Supabase auth internals, not custom app RLS

### `public.profiles`

- Purpose: app-level user identity, role, username, and client association.
- Primary key:
  - `id uuid`
- Exact columns:
  - `id uuid not null`
  - `role text not null`
  - `username text not null`
  - `display_name text not null`
  - `email text null`
  - `client_id uuid null`
  - `is_active boolean not null default true`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Foreign keys:
  - `id` references `auth.users(id)` on delete cascade
  - `client_id` references `clients(id)` on delete set null
- Suggested indexes:
  - unique index on `lower(username)`
  - index on `role`
  - index on `client_id`
- Enum/check recommendations:
  - `role in ('admin', 'driver', 'client')`
  - optional stricter check:
    - `role = 'client'` requires `client_id is not null`
    - `role in ('admin', 'driver')` requires `client_id is null`
- Screens depending on this table:
  - `DriverLogin`
  - `AdminLogin`
  - `ClientLogin`
  - `AdminCampaignList`
  - `AdminCampaignDetail`
  - `DriverCampaign`
  - all protected route checks
- Role read/write:
  - admin can read all profiles
  - admin can update non-auth app fields if user management is added later
  - each authenticated user can read their own profile
  - each authenticated user can update only their own non-role non-association profile fields if self-editing is ever enabled
  - driver/client should not read arbitrary other profiles directly
- RLS policy intention:
  - a user can select their own profile row
  - admins can select all profile rows
  - direct inserts should normally happen only through server/admin provisioning flow
  - users cannot change their own role

### `public.clients`

- Purpose: client organization/account shown on campaigns.
- Primary key:
  - `id uuid`
- Exact columns:
  - `id uuid not null`
  - `name text not null`
  - `is_active boolean not null default true`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Foreign keys:
  - none outbound
- Suggested indexes:
  - unique index on `lower(name)`
- Enum/check recommendations:
  - `name <> ''`
- Screens depending on this table:
  - `AdminCampaignList`
  - `AdminCreateCampaign`
  - `AdminCampaignDetail`
  - client permission checks through `profiles.client_id` and `campaigns.client_id`
- Role read/write:
  - admin can read and write
  - client users do not need direct table access for MVP if campaign queries join it for display
  - drivers do not need direct table access
- RLS policy intention:
  - admin full access
  - no direct read access for driver/client roles unless a specific joined query path requires it later

### `public.campaigns`

- Purpose: main campaign record shown across admin, driver, and client screens.
- Primary key:
  - `id uuid`
- Exact columns:
  - `id uuid not null`
  - `title text not null`
  - `campaign_date date not null`
  - `route_code text null`
  - `status text not null default 'draft'`
  - `client_id uuid not null`
  - `driver_profile_id uuid null`
  - `internal_notes text null`
  - `driver_daily_wage numeric(10,2) null`
  - `transport_cost numeric(10,2) null`
  - `other_cost numeric(10,2) null`
  - `created_by uuid not null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Foreign keys:
  - `client_id` references `clients(id)` on delete restrict
  - `driver_profile_id` references `profiles(id)` on delete set null
  - `created_by` references `profiles(id)` on delete restrict
- Suggested indexes:
  - index on `campaign_date`
  - index on `status`
  - index on `client_id`
  - index on `driver_profile_id`
  - composite index on `(client_id, campaign_date desc)`
  - composite index on `(driver_profile_id, campaign_date desc)`
- Enum/check recommendations:
  - `status in ('draft', 'pending', 'active', 'completed')`
  - costs `>= 0` when not null
  - `title <> ''`
- Screens depending on this table:
  - `AdminCampaignList`
  - `AdminCreateCampaign`
  - `AdminCampaignDetail`
  - `AdminPhotoApproval`
  - `DriverCampaign`
  - `DriverUpload`
  - `ClientCampaignView`
  - `ClientTimingSheet`
- Role read/write:
  - admin can read and write all campaigns
  - driver can read only campaigns where `driver_profile_id = auth.uid()`
  - client can read only campaigns where `campaigns.client_id = profiles.client_id` for the logged-in client user
  - only admin can create/update campaign metadata and costs
- RLS policy intention:
  - admins have full access
  - drivers can only select their assigned campaigns
  - clients can only select campaigns belonging to their client organization
  - no driver/client writes to campaign rows

### `public.driver_shifts`

- Purpose: persist shift start/end state for the driver campaign flow and timing sheet.
- Primary key:
  - `id uuid`
- Exact columns:
  - `id uuid not null`
  - `campaign_id uuid not null`
  - `driver_profile_id uuid not null`
  - `started_at timestamptz not null`
  - `ended_at timestamptz null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Foreign keys:
  - `campaign_id` references `campaigns(id)` on delete cascade
  - `driver_profile_id` references `profiles(id)` on delete restrict
- Suggested indexes:
  - index on `campaign_id`
  - index on `driver_profile_id`
  - composite index on `(campaign_id, started_at desc)`
  - composite index on `(driver_profile_id, started_at desc)`
  - unique partial index on `(driver_profile_id)` where `ended_at is null`
- Enum/check recommendations:
  - `ended_at is null or ended_at >= started_at`
- Screens depending on this table:
  - `DriverCampaign`
  - `AdminCampaignDetail`
  - `ClientTimingSheet`
- Role read/write:
  - admin can read all and update if operational correction is needed
  - driver can read their own shift rows
  - driver can insert a shift row for their assigned campaign
  - driver can update only their own active shift row to set `ended_at`
  - client can read only shift rows for campaigns visible to their client organization
- RLS policy intention:
  - admin full access
  - driver can only create/update shift rows where `driver_profile_id = auth.uid()` and the related campaign is assigned to them
  - client read-only access only through campaigns tied to their client organization

### `public.campaign_photos`

- Purpose: store proof photo metadata, note, review state, and storage path.
- Primary key:
  - `id uuid`
- Exact columns:
  - `id uuid not null`
  - `campaign_id uuid not null`
  - `uploaded_by uuid not null`
  - `storage_path text not null`
  - `note text null`
  - `submitted_at timestamptz not null default now()`
  - `captured_at timestamptz null`
  - `status text not null default 'pending'`
  - `reviewed_by uuid null`
  - `reviewed_at timestamptz null`
  - `rejection_reason text null`
- Foreign keys:
  - `campaign_id` references `campaigns(id)` on delete cascade
  - `uploaded_by` references `profiles(id)` on delete restrict
  - `reviewed_by` references `profiles(id)` on delete set null
- Suggested indexes:
  - index on `campaign_id`
  - index on `uploaded_by`
  - index on `status`
  - composite index on `(campaign_id, submitted_at desc)`
  - composite index on `(campaign_id, status, submitted_at desc)`
  - composite index on `(uploaded_by, submitted_at desc)`
- Enum/check recommendations:
  - `status in ('pending', 'approved', 'rejected')`
  - `storage_path <> ''`
  - optional stricter review check:
    - if `status = 'pending'`, then `reviewed_by` and `reviewed_at` should be null
    - if `status in ('approved', 'rejected')`, then `reviewed_by` and `reviewed_at` should be non-null
- Screens depending on this table:
  - `DriverCampaign`
  - `DriverUpload`
  - `DriverUploadSuccess`
  - `AdminCampaignDetail`
  - `AdminPhotoApproval`
  - `ClientCampaignView`
  - `ClientTimingSheet`
- Role read/write:
  - admin can read all photos and update review fields/status
  - driver can read their own campaign photos for assigned campaigns
  - driver can insert photos only for assigned campaigns
  - client can read only approved photos for campaigns tied to their client organization
  - client cannot insert or update
- RLS policy intention:
  - admin full read/write
  - driver read/write only for photos on campaigns assigned to them
  - driver cannot change review fields on existing rows
  - client read-only and only where:
    - campaign belongs to their client organization
    - `status = 'approved'`

## Screen-to-Table Dependency Summary

### Driver screens

- `DriverLogin`
  - `auth.users`
  - `profiles`
- `DriverCampaign`
  - `profiles`
  - `campaigns`
  - `driver_shifts`
  - `campaign_photos`
- `DriverUpload`
  - `campaigns`
  - `campaign_photos`
  - storage bucket
- `DriverUploadSuccess`
  - optional read from `campaign_photos` if the page becomes refresh-safe later

### Admin screens

- `AdminLogin`
  - `auth.users`
  - `profiles`
- `AdminCampaignList`
  - `campaigns`
  - `clients`
  - `profiles`
- `AdminCreateCampaign`
  - `campaigns`
  - `clients`
  - `profiles`
- `AdminCampaignDetail`
  - `campaigns`
  - `clients`
  - `profiles`
  - `driver_shifts`
  - `campaign_photos`
- `AdminPhotoApproval`
  - `campaigns`
  - `campaign_photos`
  - `profiles`

### Client screens

- `ClientLogin`
  - `auth.users`
  - `profiles`
- `ClientCampaignView`
  - `campaigns`
  - `clients`
  - `campaign_photos`
- `ClientTimingSheet`
  - `campaigns`
  - `driver_shifts`
  - `campaign_photos`

## Role Access Summary

### Admin

- Read/write:
  - `profiles`
  - `clients`
  - `campaigns`
  - `driver_shifts`
  - `campaign_photos`
- Storage:
  - read any campaign photo object
  - no need to upload campaign proof photos in MVP

### Driver

- Read:
  - own `profiles` row
  - assigned `campaigns`
  - own `driver_shifts`
  - `campaign_photos` for assigned campaigns, mainly own uploads
- Write:
  - create/end own `driver_shifts`
  - insert `campaign_photos` for assigned campaigns
- Storage:
  - upload into assigned campaign photo paths
  - read back own or campaign photos only if the app needs it

### Client

- Read:
  - own `profiles` row
  - `campaigns` belonging to their client organization
  - approved `campaign_photos` on those campaigns
  - related `driver_shifts` for timing-sheet display on those campaigns
- Write:
  - none at MVP app-data level
- Storage:
  - no direct bucket listing
  - receive signed URLs for approved photos only

## RLS Policy Intentions In Plain English

### `profiles`

- A logged-in user can see their own profile row.
- Admin users can see all profile rows.
- Normal users cannot browse other users’ profiles.
- No user can promote themselves to another role.

### `clients`

- Only admins need direct read/write access in MVP.
- Client users do not need direct table browsing if campaigns already join the client name for display.

### `campaigns`

- Admins can create, update, and read all campaigns.
- Drivers can read only campaigns assigned to them.
- Clients can read only campaigns whose `client_id` matches their own `profiles.client_id`.
- Drivers and clients cannot edit campaign metadata, status, costs, or assignments.

### `driver_shifts`

- Admins can read all shift rows.
- Drivers can create a shift only for a campaign assigned to them.
- Drivers can end only their own active shift.
- Clients can read shift rows only for campaigns they are allowed to view.

### `campaign_photos`

- Admins can read all photo rows and approve/reject them.
- Drivers can upload photos only to campaigns assigned to them.
- Drivers can read photo rows only for campaigns assigned to them.
- Clients can read only approved photo rows for campaigns tied to their client organization.
- Pending and rejected photo rows must never be visible to clients.

## Storage Bucket Plan For Campaign Photos

- Bucket name:
  - `campaign-photos`
- Bucket privacy:
  - private
- Why private:
  - admin review and client visibility depend on campaign assignment and approval state
  - public object URLs would bypass that control
- Object path convention:
  - `campaigns/{campaign_id}/photos/{photo_id}/original`
- Why this path:
  - stable grouping by campaign
  - one folder per photo row
  - easy to replace/extend later with additional derived sizes
- Upload sequence for later implementation:
  1. create `campaign_photos` row with generated `id`
  2. upload file to `campaign-photos/campaigns/{campaign_id}/photos/{photo_id}/original`
  3. update row if needed with final `storage_path`
- Storage access intention:
  - admin can read any object
  - driver can upload only inside assigned campaign paths
  - clients do not browse the bucket directly
  - approved client images should be delivered via signed URLs or controlled server-side proxying

## PDF Records: How To Handle Them For Now

Current UI has placeholder `Export PDF` buttons, but PDF persistence is not required for MVP.

Plan for now:

- do not add a `reports`, `pdfs`, or `exports` table yet
- do not add a storage bucket for PDFs yet
- treat PDF export as an on-demand generated artifact later
- if the first implementation only downloads a generated file and does not need history, there is no database impact

When to add a PDF table later:

- only if the product needs:
  - saved generated reports
  - version history
  - audit trail of exports
  - downloadable links that persist over time

## Sample Row Relationships For One Campaign Lifecycle

Example entities:

- `auth.users`
  - `u_admin`
  - `u_driver_john`
  - `u_client_acme_1`
- `clients`
  - `c_acme` -> `name = 'Acme Corp'`
- `profiles`
  - `u_admin` -> `role = 'admin'`, `username = 'ops_admin'`, `client_id = null`
  - `u_driver_john` -> `role = 'driver'`, `username = 'john.d'`, `client_id = null`
  - `u_client_acme_1` -> `role = 'client'`, `username = 'acme.portal'`, `client_id = c_acme`
- `campaigns`
  - `camp_001`
  - `title = 'Downtown Billboard Route'`
  - `campaign_date = 2026-03-11`
  - `route_code = 'A-7'`
  - `status = 'active'`
  - `client_id = c_acme`
  - `driver_profile_id = u_driver_john`
  - `created_by = u_admin`
- `driver_shifts`
  - `shift_001`
  - `campaign_id = camp_001`
  - `driver_profile_id = u_driver_john`
  - `started_at = 2026-03-11 09:00`
  - later `ended_at = 2026-03-11 17:00`
- `campaign_photos`
  - `photo_001`
  - `campaign_id = camp_001`
  - `uploaded_by = u_driver_john`
  - `status = 'approved'`
  - `note = 'Billboard at Main St'`
  - `reviewed_by = u_admin`
  - `reviewed_at = 2026-03-11 10:40`
  - `storage_path = 'campaigns/camp_001/photos/photo_001/original'`
  - `photo_002`
  - `campaign_id = camp_001`
  - `uploaded_by = u_driver_john`
  - `status = 'pending'`
  - `note = 'Route checkpoint B'`
  - `storage_path = 'campaigns/camp_001/photos/photo_002/original'`

What each role sees in that lifecycle:

- admin sees `camp_001`, both photos, and the shift row
- driver sees `camp_001`, their own shift row, and their campaign photos
- client sees `camp_001`, `shift_001`, and only `photo_001` because `photo_002` is still pending

## Schema Decisions Taken

- Use `auth.users + profiles` as the auth identity pattern.
- Keep `clients` separate from `profiles`.
- Use `profiles.client_id` for MVP client-organization access instead of adding a separate campaign-access join table now.
- Keep one direct campaign-to-client relationship through `campaigns.client_id`.
- Keep one direct campaign-to-driver relationship through `campaigns.driver_profile_id`.
- Store shift events in `driver_shifts` rather than on the `campaigns` row.
- Store proof photos in `campaign_photos` with review status and a private storage path.
- Keep the photo bucket private.
- Do not add a PDF persistence table yet.
- Reuse UI status values directly in database constraints where possible:
  - campaign: `draft`, `pending`, `active`, `completed`
  - photo: `pending`, `approved`, `rejected`

## Open Questions Requiring Product Decision

- Should admin and client really sign in with username, or should they keep email/password while drivers use username/password?
- If username/password is mandatory for every role, what is the exact operational provisioning flow for creating users in Supabase auth?
- Should a client user see all campaigns for their client organization, or only a single current campaign in MVP?
- Can a campaign ever have no assigned driver at creation time, or should `driver_profile_id` be mandatory once the form is wired?
- Should drivers be allowed to view only their own uploaded photos, or all photos on their assigned campaign?
- Is `rejection_reason` required in MVP when an admin rejects a photo, or optional?
- Does the product need saved PDF history at all, or only ad hoc export?

## Safe Implementation Order

1. Create `profiles`, `clients`, `campaigns`, `driver_shifts`, and `campaign_photos`.
2. Add constraints and indexes before writing app code.
3. Set up RLS for `profiles`, `campaigns`, `driver_shifts`, and `campaign_photos`.
4. Create the private `campaign-photos` bucket and its storage policies.
5. Wire auth and profile bootstrapping.
6. Wire admin campaign reads first.
7. Wire driver assigned-campaign read plus shift start/end mutations.
8. Wire driver photo upload metadata plus storage upload.
9. Wire admin photo approval mutations.
10. Wire client approved-photo and timing-sheet reads last.

## Optional Appendix: Migration Notes

- Prefer database check constraints over app-only validation for role/status/cost rules.
- Prefer partial unique indexes for active-shift enforcement instead of app-only checks.
- Keep `updated_at` management consistent from the start, either via trigger or explicit application writes.
