import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { createHmac, timingSafeEqual } from 'crypto'

const SECURITY_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.yaml', '.yml', '.sql', '.env.example']
const SKIP_PATTERNS = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '.lock']

export function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  const expected = `sha256=${hmac.digest('hex')}`
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export function getAppOctokit() {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
  })
}

export async function getInstallationOctokit(installationId: string) {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  })

  const { token } = await auth({ type: 'installation', installationId: parseInt(installationId) })

  return new Octokit({ auth: token })
}

export async function getPRDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<string> {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: 'diff' },
  })
  return data as unknown as string
}

export async function getPRFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
) {
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  })

  return data.filter(file => {
    const isSkipped = SKIP_PATTERNS.some(p => file.filename.includes(p))
    if (isSkipped) return false
    return SECURITY_EXTENSIONS.some(ext => file.filename.endsWith(ext))
  })
}

export async function postPRComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
) {
  return octokit.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  })
}

export function formatScanComment(
  severityScore: number,
  findings: Array<{ severity: string; title: string; file_path?: string; line_start?: number; line_end?: number; description?: string; fix_suggestion?: string; category: string }>,
  scanId: string,
  userTier: string,
  appUrl: string
): string {
  const statusEmoji = severityScore >= 75 ? '🔴' : severityScore >= 50 ? '🟠' : severityScore >= 25 ? '🟡' : '🟢'
  const statusLabel = severityScore >= 75 ? 'CRITICAL' : severityScore >= 50 ? 'HIGH RISK' : severityScore >= 25 ? 'MEDIUM RISK' : severityScore > 0 ? 'LOW RISK' : 'PASSED'

  const severityIcon = (s: string) => s === 'critical' ? '🔴' : s === 'high' ? '🟠' : s === 'medium' ? '🟡' : s === 'low' ? '🔵' : 'ℹ️'

  let comment = `## 🛡️ Lurk Security Scan\n\n`
  comment += `**Status:** ${statusEmoji} ${statusLabel} | **Severity Score:** ${severityScore}/100\n\n`

  if (findings.length === 0) {
    comment += `✅ No security vulnerabilities detected in this PR.\n\n`
  } else {
    comment += `### Findings (${findings.length})\n\n`
    for (const f of findings.slice(0, 10)) {
      comment += `#### ${severityIcon(f.severity)} ${f.severity.toUpperCase()} - ${f.title}\n`
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
