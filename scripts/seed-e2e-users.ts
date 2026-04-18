/**
 * Seeds the adtruck-e2e Supabase project with the three fixture users
 * (admin-e2e, driver-e2e, client-e2e), their profiles/drivers/clients rows,
 * and a smoke-test campaign.
 *
 * Idempotent: safe to re-run. Existing users are patched (password + role)
 * instead of recreated.
 *
 * Run: `npm run seed:e2e`  — requires .env.e2e.local with:
 *   SUPABASE_URL_E2E
 *   SUPABASE_SERVICE_ROLE_KEY_E2E
 *
 * Optional overrides (else documented defaults are used):
 *   E2E_ADMIN_PASSWORD, E2E_DRIVER_PASSWORD, E2E_CLIENT_PASSWORD
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ENV_FILE = ".env.e2e.local";
const SEED_CAMPAIGN_ID = "00000000-0000-0000-0000-0000000e2e01";
const CLIENT_NAME = "Acme E2E Client";

type FixtureUser = {
  email: string;
  password: string;
  role: "admin" | "driver" | "client";
  username: string;
  display_name: string;
};

function loadEnvFile(path: string): void {
  try {
    const raw = readFileSync(resolve(path), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.e2e.local is optional; fall back to process env
  }
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing required env var: ${key}`);
    console.error(`Add it to ${ENV_FILE} or export it before running.`);
    process.exit(1);
  }
  return v;
}

async function ensureUser(
  admin: SupabaseClient,
  u: FixtureUser,
): Promise<string> {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (listErr) throw listErr;

  const existing = list.users.find((x) => x.email === u.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: u.password,
      app_metadata: { ...existing.app_metadata, role: u.role },
    });
    if (error) throw error;
    console.log(`  • patched ${u.email} (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    app_metadata: { role: u.role },
    user_metadata: { username: u.username, display_name: u.display_name },
  });
  if (error) throw error;
  console.log(`  • created ${u.email} (${data.user.id})`);
  return data.user.id;
}

async function ensureClient(admin: SupabaseClient): Promise<string> {
  const { data: existing } = await admin
    .from("clients")
    .select("id")
    .ilike("name", CLIENT_NAME)
    .maybeSingle();
  if (existing) {
    console.log(`  • client row exists (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await admin
    .from("clients")
    .insert({ name: CLIENT_NAME })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`  • created client ${CLIENT_NAME} (${data.id})`);
  return data.id;
}

async function run(): Promise<void> {
  loadEnvFile(ENV_FILE);

  const url = required("SUPABASE_URL_E2E");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY_E2E");

  const users: FixtureUser[] = [
    {
      email: "admin-e2e@adtruck.test",
      password: process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin!20260418",
      role: "admin",
      username: "admin-e2e",
      display_name: "Admin E2E",
    },
    {
      email: "driver-e2e@adtruck.test",
      password: process.env.E2E_DRIVER_PASSWORD ?? "E2eDriver!20260418",
      role: "driver",
      username: "driver-e2e",
      display_name: "Driver E2E",
    },
    {
      email: "client-e2e@adtruck.test",
      password: process.env.E2E_CLIENT_PASSWORD ?? "E2eClient!20260418",
      role: "client",
      username: "client-e2e",
      display_name: "Client E2E",
    },
  ];

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Seeding adtruck-e2e at ${new URL(url).host}`);

  console.log("Auth users:");
  const [adminId, driverId, clientUserId] = await Promise.all(
    users.map((u) => ensureUser(admin, u)),
  );

  console.log("Client row:");
  const clientId = await ensureClient(admin);

  console.log("Profiles:");
  const profileRows = [
    {
      id: adminId,
      role: "admin",
      username: "admin-e2e",
      display_name: "Admin E2E",
      email: "admin-e2e@adtruck.test",
    },
    {
      id: driverId,
      role: "driver",
      username: "driver-e2e",
      display_name: "Driver E2E",
      email: "driver-e2e@adtruck.test",
    },
    {
      id: clientUserId,
      role: "client",
      username: "client-e2e",
      display_name: "Client E2E",
      email: "client-e2e@adtruck.test",
      client_id: clientId,
    },
  ];
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(profileRows, { onConflict: "id" });
  if (profileErr) throw profileErr;
  console.log(`  • upserted ${profileRows.length} profiles`);

  console.log("Driver row:");
  const { error: driverErr } = await admin
    .from("drivers")
    .upsert(
      { profile_id: driverId, city: "Chicago" },
      { onConflict: "profile_id" },
    );
  if (driverErr) throw driverErr;
  console.log(`  • upserted driver for ${driverId}`);

  console.log("Seed campaign:");
  const { data: route } = await admin
    .from("routes")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { error: campaignErr } = await admin
    .from("campaigns")
    .upsert(
      {
        id: SEED_CAMPAIGN_ID,
        title: "E2E Smoke Test Campaign",
        campaign_date: new Date().toISOString().slice(0, 10),
        client_id: clientId,
        driver_profile_id: driverId,
        created_by: adminId,
        status: "active",
        route_id: route?.id ?? null,
      },
      { onConflict: "id" },
    );
  if (campaignErr) throw campaignErr;
  console.log(`  • upserted campaign ${SEED_CAMPAIGN_ID}`);

  console.log("\nDone. Fixture credentials:");
  for (const u of users) {
    console.log(`  ${u.role.padEnd(6)}  ${u.email}  ${u.password}`);
  }
}

run().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
