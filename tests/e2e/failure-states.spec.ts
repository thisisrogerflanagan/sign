import { test, expect } from '@playwright/test'
import { createTestDocumentFixture } from './helpers/fixtures'

test.describe('Signing Failure States E2E', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('expired signing link shows expired view and blocks signing', async ({ page }) => {
    // Expired in past (-1 hour)
    const fixture = await createTestDocumentFixture({
      title: 'Expired Agreement',
      expiresInHours: -1,
    })

    try {
      await page.goto(`/sign/${fixture.rawToken}`)
      const errorView = page.locator('[data-testid="signer-error-expired"]')
      await expect(errorView).toBeVisible()
      await expect(page.getByText('This signing link has expired')).toBeVisible()
    } finally {
      await fixture.cleanup()
    }
  })

  test('voided request shows canceled view and blocks signing', async ({ page }) => {
    const fixture = await createTestDocumentFixture({
      title: 'Voided Contract',
      status: 'voided',
    })

    try {
      await page.goto(`/sign/${fixture.rawToken}`)
      const errorView = page.locator('[data-testid="signer-error-voided"]')
      await expect(errorView).toBeVisible()
      await expect(page.getByText('This request was canceled')).toBeVisible()
    } finally {
      await fixture.cleanup()
    }
  })

  test('already completed document shows completed message without re-signing', async ({
    page,
  }) => {
    const fixture = await createTestDocumentFixture({
      title: 'Finished Agreement',
      status: 'completed',
    })

    try {
      await page.goto(`/sign/${fixture.rawToken}`)
      const errorView = page.locator('[data-testid="signer-error-completed"]')
      await expect(errorView).toBeVisible()
      await expect(page.getByText('Already signed')).toBeVisible()
    } finally {
      await fixture.cleanup()
    }
  })

  test('non-existent token shows link not found', async ({ page }) => {
    await page.goto('/sign/invalid_random_non_existent_token_12345')
    const notFoundView = page.locator('[data-testid="signer-error-not-found"]')
    await expect(notFoundView).toBeVisible()
    await expect(page.getByText('Signing link not found')).toBeVisible()
  })

  test('unsigned required fields disable completion button', async ({ page }) => {
    const fixture = await createTestDocumentFixture({
      title: 'Agreement Requiring Signature',
      status: 'sent',
    })

    try {
      await page.goto(`/sign/${fixture.rawToken}`)
      await page.locator('[data-testid="review-and-sign-button"]').click()

      // The field is not filled yet, so complete button must be disabled
      const completeButton = page.locator('[data-testid="complete-button"]')
      await expect(completeButton).toBeVisible()
      await expect(completeButton).toBeDisabled()
    } finally {
      await fixture.cleanup()
    }
  })
})
