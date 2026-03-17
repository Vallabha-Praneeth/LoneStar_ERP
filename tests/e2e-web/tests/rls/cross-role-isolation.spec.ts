import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!
const CAMPAIGN_ID = process.env.TEST_CAMPAIGN_ID!

test.describe('RLS: cross-role data isolation', () => {
  test('unauthenticated user cannot read campaign_photos', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY)
    const { data, error } = await client
      .from('campaign_photos')
      .select('id')
      .eq('campaign_id', CAMPAIGN_ID)
    // RLS returns empty array (not an error) for anon
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  test('unauthenticated user cannot read campaigns', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY)
    const { data, error } = await client.from('campaigns').select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  test('driver cannot read campaigns not assigned to them', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY)
    // Sign in as driver
    await client.auth.signInWithPassword({
      email: 'driver@adtruck.com',
      password: process.env.TEST_DRIVER_PASSWORD!,
    })
    const { data } = await client.from('campaigns').select('id, driver_profile_id')
    // All returned campaigns must be assigned to this driver
    const driverSession = await client.auth.getUser()
    const driverId = driverSession.data.user?.id
    if (data && data.length > 0) {
      expect(data.every((c) => c.driver_profile_id === driverId)).toBe(true)
    }
    await client.auth.signOut()
  })

  test('client cannot read other organisations campaigns', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY)
    await client.auth.signInWithPassword({
      email: 'client@acme.com',
      password: process.env.TEST_CLIENT_PASSWORD!,
    })
    const { data } = await client.from('campaigns').select('id, client_id')
    // All returned campaigns must belong to Acme Corp
    // (client_id = 00000000-0000-0000-0000-000000000001)
    if (data && data.length > 0) {
      expect(
        data.every((c) => c.client_id === '00000000-0000-0000-0000-000000000001')
      ).toBe(true)
    }
    await client.auth.signOut()
  })

  test('client can only see approved photos', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY)
    await client.auth.signInWithPassword({
      email: 'client@acme.com',
      password: process.env.TEST_CLIENT_PASSWORD!,
    })
    const { data } = await client
      .from('campaign_photos')
      .select('id, status')
      .eq('campaign_id', CAMPAIGN_ID)
    if (data && data.length > 0) {
      expect(data.every((p) => p.status === 'approved')).toBe(true)
    }
    await client.auth.signOut()
  })
})
