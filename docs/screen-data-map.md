# Screen Data Map

Source of truth for this document is the current route tree in `src/App.tsx`, the page files in `src/pages/**`, and the shared components used by those pages. This is a UI/spec document only. No backend code is implied here.

Current routes in scope:

- `/` -> `src/pages/RoleSelect.tsx`
- `/driver/login` -> `src/pages/driver/DriverLogin.tsx`
- `/driver/campaign` -> `src/pages/driver/DriverCampaign.tsx`
- `/driver/upload` -> `src/pages/driver/DriverUpload.tsx`
- `/driver/upload-success` -> `src/pages/driver/DriverUploadSuccess.tsx`
- `/admin/login` -> `src/pages/admin/AdminLogin.tsx`
- `/admin/campaigns` -> `src/pages/admin/AdminCampaignList.tsx`
- `/admin/campaigns/create` -> `src/pages/admin/AdminCreateCampaign.tsx`
- `/admin/campaigns/:id` -> `src/pages/admin/AdminCampaignDetail.tsx`
- `/admin/campaigns/:id/photos` -> `src/pages/admin/AdminPhotoApproval.tsx`
- `/client/login` -> `src/pages/client/ClientLogin.tsx`
- `/client/campaign` -> `src/pages/client/ClientCampaignView.tsx`
- `/client/campaign/timing` -> `src/pages/client/ClientTimingSheet.tsx`
- `*` -> `src/pages/NotFound.tsx`

## Global Screens

### Role Select

- Purpose: entry chooser that sends the user into the driver, admin, or client login flow.
- Role: unauthenticated.
- Route/page file: `/` -> `src/pages/RoleSelect.tsx`.
- Fields shown:
  - app mark and app name
  - 3 role cards: Driver, Admin, Client
  - short role descriptions
- Actions/buttons:
  - Driver card -> `/driver/login`
  - Admin card -> `/admin/login`
  - Client card -> `/client/login`
- Static/demo today:
  - role labels, descriptions, icons, and target routes
- Must come from database later:
  - nothing required for MVP
- Actions that will mutate database later:
  - none
- Visibility/permission rules:
  - public
- Notes for Supabase integration later:
  - this screen should stay outside auth
  - if role-specific deep links are added later, keep this page as a fallback entry point, not a protected screen

### Not Found

- Purpose: fallback for unknown routes.
- Role: any.
- Route/page file: `*` -> `src/pages/NotFound.tsx`.
- Fields shown:
  - 404 heading
  - not found message
  - return to home link
- Actions/buttons:
  - `Return to Home` -> `/`
- Static/demo today:
  - entire screen
- Must come from database later:
  - nothing
- Actions that will mutate database later:
  - none
- Visibility/permission rules:
  - public
- Notes for Supabase integration later:
  - no data dependency
  - optional later: log unknown protected-route access to monitoring, not to product tables

## Driver Screens

### Driver Login

- Purpose: authenticate a driver before showing the assigned campaign workflow.
- Role: driver.
- Route/page file: `/driver/login` -> `src/pages/driver/DriverLogin.tsx`.
- Fields shown:
  - username input
  - password input
  - password visibility toggle
- Actions/buttons:
  - `Sign In` -> currently navigates to `/driver/campaign`
- Static/demo today:
  - title/subtitle copy
  - no validation
  - submit always succeeds
- Must come from database later:
  - credential validation result
  - driver identity and role
  - assigned campaign context after login
- Actions that will mutate database later:
  - auth session creation
  - optional login audit row if the product wants it
- Visibility/permission rules:
  - public until authenticated
  - after login, driver-only session
- Notes for Supabase integration later:
  - current UI already matches username/password, not OTP
  - keep a unique driver username in profile data
  - successful sign-in should redirect to the current assigned campaign, not a hardcoded route if no campaign exists

### Driver Campaign

