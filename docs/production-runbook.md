# Production runbook

## Current release state

The site remains a preview. Authentication can use Supabase when public environment variables are configured. Checkout is intentionally unavailable. The migration files are not applied by this repository, and the payment adapter fails closed. Do not enable paid orders by setting credentials alone.

The public Birbank Business portal documents e-commerce transaction reporting, but a merchant contract for payment creation, signed callbacks, refunds and settlement must be obtained and tested before implementation. The original payments endpoint and webhook-header assumptions were removed because they were unverified.

Use separate Supabase projects and Vercel environments for preview, staging, and production. Apply migrations through CI; never edit production tables manually.

Checkout must create a server-side quote and reservation. The browser must never be trusted for price, stock, delivery fee, tax, discount, or florist assignment. Payment webhooks are idempotent through provider_events.

Before enabling real orders:

- Confirm country, currency, tax, legal, and Birbank webhook settings.
- Apply migrations and verify RLS with customer, florist, support, and admin accounts.
- Configure backups, alerting, error tracking, rate limits, and secrets.
- Test payment success, failure, refund, duplicate webhook, and reconciliation flows.
- Complete a staging customer-to-florist delivery scenario.
