import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function sendScanCompleteEmail({
  to,
  name,
  repoName,
  prTitle,
  severityScore,
  findingsCount,
  scanUrl,
}: {
  to: string
  name: string | null
  repoName: string
  prTitle: string
  severityScore: number
  findingsCount: number
  scanUrl: string
}) {
  const statusLabel = severityScore >= 75 ? 'CRITICAL' : severityScore >= 50 ? 'HIGH RISK' : severityScore >= 25 ? 'MEDIUM RISK' : 'PASSED'

  return getResend().emails.send({
    from: 'Lurk <security@lurk.dev>',
    to,
    subject: `[${statusLabel}] Security scan complete for ${repoName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0B1120;">🛡️ Lurk — Scan Complete</h2>
        <p>Hi ${esc(name ?? 'there')},</p>
        <p>Your security scan for <strong>${esc(repoName)}</strong> is complete.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>PR</strong></td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${esc(prTitle)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Severity Score</strong></td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${severityScore}/100</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Findings</strong></td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${findingsCount}</td>
          </tr>
        </table>
        <a href="${scanUrl}" style="background: #00FF94; color: #0B1120; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Full Report</a>
        <p style="margin-top: 32px; color: #64748b; font-size: 12px;">Lurk — Security scanning for AI-generated code</p>
      </div>
    `,
  })
}

export async function sendWeeklyDigestEmail({
  to,
  name,
  totalScans,
  reposScanned,
  findingCounts,
  topScan,
}: {
  to: string
  name: string | null
  totalScans: number
  reposScanned: number
  findingCounts: { critical: number; high: number; medium: number; low: number; info: number }
  topScan: { prTitle: string; severityScore: number; scanId: string } | null
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lurk.dev'
  const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const totalFindings = findingCounts.critical + findingCounts.high + findingCounts.medium + findingCounts.low + findingCounts.info

  return getResend().emails.send({
    from: 'Lurk <security@lurk.dev>',
    to,
    subject: `Your Lurk security digest — week of ${weekOf}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px;">
        <div style="background: #0B1120; border-radius: 12px; padding: 32px; color: white;">
          <h2 style="margin: 0 0 8px 0; color: #00FF94; font-size: 20px;">👁️ Lurk — Weekly Digest</h2>
          <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px;">Week of ${weekOf}</p>

          <p style="color: #e2e8f0; margin: 0 0 24px 0;">Hi ${esc(name ?? 'there')},</p>

          <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Last 7 days</p>
            <div style="display: flex; gap: 24px; flex-wrap: wrap;">
              <div>
                <p style="font-size: 28px; font-weight: bold; margin: 0; color: white;">${totalScans}</p>
                <p style="font-size: 12px; color: #64748b; margin: 0;">PRs scanned</p>
              </div>
              <div>
                <p style="font-size: 28px; font-weight: bold; margin: 0; color: white;">${reposScanned}</p>
                <p style="font-size: 12px; color: #64748b; margin: 0;">repos</p>
              </div>
              <div>
                <p style="font-size: 28px; font-weight: bold; margin: 0; color: white;">${totalFindings}</p>
                <p style="font-size: 12px; color: #64748b; margin: 0;">findings</p>
              </div>
            </div>
          </div>

          <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Severity breakdown</p>
            <table style="width: 100%; border-collapse: collapse;">
              ${findingCounts.critical > 0 ? `
              <tr>
                <td style="padding: 6px 0; color: #ef4444; font-size: 14px;">🔴 Critical</td>
                <td style="padding: 6px 0; text-align: right; color: white; font-weight: bold;">${findingCounts.critical}</td>
              </tr>` : ''}
              ${findingCounts.high > 0 ? `
              <tr>
                <td style="padding: 6px 0; color: #f97316; font-size: 14px;">🟠 High</td>
                <td style="padding: 6px 0; text-align: right; color: white; font-weight: bold;">${findingCounts.high}</td>
              </tr>` : ''}
              ${findingCounts.medium > 0 ? `
              <tr>
                <td style="padding: 6px 0; color: #eab308; font-size: 14px;">🟡 Medium</td>
                <td style="padding: 6px 0; text-align: right; color: white; font-weight: bold;">${findingCounts.medium}</td>
              </tr>` : ''}
              ${findingCounts.low > 0 ? `
              <tr>
                <td style="padding: 6px 0; color: #60a5fa; font-size: 14px;">🔵 Low</td>
                <td style="padding: 6px 0; text-align: right; color: white; font-weight: bold;">${findingCounts.low}</td>
              </tr>` : ''}
              ${totalFindings === 0 ? `
              <tr>
                <td colspan="2" style="padding: 6px 0; color: #00FF94; font-size: 14px;">✅ No findings this week</td>
              </tr>` : ''}
            </table>
          </div>

          ${topScan ? `
          <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Most critical PR</p>
            <p style="margin: 0 0 4px 0; color: white; font-weight: 500;">${esc(topScan.prTitle)}</p>
            <p style="margin: 0; color: #64748b; font-size: 12px;">Severity score: <span style="color: ${topScan.severityScore >= 75 ? '#ef4444' : topScan.severityScore >= 50 ? '#f97316' : '#eab308'}; font-weight: bold;">${topScan.severityScore}/100</span></p>
          </div>` : ''}

          <a href="${appUrl}/dashboard" style="display: inline-block; background: #00FF94; color: #0B1120; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View Dashboard →</a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 16px;">
          Lurk — Security scanning for AI-generated code<br/>
          You're receiving this because you have an active Lurk account. To unsubscribe, update your notification preferences in <a href="${appUrl}/settings" style="color: #00FF94;">Settings</a>.
        </p>
      </div>
    `,
  })
}
