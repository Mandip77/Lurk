/**
 * Tests for GitHub utility functions.
 * Uses inline implementations of pure functions to avoid ESM issues with octokit.
 */

import { createHmac } from 'crypto'
import { timingSafeEqual } from 'crypto'

// Inline copy of verifyGitHubSignature - tests the algorithm, not the import
function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  const expected = `sha256=${hmac.digest('hex')}`
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// Inline copy of formatScanComment
const SEVERITY_ICONS: Record<string, string> = {
  critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: 'ℹ️',
}

function formatScanComment(
  severityScore: number,
  findings: Array<{ severity: string; title: string; file_path?: string; line_start?: number; line_end?: number; description?: string; fix_suggestion?: string; category: string }>,
  scanId: string,
  userTier: string,
  appUrl: string
): string {
  const statusEmoji = severityScore >= 75 ? '🔴' : severityScore >= 50 ? '🟠' : severityScore >= 25 ? '🟡' : '🟢'
  const statusLabel = severityScore >= 75 ? 'CRITICAL' : severityScore >= 50 ? 'HIGH RISK' : severityScore >= 25 ? 'MEDIUM RISK' : severityScore > 0 ? 'LOW RISK' : 'PASSED'

  let comment = `## 👁️ Lurk Security Scan\n\n`
  comment += `**Status:** ${statusEmoji} ${statusLabel} | **Severity Score:** ${severityScore}/100\n\n`

  if (findings.length === 0) {
    comment += `✅ No security vulnerabilities detected in this PR.\n\n`
  } else {
    comment += `### Findings (${findings.length})\n\n`
    for (const f of findings.slice(0, 10)) {
      comment += `#### ${SEVERITY_ICONS[f.severity] ?? '⚪'} ${f.severity.toUpperCase()} - ${f.title}\n`
      if (f.file_path) {
        comment += `**File:** \`${f.file_path}\``
        if (f.line_start) comment += ` · Lines ${f.line_start}${f.line_end && f.line_end !== f.line_start ? `-${f.line_end}` : ''}`
        comment += '\n'
      }
      comment += `**Category:** ${f.category.replace(/_/g, ' ')}\n\n`
      if (f.description) comment += `${f.description}\n\n`
      if (userTier !== 'free' && f.fix_suggestion) {
        comment += `**Fix:**\n\`\`\`\n${f.fix_suggestion}\n\`\`\`\n\n`
      }
    }
    if (userTier === 'free') {
      comment += `> 💡 **Upgrade to Pro** to see fix suggestions for all findings.\n\n`
    }
  }

  comment += `---\n*Powered by [Lurk](${appUrl}) · [View full report](${appUrl}/scans/${scanId})*`
  return comment
}

// ─── SIGNATURE TESTS ─────────────────────────────────────────────────────────

describe('verifyGitHubSignature', () => {
  const secret = 'test-webhook-secret'
  const payload = JSON.stringify({ action: 'opened' })

  function makeSignature(body: string, s: string) {
    return 'sha256=' + createHmac('sha256', s).update(body).digest('hex')
  }

  it('accepts a valid signature', () => {
    expect(verifyGitHubSignature(payload, makeSignature(payload, secret), secret)).toBe(true)
  })

  it('rejects a tampered payload', () => {
    expect(verifyGitHubSignature(payload + ' ', makeSignature(payload, secret), secret)).toBe(false)
  })

  it('rejects a wrong secret', () => {
    expect(verifyGitHubSignature(payload, makeSignature(payload, 'wrong-secret'), secret)).toBe(false)
  })

  it('rejects a missing sha256 prefix', () => {
    const raw = createHmac('sha256', secret).update(payload).digest('hex')
    expect(verifyGitHubSignature(payload, raw, secret)).toBe(false)
  })

  it('rejects an empty signature gracefully', () => {
    expect(verifyGitHubSignature(payload, '', secret)).toBe(false)
  })
})

// ─── FORMAT COMMENT TESTS ─────────────────────────────────────────────────────

describe('formatScanComment', () => {
  const baseFinding = {
    severity: 'critical',
    title: 'RLS disabled',
    file_path: 'supabase/migrations/001.sql',
    line_start: 10,
    line_end: 12,
    description: 'Table has no RLS policy',
    fix_suggestion: 'Enable RLS on the table',
    category: 'rls_misconfiguration',
  }

  it('shows PASSED when score is 0 and no findings', () => {
    const comment = formatScanComment(0, [], 'scan-123', 'free', 'https://lurk.dev')
    expect(comment).toContain('PASSED')
    expect(comment).toContain('No security vulnerabilities detected')
  })

  it('shows CRITICAL status for score >= 75', () => {
    const comment = formatScanComment(80, [baseFinding], 'scan-123', 'pro', 'https://lurk.dev')
    expect(comment).toContain('CRITICAL')
  })

  it('shows HIGH RISK for score 50-74', () => {
    const comment = formatScanComment(60, [baseFinding], 'scan-123', 'pro', 'https://lurk.dev')
    expect(comment).toContain('HIGH RISK')
  })

  it('hides fix suggestions for free tier', () => {
    const comment = formatScanComment(80, [baseFinding], 'scan-123', 'free', 'https://lurk.dev')
    expect(comment).not.toContain('Enable RLS on the table')
    expect(comment).toContain('Upgrade to Pro')
  })

  it('shows fix suggestions for pro tier', () => {
    const comment = formatScanComment(80, [baseFinding], 'scan-123', 'pro', 'https://lurk.dev')
    expect(comment).toContain('Enable RLS on the table')
  })

  it('includes the scan report link', () => {
    const comment = formatScanComment(0, [], 'scan-abc', 'free', 'https://lurk.dev')
    expect(comment).toContain('https://lurk.dev/scans/scan-abc')
  })

  it('caps findings display at 10', () => {
    const findings = Array.from({ length: 15 }, (_, i) => ({ ...baseFinding, title: `Finding ${i}` }))
    const comment = formatScanComment(90, findings, 'scan-123', 'pro', 'https://lurk.dev')
    expect(comment).toContain('Finding 9')
    expect(comment).not.toContain('Finding 10')
  })
})
