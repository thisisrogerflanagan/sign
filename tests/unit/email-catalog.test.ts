import { describe, it, expect } from 'vitest'
import {
  renderSignatureRequestEmail,
  renderCompletedDocumentSignerEmail,
  renderCompletedDocumentSenderEmail,
  renderReceiptEmail,
  renderClaimInviteEmail,
  renderReminderDueEmail,
} from '@/lib/email/catalog'

describe('Email Catalog - Sent via Scribbble Branding (#18)', () => {
  const appUrl = 'https://scribbble.com'

  describe('renderSignatureRequestEmail', () => {
    it('carries "Sent via Scribbble — e-signatures with a one-time payment" footer with working link in html and text', () => {
      const email = renderSignatureRequestEmail({
        senderName: 'Jane Doe',
        documentTitle: 'Contract Agreement',
        signingUrl: 'https://scribbble.com/sign/tok_123',
        appUrl,
      })

      expect(email.subject).toBe(
        'Jane Doe requested your signature on "Contract Agreement"'
      )
      expect(email.html).toContain(
        'Sent via Scribbble — e-signatures with a one-time payment'
      )
      expect(email.html).toContain(`href="${appUrl}"`)
      expect(email.text).toContain(
        `Sent via Scribbble — e-signatures with a one-time payment: ${appUrl}`
      )
    })

    it('supports test requests with test subject and preserves branding', () => {
      const email = renderSignatureRequestEmail({
        senderName: 'Jane Doe',
        documentTitle: 'Test NDA',
        signingUrl: 'https://scribbble.com/sign/tok_test',
        isTest: true,
        appUrl,
      })

      expect(email.subject).toContain('[TEST]')
      expect(email.html).toContain(
        'Sent via Scribbble — e-signatures with a one-time payment'
      )
      expect(email.html).toContain(`href="${appUrl}"`)
    })
  })

  describe('renderCompletedDocumentSignerEmail', () => {
    it('carries "Sent via Scribbble — e-signatures with a one-time payment" footer with working link in html and text', () => {
      const email = renderCompletedDocumentSignerEmail({
        documentTitle: 'Freelance Agreement',
        appUrl,
      })

      expect(email.subject).toBe('Your signed copy of "Freelance Agreement"')
      expect(email.html).toContain(
        'Sent via Scribbble — e-signatures with a one-time payment'
      )
      expect(email.html).toContain(`href="${appUrl}"`)
      expect(email.text).toContain(
        `Sent via Scribbble — e-signatures with a one-time payment: ${appUrl}`
      )
    })
  })

  describe('renderCompletedDocumentSenderEmail', () => {
    it('carries "Sent via Scribbble — e-signatures with a one-time payment" footer with working link in html and text', () => {
      const email = renderCompletedDocumentSenderEmail({
        signerDisplayName: 'John Client',
        documentTitle: 'Freelance Agreement',
        appUrl,
      })

      expect(email.subject).toBe('John Client completed "Freelance Agreement"')
      expect(email.html).toContain(
        'Sent via Scribbble — e-signatures with a one-time payment'
      )
      expect(email.html).toContain(`href="${appUrl}"`)
      expect(email.text).toContain(
        `Sent via Scribbble — e-signatures with a one-time payment: ${appUrl}`
      )
    })
  })

  describe('existing receipt and claim emails', () => {
    it('renders receipt email properly', () => {
      const email = renderReceiptEmail({
        email: 'user@example.com',
        amountFormatted: '$49',
      })
      expect(email.subject).toContain('$49')
      expect(email.html).toContain('Scribbble Lifetime Founder License')
    })

    it('renders claim invite email properly', () => {
      const email = renderClaimInviteEmail({
        claimUrl: 'https://scribbble.com/claim?token=abc',
      })
      expect(email.subject).toContain('Claim your Scribbble Founder License')
      expect(email.html).toContain('https://scribbble.com/claim?token=abc')
    })
  })

  describe('renderReminderDueEmail', () => {
    it('renders reminder due email with note, link, and branding footer', () => {
      const email = renderReminderDueEmail({
        documentTitle: 'Investment Term Sheet',
        note: 'Check if they signed before 5pm',
        documentUrl: 'https://scribbble.com/documents/doc_123',
        recipientName: 'Alice',
        appUrl,
      })

      expect(email.subject).toBe('Reminder: Follow up on "Investment Term Sheet"')
      expect(email.html).toContain('Check if they signed before 5pm')
      expect(email.html).toContain('href="https://scribbble.com/documents/doc_123"')
      expect(email.html).toContain('Hello Alice')
      expect(email.html).toContain(
        'Sent via Scribbble — e-signatures with a one-time payment'
      )
      expect(email.text).toContain('https://scribbble.com/documents/doc_123')
      expect(email.text).toContain(
        `Sent via Scribbble — e-signatures with a one-time payment: ${appUrl}`
      )
    })
  })
})