- Purpose: show the driver’s current campaign, let them start/end shift, and enter photo upload.
- Role: driver.
- Route/page file: `/driver/campaign` -> `src/pages/driver/DriverCampaign.tsx`.
- Fields shown:
  - campaign title: `Downtown Billboard Route`
  - campaign date and route label: `March 11, 2026 • Route A-7`
  - status badge based on local `shiftStarted`
  - optional shift started banner with login time
  - recent upload rows with time and status
- Actions/buttons:
  - back chevron -> `/`
  - `Start Shift`
  - `Upload Photo`
  - `End Shift`
- Static/demo today:
  - campaign title/date/route
  - recent uploads list
  - shift status and login time are local component state only
- Must come from database later:
  - current campaign assigned to logged-in driver
  - campaign status
  - active shift state
  - start time / end time
  - recent uploads for this campaign and driver
- Actions that will mutate database later:
  - `Start Shift` -> create or update a driver shift row
  - `End Shift` -> close the active driver shift row
- Visibility/permission rules:
  - only authenticated drivers
  - driver should only see campaigns assigned to that driver
- Notes for Supabase integration later:
  - do not trust route access alone; enforce assignment-based reads in RLS
  - recent uploads should be filtered by `campaign_id` and `uploaded_by`
  - if a driver has no active assignment, this screen needs an empty state before wiring

### Driver Upload

- Purpose: let the driver submit a campaign photo with an optional note.
- Role: driver.
- Route/page file: `/driver/upload` -> `src/pages/driver/DriverUpload.tsx`.
- Fields shown:
  - upload state placeholder
  - `Take Photo` option
  - `Gallery` option
  - optional note textarea
  - submit button
- Actions/buttons:
  - back chevron -> `/driver/campaign`
  - `Take Photo`
  - `Gallery`
  - `Change`
  - `Submit Photo`
- Static/demo today:
  - no real file selection
  - `hasImage` is a boolean toggle only
  - preview is placeholder text, not an actual image
  - note is local state only
- Must come from database later:
  - nothing for initial render beyond campaign context
  - after upload, the submitted row should be queryable
- Actions that will mutate database later:
  - upload image to storage
  - create `campaign_photos` row with note, upload time, status `pending`, campaign id, and driver id
- Visibility/permission rules:
  - only authenticated drivers
  - upload must be limited to the driver’s assigned campaign
- Notes for Supabase integration later:
  - this screen needs real file input/camera capture wiring before backend integration can succeed
  - store storage path, not public third-party image URLs
  - capture both `submitted_at` and optional client-facing capture timestamp if needed

### Driver Upload Success

- Purpose: confirm the photo submission and send the driver back to the campaign view.
- Role: driver.
- Route/page file: `/driver/upload-success` -> `src/pages/driver/DriverUploadSuccess.tsx`.
- Fields shown:
  - success icon
  - success message
  - pending approval badge/message
- Actions/buttons:
  - `Back to Campaign` -> `/driver/campaign`
- Static/demo today:
  - entire screen
- Must come from database later:
  - optional submitted photo id or latest submission status if this page is refreshed directly
- Actions that will mutate database later:
  - none
- Visibility/permission rules:
  - authenticated drivers only
- Notes for Supabase integration later:
  - this page can stay static if reached immediately after successful upload
  - if deep-linkable later, it needs a submission identifier in route or state

## Admin Screens

### Admin Login

- Purpose: authenticate an admin before showing campaign management pages.
- Role: admin.
- Route/page file: `/admin/login` -> `src/pages/admin/AdminLogin.tsx`.
- Fields shown:
  - email-labeled input
  - password input
  - password visibility toggle
- Actions/buttons:
  - `Sign In` -> currently navigates to `/admin/campaigns`
- Static/demo today:
  - no real auth
  - submit always succeeds
- Must come from database later:
  - credential validation result
  - admin identity and role
- Actions that will mutate database later:
  - auth session creation
