# scripts/

One-shot maintenance scripts. Not executed by CI.

## `seed-e2e-users.ts`

Seeds the `adtruck-e2e` Supabase project with fixture users + a smoke-test campaign used by the mobile E2E pipeline.

### What it creates

| Entity | Details |
|---|---|
| `auth.users` | `admin-e2e@adtruck.test`, `driver-e2e@adtruck.test`, `client-e2e@adtruck.test` — each with `app_metadata.role` set for JWT claims |
| `public.profiles` | One row per user, `role` matching |
| `public.drivers` | Driver row for `driver-e2e`, city `Chicago` |
| `public.clients` | `Acme E2E Client` linked to `client-e2e`'s profile |
| `public.campaigns` | `id = 00000000-0000-0000-0000-0000000e2e01`, attached to the first active route |

Idempotent — re-running patches existing rows, never duplicates.

### Run

```bash
cp .env.e2e.local.example .env.e2e.local
# fill in SUPABASE_SERVICE_ROLE_KEY_E2E (get from the e2e Supabase project console)
npm run seed:e2e
```

The script prints the fixture credentials at the end. Use the same passwords for the corresponding GitHub secrets (`E2E_ADMIN_PASSWORD`, `E2E_DRIVER_PASSWORD`, `E2E_CLIENT_PASSWORD`) when wiring up the Maestro workflows in PR C.

### Why this isn't a SQL migration

The `auth.users` table is internal to Supabase — raw SQL inserts are fragile against upstream schema changes. The `auth.admin.createUser()` API is the stable contract. This script runs locally against the e2e project only, never against dev or prod.

### Related

- `docs/mobile-e2e-plan.md` (mobile repo) — the 4-PR rollout plan this seeder supports
