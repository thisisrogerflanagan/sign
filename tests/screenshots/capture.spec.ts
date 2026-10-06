import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTestDocumentFixture } from '../e2e/helpers/fixtures'
import { ensureSamplePdf } from '../e2e/helpers/test-pdf'

const screenshotsDir = path.resolve(process.cwd(), 'screenshots')

// Helper to disable animations, transitions, carets, and stabilize rendering
async function stabilizePage(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      [data-testid="dev-toolbar-trigger"],
      [data-testid="dev-toolbar-modal"],
      nextjs-portal,
      #next-logo {
        display: none !important;
      }
    `,
  })
  await page.waitForTimeout(400)
}

test.describe('Automated Screenshot Capture ("Robot Clicker")', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
    }
  })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as any).__DISABLE_DEV_TOOLBAR__ = true
    })
  })

  // ==========================================
  // SIGNER SIDE (UNAUTHENTICATED DESKTOP)
  // ==========================================
  test.describe('Signer Views (Desktop)', () => {
    test.use({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      storageState: { cookies: [], origins: [] },
    })

    test('capture signer journey views (landing, viewer, modal, completed)', async ({
      page,
    }) => {
      const fixture = await createTestDocumentFixture({
        title: 'E2E Master Services Agreement',
        status: 'sent',
        signerName: 'Alex Contractor',
      })

      try {
        // 1. Signer Landing View
        await page.goto(`/sign/${fixture.rawToken}`)
        const reviewBtn = page.locator('[data-testid="review-and-sign-button"]')
        await expect(reviewBtn).toBeVisible()
        await expect(page.getByText('E2E Master Services Agreement')).toBeVisible()
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'signer-landing.png'),
          fullPage: false,
        })

        // 2. Document Viewer with Fields Placed
        await reviewBtn.click()
        const fieldLocator = page.locator(
          `[data-testid="signer-field-${fixture.field.id}"]`
        )
        await expect(fieldLocator).toBeVisible()
        await page.waitForSelector('canvas')
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'signer-viewer.png'),
          fullPage: false,
        })

        // 3. Signature Capture Modal (Typed Signature)
        await fieldLocator.click()
        const modal = page.locator('[data-testid="signature-modal"]')
        await expect(modal).toBeVisible()
        const typeInput = page.locator('[data-testid="signature-type-input"]')
        await expect(typeInput).toBeVisible()
        await typeInput.fill('Alex Contractor')
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'signer-signature-modal.png'),
          fullPage: false,
        })

        // 4. Completion View ("You're all done" + download button)
        const savePromise = page.waitForResponse(
          (res) =>
            res.url().includes('/api/sign/') &&
            res.url().includes('/fields') &&
            res.status() === 200
        )
        await page.locator('[data-testid="adopt-signature-button"]').click()
        await savePromise
        await expect(modal).not.toBeVisible()

        const completeBtn = page.locator('[data-testid="complete-button"]')
        await expect(completeBtn).toBeEnabled()
        await completeBtn.click()

        const completedCard = page.locator('[data-testid="signing-completed-card"]')
        await expect(completedCard).toBeVisible({ timeout: 15000 })
        await expect(
          page.locator('[data-testid="download-signed-pdf-button"]')
        ).toBeVisible()
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'signer-completed.png'),
          fullPage: false,
        })
      } finally {
        await fixture.cleanup()
      }
    })

    test('capture signer error views (expired, voided, completed, not found)', async ({
      page,
    }) => {
      // 5. Expired link
      const expiredFixture = await createTestDocumentFixture({
        title: 'Expired Agreement',
        expiresInHours: -1,
      })
      try {
        await page.goto(`/sign/${expiredFixture.rawToken}`)
        await expect(page.locator('[data-testid="signer-error-expired"]')).toBeVisible()
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'signer-error-expired.png'),
        })
      } finally {
        await expiredFixture.cleanup()
      }

      // 6. Voided link
      const voidedFixture = await createTestDocumentFixture({
        title: 'Voided Agreement',
        status: 'voided',
      })
      try {
        await page.goto(`/sign/${voidedFixture.rawToken}`)
        await expect(page.locator('[data-testid="signer-error-voided"]')).toBeVisible()
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'signer-error-voided.png'),
        })
      } finally {
        await voidedFixture.cleanup()
      }

      // 7. Already completed link
      const completedFixture = await createTestDocumentFixture({
        title: 'Finished Agreement',
        status: 'completed',
      })
      try {
        await page.goto(`/sign/${completedFixture.rawToken}`)
        await expect(page.locator('[data-testid="signer-error-completed"]')).toBeVisible()
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'signer-error-completed.png'),
        })
      } finally {
        await completedFixture.cleanup()
      }

      // 8. Link not found
      await page.goto('/sign/invalid_random_non_existent_token_00000')
      await expect(page.locator('[data-testid="signer-error-not-found"]')).toBeVisible()
      await stabilizePage(page)
      await page.screenshot({
        path: path.join(screenshotsDir, 'signer-error-not-found.png'),
      })
    })
  })

  // ==========================================
  // MOBILE SIGNER (390x844 VIEWPORT)
  // ==========================================
  test.describe('Mobile Signer Views', () => {
    test.use({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      storageState: { cookies: [], origins: [] },
    })

    test('capture mobile signer landing and completion views', async ({ page }) => {
      const fixture = await createTestDocumentFixture({
        title: 'E2E Master Services Agreement',
        status: 'sent',
        signerName: 'Alex Contractor',
      })

      try {
        // 9. Mobile Signer Landing
        await page.goto(`/sign/${fixture.rawToken}`)
        const reviewBtn = page.locator('[data-testid="review-and-sign-button"]')
        await expect(reviewBtn).toBeVisible()
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'mobile-signer-landing.png'),
        })

        // Review & sign
        await reviewBtn.click()
        const fieldLocator = page.locator(
          `[data-testid="signer-field-${fixture.field.id}"]`
        )
        await expect(fieldLocator).toBeVisible()
        await fieldLocator.click()

        // Modal
        const modal = page.locator('[data-testid="signature-modal"]')
        await expect(modal).toBeVisible()
        const typeInput = page.locator('[data-testid="signature-type-input"]')
        await typeInput.fill('Alex Contractor')
        await typeInput.blur()

        const savePromise = page.waitForResponse(
          (res) =>
            res.url().includes('/api/sign/') &&
            res.url().includes('/fields') &&
            res.status() === 200
        )
        const adoptBtn = page.locator('[data-testid="adopt-signature-button"]')
        await adoptBtn.scrollIntoViewIfNeeded()
        await adoptBtn.click()
        await savePromise
        await expect(modal).not.toBeVisible()

        const completeBtn = page.locator('[data-testid="complete-button"]')
        await expect(completeBtn).toBeEnabled()
        await completeBtn.click()

        // 10. Mobile Signer Completed
        const completedCard = page.locator('[data-testid="signing-completed-card"]')
        await expect(completedCard).toBeVisible({ timeout: 15000 })
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'mobile-signer-completed.png'),
        })
      } finally {
        await fixture.cleanup()
      }
    })
  })

  // ==========================================
  // SENDER SIDE (AUTHENTICATED DESKTOP)
  // ==========================================
  test.describe('Sender Views (Desktop)', () => {
    test.use({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      storageState: 'tests/.auth/user.json',
    })

    test('capture sender home feed with documents', async ({ page }) => {
      // Ensure deterministic documents exist for test-e2e user
      const doc1 = await createTestDocumentFixture({
        title: 'Master Services Agreement',
        status: 'sent',
        signerName: 'Alex Contractor',
        signerEmail: 'alex@contractor.test',
      })
      const doc2 = await createTestDocumentFixture({
        title: 'Mutual Non-Disclosure Agreement',
        status: 'completed',
        signerName: 'Sarah Jenkins',
        signerEmail: 'sarah@acme.test',
      })

      try {
        await page.goto('/')
        await expect(
          page.getByText('Master Services Agreement', { exact: true })
        ).toBeVisible({ timeout: 15000 })
        await expect(
          page.getByText('Mutual Non-Disclosure Agreement', { exact: true })
        ).toBeVisible()
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'sender-home.png'),
        })
      } finally {
        await doc1.cleanup()
        await doc2.cleanup()
      }
    })

    test('capture sender home feed empty state', async ({ browser }) => {
      const admin = createAdminClient()
      const emptyUserEmail = 'test-empty-feed@scribbble.test'

      const { data: usersData } = await admin.auth.admin.listUsers()
      let emptyUser = usersData?.users.find((u) => u.email === emptyUserEmail)
      if (!emptyUser) {
        const created = await admin.auth.admin.createUser({
          email: emptyUserEmail,
          email_confirm: true,
          password: 'TestPassword123!',
        })
        emptyUser = created.data.user!
      }

      await admin.from('profiles').upsert(
        {
          id: emptyUser.id,
          email: emptyUserEmail,
          display_name: 'New Sender',
          timezone: 'America/New_York',
        },
        { onConflict: 'id' }
      )

      await admin.from('entitlements').upsert(
        {
          user_id: emptyUser.id,
          plan: 'lifetime',
        },
        { onConflict: 'user_id' }
      )

      // Ensure zero documents for this user
      await admin.from('documents').delete().eq('owner_id', emptyUser.id)

      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: emptyUserEmail,
      })

      const tokenHash = linkData?.properties?.hashed_token

      // Run in an isolated browser context to not mutate the test-e2e session
      const emptyContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
      })
      const emptyPage = await emptyContext.newPage()

      try {
        await emptyPage.goto(
          `/auth/callback?token_hash=${tokenHash}&type=magiclink&next=/`
        )
        await emptyPage.waitForURL((url) => !url.href.includes('/auth/callback'), {
          timeout: 15000,
        })

        await expect(emptyPage.getByText('No signature requests yet')).toBeVisible({
          timeout: 15000,
        })
        await expect(emptyPage.getByText('Send your first request')).toBeVisible()
        await stabilizePage(emptyPage)
        await emptyPage.screenshot({
          path: path.join(screenshotsDir, 'sender-home-empty.png'),
        })
      } finally {
        await emptyContext.close()
      }
    })

    test('capture upload view', async ({ page }) => {
      await page.goto('/send')
      await expect(page.getByText('Upload a document to send')).toBeVisible({
        timeout: 15000,
      })
      await stabilizePage(page)
      await page.screenshot({
        path: path.join(screenshotsDir, 'sender-upload.png'),
      })
    })

    test('capture field placement editor with auto-detect suggestions, pre-send review, and sent confirmation', async ({
      page,
    }) => {
      const fixture = await createTestDocumentFixture({
        title: 'Master Services Agreement',
        status: 'draft',
        includeSignatureField: false,
        additionalFields: [
          {
            type: 'signature',
            label: 'Signature',
            page: 1,
            x: 0.1,
            y: 0.5,
            width: 0.25,
            height: 0.05,
            required: true,
            is_suggestion: true,
          },
          {
            type: 'date',
            label: 'Date Signed',
            page: 1,
            x: 0.5,
            y: 0.5,
            width: 0.2,
            height: 0.04,
            required: true,
            is_suggestion: true,
          },
        ],
      })

      try {
        // Field placement editor with auto-detect suggestions
        await page.goto(`/send/${fixture.document.id}/place`)
        const suggestionBanner = page.locator('text=auto-detected in this document')
        await expect(suggestionBanner).toBeVisible({ timeout: 15000 })
        await page.waitForSelector('canvas')
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'sender-field-placement.png'),
        })

        // Accept all suggestions so fields are saved
        const acceptAllBtn = page.getByRole('button', { name: /accept all/i })
        if (await acceptAllBtn.isVisible()) {
          await acceptAllBtn.click()
        }

        // Proceed to Pre-Send Review View
        const reviewBtn = page.locator('[data-testid="continue-to-review-button"]')
        await expect(reviewBtn).toBeEnabled({ timeout: 15000 })
        await reviewBtn.click()

        await page.waitForURL(/\/send\/[^/]+\/review/, { timeout: 15000 })
        const emailInput = page.locator('[data-testid="signer-email-input"]')
        await expect(emailInput).toBeVisible()
        await emailInput.fill('alex@contractor.test')

        const nameInput = page.locator('[data-testid="signer-name-input"]')
        await nameInput.fill('Alex Contractor')

        const testCheckbox = page.locator('[data-testid="test-send-checkbox"]')
        if (await testCheckbox.isVisible()) {
          await testCheckbox.check()
        }

        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'sender-send-review.png'),
        })

        // Sent Confirmation with signing link
        const sendBtn = page.locator('[data-testid="send-envelope-button"]')
        await expect(sendBtn).toBeEnabled()
        await sendBtn.click()

        const confirmationCard = page.locator('[data-testid="sent-confirmation-card"]')
        await expect(confirmationCard).toBeVisible({ timeout: 20000 })
        await expect(page.locator('[data-testid="sent-signing-url-input"]')).toBeVisible()
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'sender-sent-confirmation.png'),
        })
      } finally {
        await fixture.cleanup()
      }
    })

    test('capture document detail with activity record timeline', async ({ page }) => {
      const fixture = await createTestDocumentFixture({
        title: 'Master Services Agreement',
        status: 'viewed',
        signerName: 'Alex Contractor',
        signerEmail: 'alex@contractor.test',
      })

      const admin = createAdminClient()
      const now = new Date()
      const t1 = new Date(now.getTime() - 3600000 * 2).toISOString()
      const t2 = new Date(now.getTime() - 3600000).toISOString()
      const t3 = now.toISOString()

      // Seed deterministic audit events
      await admin.from('audit_events').insert([
        {
          document_id: fixture.document.id,
          actor_type: 'sender',
          actor_email: 'test-e2e@scribbble.test',
          event_type: 'document_created',
          ip_address: '198.51.100.1',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          created_at: t1,
        },
        {
          document_id: fixture.document.id,
          actor_type: 'sender',
          actor_email: 'test-e2e@scribbble.test',
          event_type: 'document_sent',
          ip_address: '198.51.100.1',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          created_at: t2,
        },
        {
          document_id: fixture.document.id,
          actor_type: 'signer',
          actor_email: 'alex@contractor.test',
          event_type: 'document_viewed',
          ip_address: '198.51.100.42',
          user_agent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          created_at: t3,
        },
      ])

      try {
        await page.goto(`/documents/${fixture.document.id}`)
        await expect(page.getByText('Activity Record')).toBeVisible({ timeout: 15000 })
        await expect(page.getByText('document viewed')).toBeVisible()
        await stabilizePage(page)
        await page.screenshot({
          path: path.join(screenshotsDir, 'sender-document-detail.png'),
        })
      } finally {
        await fixture.cleanup()
      }
    })

    test('capture settings view', async ({ page }) => {
      await page.goto('/settings')
      await expect(page.getByText('Account Settings')).toBeVisible({
        timeout: 15000,
      })
      await stabilizePage(page)
      await page.screenshot({
        path: path.join(screenshotsDir, 'sender-settings.png'),
      })
    })
  })
})
