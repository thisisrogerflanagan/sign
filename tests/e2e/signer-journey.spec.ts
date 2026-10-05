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

  test('signer opens link, clicks decline, confirms reason, and transitions to declined state', async ({
    page,
  }) => {
    const fixture = await createTestDocumentFixture({
      title: 'E2E Partnership Agreement To Decline',
      status: 'sent',
    })

    try {
      await page.goto(`/sign/${fixture.rawToken}`)
      await expect(page.getByText('E2E Partnership Agreement To Decline')).toBeVisible()

      // Click decline link
      const declineButton = page.locator('[data-testid="decline-button"]')
      await expect(declineButton).toBeVisible()
      await declineButton.click()

      // Fill decline reason and confirm
      const reasonInput = page.getByPlaceholder('Optional reason for declining')
      await expect(reasonInput).toBeVisible()
      await reasonInput.fill('Need updated deliverables terms')

      const declineResponsePromise = page.waitForResponse(
        (res) =>
          res.url().includes('/api/sign/') &&
          res.url().includes('/decline') &&
          res.status() === 200
      )
      const confirmButton = page.locator('[data-testid="confirm-decline-button"]')
      await confirmButton.click()
      await declineResponsePromise

      // Verify request declined view is shown
      const declinedCard = page.locator('[data-testid="request-declined-card"]')
      await expect(declinedCard).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Request declined')).toBeVisible()
    } finally {
      await fixture.cleanup()
    }
  })

  test('signer without pre-set name: clicking name field prompts modal, and typing signature auto-populates name without ever using "Signer"', async ({
    page,
  }) => {
    // Create document where signer.name is null and there is both a signature field and a name field
    const fixture = await createTestDocumentFixture({
      title: 'E2E Name Field Prompt Test',
      status: 'sent',
      signerName: null,
      additionalFields: [
        {
          type: 'name',
          label: 'Full Name',
          page: 1,
          x: 0.2,
          y: 0.65,
          width: 0.25,
          height: 0.04,
          required: true,
        },
      ],
    })

    const nameField = fixture.additionalFields[0]

    try {
      await page.goto(`/sign/${fixture.rawToken}`)
      await page.locator('[data-testid="review-and-sign-button"]').click()

      // 1. Name field should NOT contain the literal string "Signer"
      const nameFieldLocator = page.locator(
        `[data-testid="signer-field-${nameField.id}"]`
      )
      await expect(nameFieldLocator).toBeVisible()
      await expect(nameFieldLocator).not.toHaveText('Signer')

      // 2. Click the name field directly -> must open the input modal to prompt user
      await nameFieldLocator.click()
      const textInput = page.locator('[data-testid="text-field-input"]')
      await expect(textInput).toBeVisible()
      await expect(page.getByText('Enter your Full Name')).toBeVisible()

      // Fill actual legal name and save
      await textInput.fill('Roger Flanagan')
      const saveResponsePromise = page.waitForResponse(
        (res) =>
          res.url().includes('/api/sign/') &&
          res.url().includes('/fields') &&
          res.status() === 200
      )
      await page.locator('[data-testid="text-field-save-button"]').click()
      await saveResponsePromise

      // 3. Assert name field now shows the user's actual name
      await expect(nameFieldLocator).toContainText('Roger Flanagan')
      await expect(nameFieldLocator).not.toContainText('Signer')
    } finally {
      await fixture.cleanup()
    }
  })
})
