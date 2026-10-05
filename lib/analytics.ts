import posthog from 'posthog-js'
import { PostHog } from 'posthog-node'

let serverPostHog: PostHog | null = null

export function getServerPostHog(): PostHog | null {
  if (typeof window !== 'undefined') return null
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (!key) return null
  if (!serverPostHog) {
    serverPostHog = new PostHog(key, { host })
  }
  return serverPostHog
}

/**
 * Product event taxonomy (IDs and counts only - never names, emails, titles, or document content)
 */
export type AnalyticsEvent =
  | { name: 'user_signed_up'; properties: { plan: string } }
  | { name: 'founder_claimed'; properties?: Record<string, unknown> }
  | { name: 'document_uploaded'; properties: { page_count: number; file_size_kb: number } }
  | { name: 'fields_placed'; properties: { document_id: string; field_count: number } }
  | { name: 'document_sent'; properties: { is_test: boolean; field_count: number } }
  | { name: 'document_viewed_by_signer'; properties: { document_id: string } }
  | { name: 'document_completed'; properties: { days_to_complete: number } }
  | { name: 'document_declined'; properties?: Record<string, unknown> }
  | { name: 'reminder_sent'; properties?: Record<string, unknown> }
  | { name: 'document_voided'; properties?: Record<string, unknown> }
  | { name: 'usage_cap_hit'; properties: { requests_sent: number } }
  | { name: 'test_request_sent'; properties?: Record<string, unknown> }

export function captureClientEvent(event: AnalyticsEvent) {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(event.name, event.properties)
  }
}

export async function captureServerEvent(distinctId: string, event: AnalyticsEvent) {
  const ph = getServerPostHog()
  if (ph) {
    ph.capture({
      distinctId,
      event: event.name,
      properties: event.properties,
    })
    await ph.flush()
  }
}
