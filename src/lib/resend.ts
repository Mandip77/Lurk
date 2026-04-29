import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
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
        <p>Hi ${name ?? 'there'},</p>
        <p>Your security scan for <strong>${repoName}</strong> is complete.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>PR</strong></td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${prTitle}</td>
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
