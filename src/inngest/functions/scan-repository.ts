import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstallationOctokit } from '@/lib/github'
import Anthropic from '@anthropic-ai/sdk'

const SECURITY_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.php', '.rb', '.sql', '.env.example', '.yaml', '.yml']
const SKIP_PATTERNS = ['node_modules', '.git', 'package-lock.json', 'yarn.lock', 'pnpm-lock', 'dist/', 'build/', '.next/']
const MAX_FILES = 40
const MAX_FILE_SIZE = 50_000 // 50KB per file
const MAX_TOTAL_CHARS = 80_000

export const scanRepository = inngest.createFunction(
  {
    id: 'scan-repository',
    name: 'Scan Repository Codebase',
    retries: 2,
    triggers: [{ event: 'scan/repo-requested' }],
  },
  async ({ event, step }) => {
    const { scanId, repoFullName, installationId } = event.data
    const supabase = createServiceClient()

    await step.run('update-status-scanning', async () => {
      await supabase.from('scans').update({ status: 'scanning' }).eq('id', scanId)
    })

    const files = await step.run('fetch-repo-files', async () => {
      const octokit = await getInstallationOctokit(installationId)
      const [owner, repo] = repoFullName.split('/')

      // Get the default branch
      const { data: repoData } = await octokit.repos.get({ owner, repo })
      const branch = repoData.default_branch

      // Get full file tree
      const { data: tree } = await octokit.git.getTree({
        owner, repo,
        tree_sha: branch,
        recursive: 'true',
      })

      const eligible = (tree.tree ?? [])
        .filter(f => f.type === 'blob' && f.path && f.size && f.size < MAX_FILE_SIZE)
        .filter(f => {
          const path = f.path!
          const skip = SKIP_PATTERNS.some(p => path.includes(p))
          if (skip) return false
          return SECURITY_EXTENSIONS.some(ext => path.endsWith(ext))
        })
        .slice(0, MAX_FILES)

      // Fetch file contents
      const contents: Array<{ path: string; content: string }> = []
      let totalChars = 0

      for (const file of eligible) {
        if (totalChars >= MAX_TOTAL_CHARS) break
        try {
          const { data } = await octokit.repos.getContent({ owner, repo, path: file.path!, ref: branch })
          if ('content' in data && data.content) {
            const decoded = Buffer.from(data.content, 'base64').toString('utf-8')
            contents.push({ path: file.path!, content: decoded.slice(0, 8_000) })
            totalChars += decoded.length
          }
        } catch {
          // skip unreadable files
        }
      }
      return contents
    })

    const analysis = await step.run('analyze-with-claude', async () => {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

      const client = new Anthropic({ apiKey })

      const fileContext = files
        .map(f => `=== ${f.path} ===\n${f.content}`)
        .join('\n\n')
        .slice(0, MAX_TOTAL_CHARS)

      const prompt = `You are a security auditor. Analyze this codebase for security vulnerabilities. Focus on: hardcoded secrets, SQL injection, authentication flaws, insecure dependencies, RLS misconfigurations, exposed API keys, insecure direct object references, and prompt injection risks.

CODEBASE (${files.length} files from ${repoFullName}):
${fileContext}

Return ONLY a JSON object:
{
  "severity_score": <0-100>,
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "string",
      "title": "string",
      "description": "string",
      "file_path": "string",
      "line_start": null,
      "line_end": null,
      "code_snippet": "string or null",
      "fix_suggestion": "string"
    }
  ]
}`

      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = (message.content[0] as { text: string }).text
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return { severity_score: 0, findings: [] }

      try {
        return JSON.parse(jsonMatch[0]) as { severity_score: number; findings: Array<Record<string, unknown>> }
      } catch {
        return { severity_score: 0, findings: [] }
      }
    })

    await step.run('save-results', async () => {
      const findings = analysis.findings ?? []

      await supabase.from('scans').update({
        status: 'complete',
        findings,
        severity_score: analysis.severity_score ?? 0,
        model_used: 'claude-haiku-4-5-20251001',
        completed_at: new Date().toISOString(),
      }).eq('id', scanId)

      if (findings.length > 0) {
        const { data: scan } = await supabase.from('scans').select('user_id, repository_id').eq('id', scanId).single()
        if (scan) {
          const rows = findings.map((f: Record<string, unknown>) => ({
            scan_id: scanId,
            user_id: scan.user_id,
            category: f.category as string ?? 'other',
            severity: f.severity as string ?? 'info',
            title: f.title as string ?? 'Finding',
            description: f.description as string ?? '',
            file_path: f.file_path as string ?? null,
            line_start: f.line_start as number ?? null,
            line_end: f.line_end as number ?? null,
            code_snippet: f.code_snippet as string ?? null,
            fix_suggestion: f.fix_suggestion as string ?? null,
          }))
          await supabase.from('findings').insert(rows)
        }
      }
    })

    return { scanId, findings: analysis.findings?.length ?? 0, score: analysis.severity_score }
  }
)
