import { test, expect } from '@playwright/test'
import { createTestDocumentFixture } from './helpers/fixtures'

test.describe('Signer Journey E2E', () => {
  // Signer does NOT need authentication
  test.use({ storageState: { cookies: [], origins: [] } })

  test('signer opens link, fills required fields, signs, completes document, and receives download', async ({
    page,
  }) => {
    // 1. Create isolated document fixture with an unfilled signature field
    const fixture = await createTestDocumentFixture({
      title: 'E2E Master Services Agreement',
      status: 'sent',
    })

    try {
      // 2. Open signer link
      await page.goto(`/sign/${fixture.rawToken}`)

      // Assert landing page displays document title and review button
      await expect(page.getByText('E2E Master Services Agreement')).toBeVisible()
      const reviewButton = page.locator('[data-testid="review-and-sign-button"]')
      await expect(reviewButton).toBeVisible()

      // 3. Click Review & Sign Document
      await reviewButton.click()

      // 4. In document viewer, locate and click the signature field
      const fieldSelector = `[data-testid="signer-field-${fixture.field.id}"]`
      const fieldLocator = page.locator(fieldSelector)
      await expect(fieldLocator).toBeVisible()
      await fieldLocator.click()

      // 5. Signature modal should open
      const modal = page.locator('[data-testid="signature-modal"]')
      await expect(modal).toBeVisible()

      // Type name into signature input
      const typeInput = page.locator('[data-testid="signature-type-input"]')
      await expect(typeInput).toBeVisible()
      await typeInput.fill('Alex Contractor')

      // Adopt signature and wait for backend sync
      const saveResponsePromise = page.waitForResponse(
        (res) =>
          res.url().includes('/api/sign/') &&
          res.url().includes('/fields') &&
          res.status() === 200
      )
      const adoptButton = page.locator('[data-testid="adopt-signature-button"]')
      await adoptButton.click()
      await saveResponsePromise
      await expect(modal).not.toBeVisible()

      // 6. Complete signing
      const completeButton = page.locator('[data-testid="complete-button"]')
      await expect(completeButton).toBeEnabled()
      await completeButton.click()

      // 7. Verify completed success view & signed PDF download link
      const completedCard = page.locator('[data-testid="signing-completed-card"]')
      await expect(completedCard).toBeVisible({ timeout: 15000 })
      await expect(page.getByText("You're all done!")).toBeVisible()

      const downloadButton = page.locator('[data-testid="download-signed-pdf-button"]')
      await expect(downloadButton).toBeVisible()
      const href = await downloadButton.getAttribute('href')
      expect(href).toBeTruthy()
      expect(href).toMatch(/^https?:\/\//)
    } finally {
      // Clean up isolated test data
      await fixture.cleanup()
    }
  })
})