- Visibility/permission rules:
  - public until authenticated
  - admin-only session after login
- Notes for Supabase integration later:
  - current UI is password-based already, but the field label says `Email`
  - MVP requirement says username/password, so credential policy and UI label need to match before wiring

### Admin Campaign List

- Purpose: list campaigns and provide entry points to create or inspect a campaign.
- Role: admin.
- Route/page file: `/admin/campaigns` -> `src/pages/admin/AdminCampaignList.tsx`.
- Fields shown:
  - page title and subtitle
  - search input
  - list rows with:
    - campaign title
    - client name
    - driver name
    - date
    - status badge
- Actions/buttons:
  - `New Campaign` -> `/admin/campaigns/create`
  - search input
  - each row -> `/admin/campaigns/:id`
- Static/demo today:
  - `campaigns` array is hardcoded
  - search input is not wired
- Must come from database later:
  - campaign list
  - client and driver display names
  - date and status
  - search/filter results
- Actions that will mutate database later:
  - none on this screen unless search state is persisted, which is not needed for MVP
- Visibility/permission rules:
  - admin only
- Notes for Supabase integration later:
  - query should include client and driver names in one fetch path
  - list must support draft/pending/active/completed values already used by `StatusBadge`

### Admin Create Campaign

- Purpose: create a new campaign and attach core assignment/cost metadata.
- Role: admin.
- Route/page file: `/admin/campaigns/create` -> `src/pages/admin/AdminCreateCampaign.tsx`.
- Fields shown:
  - campaign title
  - client
  - driver
  - campaign date
  - internal notes
  - driver daily wage
  - transport cost
  - other cost
- Actions/buttons:
  - back arrow -> `navigate(-1)`
  - `Cancel`
  - `Create Campaign`
- Static/demo today:
  - all fields are uncontrolled inputs
  - no validation
  - client and driver are plain text inputs, not real selections
  - submit just navigates back to `/admin/campaigns`
- Must come from database later:
  - client options
  - driver options
  - saved campaign values after create
- Actions that will mutate database later:
  - insert campaign row
  - create any assignment/access rows needed for driver/client visibility
- Visibility/permission rules:
  - admin only
- Notes for Supabase integration later:
  - this page needs actual form state and validation before backend wiring
  - client and driver should use database-backed selectors, not free text, unless duplicate names are acceptable

### Admin Campaign Detail

- Purpose: show one campaign’s operational summary, internal notes, costs, and recent photos.
- Role: admin.
- Route/page file: `/admin/campaigns/:id` -> `src/pages/admin/AdminCampaignDetail.tsx`.
- Fields shown:
  - campaign title
  - campaign status badge
  - campaign date
  - info cards: client, driver, login time, logout time
  - internal notes
  - internal cost breakdown
  - photo cards with image, time, optional note, status
- Actions/buttons:
  - back arrow -> `navigate(-1)`
  - `Export PDF`
  - `View All` -> currently `/admin/campaigns/1/photos`
  - approve/reject buttons shown inside each `PhotoCard`
- Static/demo today:
  - all campaign metadata is hardcoded
  - `photos` array is hardcoded
  - approve/reject handlers are empty no-ops on this screen
  - `View All` link is hardcoded to campaign `1` instead of using the current route param
- Must come from database later:
  - campaign record by `:id`
  - driver/client names
  - shift times
  - internal notes
  - cost values
  - photo rows for the campaign
- Actions that will mutate database later:
  - if kept on this screen, approve/reject photo updates
  - export may later create a file record, but not required for MVP
- Visibility/permission rules:
  - admin only
- Notes for Supabase integration later:
  - load by route param
  - fix the hardcoded photo-approval link before wiring
  - if approvals are only meant to happen on the dedicated approval page, remove or disable the action buttons here when backend work starts

### Admin Photo Approval

