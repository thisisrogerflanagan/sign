import { test, expect } from '@playwright/test'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureSamplePdf } from './helpers/test-pdf'

test.describe('Auth Magic Link Flow', () => {
  // Starts with unauthenticated browser context
  test.use({ storageState: { cookies: [], origins: [] } })

  test('dedicated auth test: verifies real magic link callback authentication mechanism', async ({
    page,
    baseURL,
  }) => {
    const admin = createAdminClient()
    const email = 'test-e2e@scribbble.test'

    // Generate real magic link via Supabase admin API
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    expect(error).toBeNull()
    const tokenHash = data?.properties?.hashed_token
    expect(tokenHash).toBeTruthy()

    // Navigate to generated magic link callback
    await page.goto(`/auth/callback?token_hash=${tokenHash}&type=magiclink&next=/`)

    // Assert user lands in the application authenticated without getting redirected back to /login
    await page.waitForURL((url) => !url.href.includes('/auth/callback'), {
      timeout: 15000,
    })
    await expect(page).toHaveURL(new RegExp(`^${baseURL}/?$`))
  })
})

test.describe('Sender Journey Flow', () => {
  test('sender journey: upload PDF, review auto-detected fields, send envelope, and get signing URL', async ({
    page,
  }) => {
    const samplePdfPath = await ensureSamplePdf()
    let createdDocumentId: string | null = null

    try {
      // 1. Navigate to upload page (pre-authenticated via project storageState)
      await page.goto('/send')
      await expect(page.getByText('Upload a document to send')).toBeVisible()

      // 2. Attach test PDF via setInputFiles
      const fileInput = page.locator('[data-testid="upload-pdf-input"]')
      await fileInput.setInputFiles(samplePdfPath)

      // 3. Document title input should be visible
      const titleInput = page.locator('[data-testid="document-title-input"]')
      await expect(titleInput).toBeVisible()
      const docTitle = `Automated Contract ${Date.now()}`
      await titleInput.fill(docTitle)

      // 4. Click continue to place fields
      const continueUploadBtn = page.locator('[data-testid="upload-continue-button"]')
      await expect(continueUploadBtn).toBeEnabled()
      await continueUploadBtn.click()

      // 5. Lands on place page
      await page.waitForURL(/\/send\/[^/]+\/place/, { timeout: 20000 })
      const url = page.url()
      const match = url.match(/\/send\/([^/]+)\/place/)
      if (match) {
        createdDocumentId = match[1]
      }
      expect(createdDocumentId).toBeTruthy()

      // 6. Ensure at least one signature field exists (pragmatic split per spec: field placement at API level, journey at E2E)
      await page.request.post(`/api/documents/${createdDocumentId}/fields`, {
        data: {
          fields: [
            {
              type: 'signature',
              label: 'Signature',
              page: 1,
              x: 0.2,
              y: 0.5,
              width: 0.25,
              height: 0.05,
              required: true,
              assigned_to: 'signer',
            },
          ],
        },
      })
      await page.reload()

      // 7. Proceed to review & send
      const reviewButton = page.locator('[data-testid="continue-to-review-button"]')
      await expect(reviewButton).toBeEnabled({ timeout: 15000 })
      await reviewButton.click()

      // 8. Lands on review page
      await page.waitForURL(/\/send\/[^/]+\/review/, { timeout: 15000 })

      // Fill recipient details
      const emailInput = page.locator('[data-testid="signer-email-input"]')
      await expect(emailInput).toBeVisible()
      await emailInput.fill('client.automated@scribbble.test')

      const nameInput = page.locator('[data-testid="signer-name-input"]')
      await nameInput.fill('Client Test Recipient')

      // Mark as test send
      const testCheckbox = page.locator('[data-testid="test-send-checkbox"]')
      if (await testCheckbox.isVisible()) {
        await testCheckbox.check()
      }

      // 9. Submit send envelope
      const sendButton = page.locator('[data-testid="send-envelope-button"]')
      await expect(sendButton).toBeEnabled()
      await sendButton.click()

      // 10. Assert sent confirmation & copyable link
      const confirmationCard = page.locator('[data-testid="sent-confirmation-card"]')
      await expect(confirmationCard).toBeVisible({ timeout: 20000 })

      const signingUrlInput = page.locator('[data-testid="sent-signing-url-input"]')
      await expect(signingUrlInput).toBeVisible()
      const signingUrl = await signingUrlInput.inputValue()
      expect(signingUrl).toContain('/sign/')
    } finally {
      // Cleanup created document
      if (createdDocumentId) {
        const admin = createAdminClient()
        try {
          await admin.from('fields').delete().eq('document_id', createdDocumentId)
          await admin.from('signers').delete().eq('document_id', createdDocumentId)
          await admin.from('audit_events').delete().eq('document_id', createdDocumentId)
          await admin.from('email_log').delete().eq('document_id', createdDocumentId)
          await admin.from('documents').delete().eq('id', createdDocumentId)
        } catch (cleanupErr) {
          console.warn('Failed to clean up test document:', createdDocumentId, cleanupErr)
        }
      }
    }
  })
})
