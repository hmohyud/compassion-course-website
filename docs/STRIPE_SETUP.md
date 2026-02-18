# Stripe Key Setup

The app uses Stripe for payments via `/api/stripe/*` endpoints (create-checkout-session, verify-payment, payments). This doc describes how to configure Stripe keys so those endpoints work.

## Where Stripe is used

- **Client:** `src/services/stripeService.ts` calls:
  - `POST /api/stripe/create-checkout-session`
  - `GET /api/stripe/verify-payment/:sessionId`
  - `GET /api/stripe/payments/:userId`

These are same-origin requests. The actual Stripe API calls happen in the **backend** that serves `/api/stripe/*` (e.g. Cloud Functions or a Node server behind a Hosting rewrite).

## Backend Stripe keys

The backend that implements `/api/stripe/*` needs:

1. **Stripe Secret Key** (starts with `sk_live_` or `sk_test_`)  
   - Used for creating checkout sessions, verifying payments, listing payments.  
   - Never expose this in the frontend or in GitHub repo code.

2. **Stripe Webhook Secret** (starts with `whsec_`)  
   - If you use webhooks for payment confirmation, the backend needs this to verify webhook signatures.

**Where to set them:**

- **Cloud Functions:** Use Firebase config or a `.env` (or Secret Manager) in the functions project, and read via `functions.config()` or `process.env` in the function that handles `/api/stripe/*`.
- **Other Node backend:** Use environment variables (e.g. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) in the environment where the server runs.

Do not commit secret keys. Use GitHub Secrets (or Firebase environment config / Secret Manager) for CI and production.

## Frontend (optional)

If you ever use Stripe.js or a **publishable key** (e.g. `pk_live_` / `pk_test_`) in the React app:

- Add it as a Vite env var, e.g. `VITE_STRIPE_PUBLISHABLE_KEY`, in `.env` locally and in GitHub Secrets for the build.
- Use it in code as `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY`.

The current `stripeService.ts` only calls your own `/api/stripe/*` endpoints; it does not use a publishable key directly. The backend holds the secret key.

## Getting keys from Stripe

1. Log in at [Stripe Dashboard](https://dashboard.stripe.com/).
2. **Developers → API keys:** copy **Secret key** (and **Publishable key** if needed in the frontend).
3. **Developers → Webhooks:** add an endpoint and copy the **Signing secret** if you use webhooks.

Use **Test** keys for development and **Live** keys only for production.

## Checklist

- [ ] Backend that serves `/api/stripe/*` has Stripe Secret Key set (env or Firebase config).
- [ ] If using webhooks, backend has Stripe Webhook Secret set.
- [ ] Keys are not committed; use secrets / env in deployment.
- [ ] (Optional) If using Stripe.js in the frontend, set `VITE_STRIPE_PUBLISHABLE_KEY` in build env.