- Purpose: bulk review and approve/reject photo submissions for one campaign.
- Role: admin.
- Route/page file: `/admin/campaigns/:id/photos` -> `src/pages/admin/AdminPhotoApproval.tsx`.
- Fields shown:
  - page title
  - campaign title text
  - pending count
  - grid of photo cards with image, time, note, status
- Actions/buttons:
  - back arrow -> `navigate(-1)`
  - `Approve All`
  - `Approve`
  - `Reject`
- Static/demo today:
  - `initialPhotos` is hardcoded
  - photo status changes are local state only
  - campaign title in subtitle is hardcoded
- Must come from database later:
  - photo queue for the selected campaign
  - approval status
  - campaign title
  - pending count derived from real rows
- Actions that will mutate database later:
  - single photo approve
  - single photo reject
  - bulk approve all pending photos for a campaign
- Visibility/permission rules:
  - admin only
- Notes for Supabase integration later:
  - use row-level updates keyed by `campaign_id` and photo id
  - bulk approve should be one backend action or a transaction-safe batch, not client-side looping only

## Client Screens

### Client Login

- Purpose: authenticate a client user before showing campaign proof screens.
- Role: client.
- Route/page file: `/client/login` -> `src/pages/client/ClientLogin.tsx`.
- Fields shown:
  - email-labeled input
  - password input
  - password visibility toggle
- Actions/buttons:
  - `Sign In` -> currently navigates to `/client/campaign`
- Static/demo today:
  - no real auth
  - submit always succeeds
- Must come from database later:
  - credential validation result
  - client identity and campaign access mapping
- Actions that will mutate database later:
  - auth session creation
- Visibility/permission rules:
  - public until authenticated
  - client-only session after login
- Notes for Supabase integration later:
  - same auth note as admin: UI is password-based but labeled `Email`
  - if MVP must be username/password for every role, this copy needs alignment before wiring

### Client Campaign View

- Purpose: show the client a campaign summary and only approved proof photos.
- Role: client.
- Route/page file: `/client/campaign` -> `src/pages/client/ClientCampaignView.tsx`.
- Fields shown:
  - campaign title
  - campaign date
  - campaign status badge
  - approved photo gallery
- Actions/buttons:
  - `Timing Sheet` link
  - mobile `View Timing Sheet` link
  - sign-out icon -> `/`
- Static/demo today:
  - campaign metadata is hardcoded
  - `approvedPhotos` array is hardcoded
  - sign-out only navigates home
- Must come from database later:
  - campaign record visible to the logged-in client
  - only approved photos for that campaign
  - current campaign status
- Actions that will mutate database later:
  - sign-out mutates auth session only
- Visibility/permission rules:
  - authenticated client only
  - client should only see campaigns explicitly granted to that client
  - rejected and pending photos must never appear here
- Notes for Supabase integration later:
  - current route shape assumes one campaign context
  - if clients need access to multiple campaigns later, this route structure will need expansion, but it is acceptable for a single-campaign MVP

### Client Timing Sheet

- Purpose: show a client-facing timeline of campaign activity.
- Role: client.
- Route/page file: `/client/campaign/timing` -> `src/pages/client/ClientTimingSheet.tsx`.
- Fields shown:
  - campaign title
  - campaign date
  - timeline items:
    - Shift Start
    - First Photo
    - Midday Check
    - Shift End
  - each item has time and completion state
- Actions/buttons:
  - back arrow -> `/client/campaign`
- Static/demo today:
  - `timingData` is hardcoded
  - campaign title/date are hardcoded
- Must come from database later:
  - shift start/end times
  - first photo timestamp
  - later milestone timestamps or derived checkpoints
- Actions that will mutate database later:
  - none on this screen
- Visibility/permission rules:
  - authenticated client only
  - same campaign access restrictions as the client campaign view
- Notes for Supabase integration later:
  - this can be derived from `driver_shifts` plus ordered campaign photo timestamps
  - only add a dedicated timeline table if the business needs non-derivable milestones

## Shared Components That Depend on Real Data

