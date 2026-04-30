# Lurk — Security Scanning for AI-Generated Code

Lurk automatically scans every GitHub pull request for security vulnerabilities introduced by AI coding assistants (Copilot, Cursor, Claude). It posts findings directly as PR comments and emails you a report.

**Live:** [lurk-cyan.vercel.app](https://lurk-cyan.vercel.app)

---

## What It Catches

| Category | Examples |
|---|---|
| **RLS Misconfigurations** | Supabase tables with RLS disabled, `FOR ALL USING (true)`, missing `auth.uid()` checks |
| **Broken Auth & Secrets** | JWTs in localStorage, hardcoded API keys, missing token expiry |
| **Supply Chain Risks** | Hallucinated npm packages, typosquatting, unpinned versions (`"*"`) |
| **Prompt Injection** | Raw user input concatenated into LLM API calls, system prompt leakage |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth — magic link, GitHub OAuth, Google OAuth |
| AI Scanning | Anthropic Claude Haiku |
| Background Jobs | Inngest |
| Payments | Stripe |
| Email | Resend |
| Rate Limiting | Upstash Redis |
| Deployment | Vercel |

---

## Features

- **Automatic PR scanning** — installs as a GitHub App; every opened or updated PR triggers a scan
- **AI-powered analysis** — Claude Haiku analyzes the diff against a curated security prompt
- **PR comments** — findings posted directly on the pull request with severity, file, and line numbers
- **Fix suggestions** — Pro and Agency users see concrete code fixes for each finding
- **Custom rules** — define your own regex patterns with custom severity levels
- **Suppress findings** — dismiss false positives with a reason, tracked in the audit log
- **Diff viewer** — view the raw PR diff with findings highlighted inline
- **Real-time status** — scan progress polling on the scan detail page
- **API access** — trigger scans programmatically via REST API with Bearer tokens
- **API keys** — create, list, and revoke keys from the dashboard
- **Referral system** — share a referral code to earn bonus free scans
- **Weekly email digest** — summary of the past week's scans sent every Monday
- **White-label PDF reports** — Agency tier can generate branded reports for clients
- **Usage tracking** — quota progress bar with 6-month scan history
- **Dark mode** — system-aware with manual toggle
- **Keyboard shortcuts** — `g d/s/r/u` to navigate, `?` for the cheat sheet
- **Audit logs** — every sensitive action (key creation, suppression) is recorded

---

## Pricing

| Plan | Price | Scans | Features |
|---|---|---|---|
| **Free** | $0/month | 3/month | Core scanning, PR comments |
| **Pro** | $15/month | Unlimited | Fix suggestions, API access, email notifications |
| **Agency** | $70/month | Unlimited | Everything in Pro + white-label PDF reports, team seats |

Annual billing available (2 months free).

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [GitHub App](https://docs.github.com/en/apps/creating-github-apps) with webhook and pull request permissions
- An [Anthropic](https://console.anthropic.com) API key
- An [Inngest](https://inngest.com) account (free tier works)
- A [Stripe](https://stripe.com) account
- A [Resend](https://resend.com) account
- An [Upstash Redis](https://upstash.com) database (for rate limiting)

### 1. Clone and install

```bash
git clone https://github.com/Mandip77/Lurk.git
cd Lurk
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# GitHub App
GITHUB_APP_ID=your-app-id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Inngest
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...         # server-only copy (never sent to browser)
STRIPE_AGENCY_PRICE_ID=price_...      # server-only copy (never sent to browser)

# Resend
RESEND_API_KEY=re_...

# Upstash Redis (optional in dev — rate limiting skips gracefully if unset)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run database migrations

In your Supabase project's **SQL Editor**, run each file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_security_fixes.sql
supabase/migrations/004_new_features.sql
supabase/migrations/005_security_hardening.sql
```

### 4. Start the Inngest dev server

In a separate terminal:

```bash
npx inngest-cli@latest dev
```

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## GitHub App Setup

1. Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**
2. Set the webhook URL to `https://your-domain.com/api/webhooks/github`
3. Set the webhook secret — use the same value as `GITHUB_WEBHOOK_SECRET`
4. Grant permissions: **Pull requests** (read & write), **Issues** (write)
5. Subscribe to events: **Pull request**
6. Generate a private key and paste it as `GITHUB_APP_PRIVATE_KEY`
7. Note your App ID and set it as `GITHUB_APP_ID`
8. Install the app on your GitHub account or org

---

## Stripe Setup

1. Create two products in the Stripe dashboard: **Pro** ($15/month) and **Agency** ($70/month)
2. Copy each price ID to your env vars
3. Create a webhook endpoint pointing to `https://your-domain.com/api/webhooks/stripe`
4. Listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## API Usage (Pro / Agency)

Trigger a scan programmatically using an API key generated from the dashboard:

```bash
curl -X POST https://lurk-cyan.vercel.app/api/scan \
  -H "Authorization: Bearer lurk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "repository_full_name": "your-org/your-repo",
    "pr_number": 42
  }'
```

**Response:**
```json
{
  "scan_id": "uuid",
  "status": "queued",
  "report_url": "https://lurk-cyan.vercel.app/scans/uuid"
}
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, auth callback
│   ├── (dashboard)/      # All authenticated pages
│   │   ├── dashboard/    # Overview + analytics
│   │   ├── scans/        # Scan list and detail
│   │   ├── repositories/ # Repo management
│   │   ├── api-keys/     # API key management
│   │   ├── rules/        # Custom scanning rules
│   │   ├── referral/     # Referral program
│   │   ├── usage/        # Quota and history
│   │   ├── reports/      # White-label reports
│   │   ├── settings/     # Account settings
│   │   └── pricing/      # Plan selection
│   ├── api/
│   │   ├── webhooks/     # GitHub and Stripe webhooks
│   │   ├── scan/         # Public scan API endpoint
│   │   ├── keys/         # API key CRUD
│   │   ├── rules/        # Custom rules CRUD
│   │   └── findings/     # Finding suppression
│   └── page.tsx          # Landing page
├── components/
│   ├── layout/           # Sidebar, Navbar, DashboardShell
│   └── dashboard/        # Scan-specific UI components
├── inngest/
│   └── functions/        # scan-pull-request, weekly-digest
└── lib/
    ├── supabase/         # Client, server, service role helpers
    ├── github.ts         # GitHub App / Octokit
    ├── stripe.ts         # Stripe helpers
    ├── resend.ts         # Email templates
    └── ratelimit.ts      # Upstash rate limiting
supabase/
└── migrations/           # SQL migrations — run in order
```

---

## Running Tests

```bash
npm test
```

Tests cover HMAC signature verification, severity scoring, input validation, IDOR protection, and quota enforcement logic.

---

## Deployment

Push to `main` — Vercel deploys automatically.

Ensure all environment variables from `.env.example` are added in **Vercel → Settings → Environment Variables** before the first deploy.

---

## Security

- RLS enabled on every Supabase table; service role key never reaches the client
- Ownership verified on every resource query (IDOR protection)
- Atomic database operations — no TOCTOU race conditions
- HMAC verified on all webhooks with `timingSafeEqual`
- Rate limiting on all public endpoints via Upstash Redis
- Prompt injection mitigated — user-controlled strings sanitized before AI context
- SSRF blocked on user-supplied URLs — HTTPS-only, private IP ranges rejected
- Audit log for all sensitive actions
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy

To report a vulnerability, email [security@lurk.dev](mailto:security@lurk.dev).

---

## License

MIT
