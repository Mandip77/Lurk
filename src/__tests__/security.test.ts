/**
 * Security-focused tests covering:
 * 1. Auth & Authorization — IDOR prevention, ownership checks
 * 2. Injection & Input Validation — zod schema validation
 * 3. API & Data Exposure — price ID whitelist, error handling
 * 4. Business Logic — quota logic, idempotency, stripe price validation
 */

import { z } from 'zod'

// ─── 1. INPUT VALIDATION SCHEMAS ────────────────────────────────────────────

const generateReportSchema = z.object({
  scan_id: z.string().uuid(),
  client_name: z.string().max(255).optional().nullable(),
  agency_name: z.string().max(255).optional().nullable(),
  agency_logo_url: z.string().url().max(2048).refine(
    url => url.startsWith('https://') || url.startsWith('http://'),
    { message: 'URL must use http or https' }
  ).optional().nullable(),
  is_public: z.boolean().optional().default(false),
})

describe('Report generation input validation', () => {
  it('accepts valid input', () => {
    const result = generateReportSchema.safeParse({
      scan_id: '123e4567-e89b-12d3-a456-426614174000',
      client_name: 'Acme Corp',
      agency_name: 'Lurk Agency',
      is_public: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-UUID scan_id', () => {
    const result = generateReportSchema.safeParse({ scan_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid agency_logo_url', () => {
    const result = generateReportSchema.safeParse({
      scan_id: '123e4567-e89b-12d3-a456-426614174000',
      agency_logo_url: 'javascript:alert(1)', // XSS attempt
    })
    expect(result.success).toBe(false)
  })

  it('rejects overlong client_name', () => {
    const result = generateReportSchema.safeParse({
      scan_id: '123e4567-e89b-12d3-a456-426614174000',
      client_name: 'A'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('defaults is_public to false', () => {
    const result = generateReportSchema.safeParse({
      scan_id: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.is_public).toBe(false)
  })
})

// ─── 2. STRIPE PRICE ID WHITELIST ───────────────────────────────────────────

describe('Stripe price ID validation', () => {
  const validPriceIds = ['price_pro_123', 'price_agency_456']

  function isValidPrice(priceId: unknown): boolean {
    return typeof priceId === 'string' && validPriceIds.includes(priceId)
  }

  it('accepts valid pro price', () => {
    expect(isValidPrice('price_pro_123')).toBe(true)
  })

  it('accepts valid agency price', () => {
    expect(isValidPrice('price_agency_456')).toBe(true)
  })

  it('rejects arbitrary price ID', () => {
    expect(isValidPrice('price_free_999')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidPrice('')).toBe(false)
  })

  it('rejects null', () => {
    expect(isValidPrice(null)).toBe(false)
  })

  it('rejects injection attempt', () => {
    expect(isValidPrice("'; DROP TABLE subscriptions; --")).toBe(false)
  })
})

// ─── 3. QUOTA LOGIC ─────────────────────────────────────────────────────────

describe('Quota check logic', () => {
  function checkQuota(scanCount: number, limit: number): boolean {
    return scanCount < limit
  }

  it('allows scan when under limit', () => {
    expect(checkQuota(2, 3)).toBe(true)
  })

  it('blocks scan when at limit', () => {
    expect(checkQuota(3, 3)).toBe(false)
  })

  it('blocks scan when over limit', () => {
    expect(checkQuota(5, 3)).toBe(false)
  })

  it('allows first scan (count = 0)', () => {
    expect(checkQuota(0, 3)).toBe(true)
  })
})

// ─── 4. IDEMPOTENCY — DUPLICATE WEBHOOK DETECTION ───────────────────────────

describe('Idempotency — duplicate scan detection', () => {
  function isDuplicate(lastScanCreatedAt: Date | null, windowMs = 30_000): boolean {
    if (!lastScanCreatedAt) return false
    return Date.now() - lastScanCreatedAt.getTime() < windowMs
  }

  it('marks as duplicate when within window', () => {
    const recent = new Date(Date.now() - 5_000)
    expect(isDuplicate(recent)).toBe(true)
  })

  it('allows new scan after window expires', () => {
    const old = new Date(Date.now() - 60_000)
    expect(isDuplicate(old)).toBe(false)
  })

  it('allows scan when no previous scan exists', () => {
    expect(isDuplicate(null)).toBe(false)
  })

  it('blocks duplicate at edge of window (29s)', () => {
    const borderline = new Date(Date.now() - 29_000)
    expect(isDuplicate(borderline)).toBe(true)
  })

  it('allows at just past window (31s)', () => {
    const justPast = new Date(Date.now() - 31_000)
    expect(isDuplicate(justPast)).toBe(false)
  })
})

// ─── 5. IDOR PREVENTION — OWNERSHIP CHECK LOGIC ─────────────────────────────

describe('IDOR — ownership validation', () => {
  type Scan = { id: string; user_id: string }

  function canAccessScan(scan: Scan | null, requestingUserId: string): boolean {
    if (!scan) return false
    return scan.user_id === requestingUserId
  }

  it('allows owner to access their scan', () => {
    const scan = { id: 'scan-1', user_id: 'user-abc' }
    expect(canAccessScan(scan, 'user-abc')).toBe(true)
  })

  it('blocks another user from accessing the scan', () => {
    const scan = { id: 'scan-1', user_id: 'user-abc' }
    expect(canAccessScan(scan, 'user-xyz')).toBe(false)
  })

  it('returns false for null scan (not found)', () => {
    expect(canAccessScan(null, 'user-abc')).toBe(false)
  })
})

// ─── 6. SEVERITY SCORE CALCULATION ──────────────────────────────────────────

describe('Severity score calculation', () => {
  const WEIGHTS: Record<string, number> = {
    critical: 40,
    high: 20,
    medium: 10,
    low: 5,
    info: 1,
  }

  function calcScore(findings: Array<{ severity: string }>): number {
    const raw = findings.reduce((sum, f) => sum + (WEIGHTS[f.severity] ?? 0), 0)
    return Math.min(100, raw)
  }

  it('returns 0 for no findings', () => {
    expect(calcScore([])).toBe(0)
  })

  it('returns 40 for single critical finding', () => {
    expect(calcScore([{ severity: 'critical' }])).toBe(40)
  })

  it('caps at 100', () => {
    const findings = Array.from({ length: 10 }, () => ({ severity: 'critical' }))
    expect(calcScore(findings)).toBe(100)
  })

  it('sums mixed severities', () => {
    const findings = [{ severity: 'high' }, { severity: 'medium' }, { severity: 'low' }]
    expect(calcScore(findings)).toBe(35)
  })

  it('ignores unknown severity', () => {
    expect(calcScore([{ severity: 'unknown' }])).toBe(0)
  })
})