### `src/components/LoginCard.tsx`

- Used by: driver, admin, and client login pages.
- Real data dependency later:
  - auth errors
  - loading state
  - role-aware redirect target after successful sign-in
- Current demo behavior:
  - collects username/password locally and immediately calls `onLogin`
- Database/session mutation later:
  - create Supabase auth session
- Integration notes:
  - component already supports username/password flow
  - only label text differs by page

### `src/components/PhotoCard.tsx`

- Used by: admin campaign detail and admin photo approval.
- Real data dependency later:
  - photo storage URL or signed URL
  - captured/submitted time
  - note
  - approval status
- Current demo behavior:
  - renders whatever props are passed
  - shows approve/reject only when `status === "pending"`
- Database mutation later:
  - `onApprove` / `onReject` should update the photo approval row
- Integration notes:
  - `status` values must stay aligned with database enum values used by `StatusBadge`

### `src/components/StatusBadge.tsx`

- Used by: driver, admin, and client screens.
- Real data dependency later:
  - campaign status values: `active`, `pending`, `completed`, `draft`
  - photo review values: `approved`, `rejected`, `pending`
- Current demo behavior:
  - purely visual mapping
- Database mutation later:
  - none directly
- Integration notes:
  - backend status values should reuse these exact labels where possible to avoid translation glue in the UI

### `src/components/AdminLayout.tsx` and `src/components/AdminSidebar.tsx`

- Used by: all nested admin routes.
- Real data dependency later:
  - current session role
  - sign-out behavior
- Current demo behavior:
  - admin navigation is static
  - sign-out links only navigate to `/`
  - `Reports` is visibly disabled placeholder content
- Database/session mutation later:
  - sign-out should clear auth session
- Integration notes:
  - protect the parent `/admin` route, not each child page separately in ad hoc ways
  - disabled `Reports` nav item does not need backend work for MVP

## Cross-Cutting Auth/Session Notes

- Current UI is already password-based for every role. There is no OTP UI in the repo now.
- Driver login label is `Username`; admin and client login labels are `Email`. MVP requirement says username/password, so this policy needs to be decided before backend wiring.
- No route guards exist today. Any user can navigate directly to role pages if they know the URL.
- Current sign-out flows only navigate back to `/`; they do not clear a real session.
- Role enforcement needed later:
  - admin: full access to campaign list/create/detail/photo approval
  - driver: only own assigned campaign, own shift rows, own photo uploads
  - client: only campaigns explicitly visible to that client, and only approved proof content
- Session data the frontend will need after login:
  - user id
  - role
  - display name
  - username
  - current accessible campaign ids or a query path to fetch them
- Supabase auth direction for MVP:
  - use password auth, not OTP
  - keep role and username in a profile table linked to `auth.users`
  - enforce visibility through RLS and campaign access mappings, not by trusting client-side role checks

## Recommended Initial Supabase Tables

These are the minimum practical tables to support the current screens without redesigning the product.

### 1. `profiles`

- Purpose: app-level identity and role for each authenticated user.
- Suggested columns:
  - `id` uuid primary key, references `auth.users.id`
  - `role` text check in (`admin`, `driver`, `client`)
  - `username` text unique
  - `display_name` text
  - `email` text nullable
  - `is_active` boolean
  - `created_at` timestamptz
- Needed by:
  - all login flows
  - role-based access checks
  - display names on admin and campaign screens

### 2. `clients`

- Purpose: company/account record shown on campaign screens.
- Suggested columns:
  - `id` uuid primary key
  - `name` text
  - `created_at` timestamptz
- Needed by:
  - admin campaign list
  - admin campaign detail
  - client-side campaign ownership mapping

### 3. `campaigns`

