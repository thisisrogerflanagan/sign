import { test as setup } from '@playwright/test'
import { createAdminClient } from '@/lib/supabase/admin'
import fs from 'fs'
import path from 'path'

const authFile = 'tests/.auth/user.json'

setup('authenticate test user', async ({ page, baseURL }) => {
  const admin = createAdminClient()
  const email = 'test-e2e@scribbble.test'

  // Ensure test user exists
  const { data: usersData } = await admin.auth.admin.listUsers()
  let user = usersData?.users.find((u) => u.email === email)
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: 'TestPassword123!',
    })
    user = created.data.user!
  }

  // Ensure profiles row exists
  await admin.from('profiles').upsert(
    {
      id: user.id,
      email,
      display_name: 'Test Sender',
      timezone: 'America/New_York',
    },
    { onConflict: 'id' }
  )

  // Ensure entitlements row exists with plan: 'lifetime'
  await admin.from('entitlements').upsert(
    {
      user_id: user.id,
      plan: 'lifetime',
    },
    { onConflict: 'user_id' }
  )

  // Generate magic link via Supabase admin API
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`Failed to generate magic link: ${linkErr?.message}`)
  }

  // Follow callback in browser to establish cookies via server-side verifyOtp
  const callbackUrl = `/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink&next=/`
  await page.goto(callbackUrl)
  await page.waitForURL((url) => !url.href.includes('/auth/callback'), { timeout: 15000 })

  // Ensure directory exists
  const dir = path.dirname(path.resolve(process.cwd(), authFile))
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Save storageState
  await page.context().storageState({ path: authFile })
})