- Purpose: main campaign record.
- Suggested columns:
  - `id` uuid primary key
  - `title` text
  - `campaign_date` date
  - `route_code` text nullable
  - `status` text check in (`draft`, `pending`, `active`, `completed`)
  - `client_id` uuid references `clients.id`
  - `driver_profile_id` uuid references `profiles.id`
  - `internal_notes` text nullable
  - `driver_daily_wage` numeric nullable
  - `transport_cost` numeric nullable
  - `other_cost` numeric nullable
  - `created_by` uuid references `profiles.id`
  - `created_at` timestamptz
- Needed by:
  - admin campaign list/create/detail
  - driver campaign view
  - client campaign view

### 4. `campaign_client_access`

- Purpose: map client users to campaigns they are allowed to view.
- Suggested columns:
  - `id` uuid primary key
  - `campaign_id` uuid references `campaigns.id`
  - `client_profile_id` uuid references `profiles.id`
  - `created_at` timestamptz
- Needed by:
  - client campaign view permissions
  - client timing sheet permissions

### 5. `driver_shifts`

- Purpose: persist shift start/end state for a driver on a campaign.
- Suggested columns:
  - `id` uuid primary key
  - `campaign_id` uuid references `campaigns.id`
  - `driver_profile_id` uuid references `profiles.id`
  - `started_at` timestamptz
  - `ended_at` timestamptz nullable
  - `created_at` timestamptz
- Needed by:
  - driver campaign screen
  - admin campaign detail login/logout times
  - client timing sheet

### 6. `campaign_photos`

- Purpose: store proof photo metadata and approval state.
- Suggested columns:
  - `id` uuid primary key
  - `campaign_id` uuid references `campaigns.id`
  - `uploaded_by` uuid references `profiles.id`
  - `storage_path` text
  - `submitted_at` timestamptz
  - `captured_at` timestamptz nullable
  - `note` text nullable
  - `status` text check in (`pending`, `approved`, `rejected`)
  - `reviewed_by` uuid references `profiles.id` nullable
  - `reviewed_at` timestamptz nullable
  - `rejection_reason` text nullable
- Needed by:
  - driver recent uploads
  - admin campaign detail
  - admin photo approval
  - client approved gallery
  - client timing sheet derivation

## Backend Wiring Order

1. Add Supabase auth and `profiles`, then enforce role-based route protection and real sign-out.
2. Add `campaigns`, `clients`, and `campaign_client_access` read paths so admin list/detail, driver campaign, and client campaign can render from real rows.
3. Add `driver_shifts` so `Start Shift` and `End Shift` persist and admin/client timing data stops depending on local state.
4. Add storage upload plus `campaign_photos` insert flow for driver photo submission.
5. Add admin photo approval mutations and pending-count queries.
6. Replace client gallery with approved `campaign_photos` only.
7. Replace client timing sheet with derived data from `driver_shifts` and `campaign_photos`.
8. Wire the admin create campaign form last, after the lookup tables and access mappings exist.
9. Leave PDF export until after core CRUD, upload, and approval flows are stable.

## MVP Blockers Before Backend Integration

- `src/pages/admin/AdminCampaignDetail.tsx` hardcodes `View All` to `/admin/campaigns/1/photos` instead of using the current campaign id.
- `src/pages/admin/AdminCampaignDetail.tsx` shows approve/reject buttons, but their handlers are no-ops.
- `src/pages/admin/AdminCreateCampaign.tsx` does not hold real form state, validation, or database-backed client/driver selectors yet.
- `src/pages/driver/DriverUpload.tsx` does not capture a real image file. Backend upload wiring cannot work until this page has actual file input/camera integration.
- `src/pages/driver/DriverCampaign.tsx` keeps shift state only in local component state, so refresh/navigation loses the operational state the rest of the product needs.
- Admin and client login pages label the credential field as `Email`, while the stated MVP auth requirement is username/password. This must be resolved before auth wiring to avoid backend/frontend mismatch.
- No route guards or real sign-out exist yet, so permission-sensitive screens are still directly reachable by URL in the current UI baseline.
