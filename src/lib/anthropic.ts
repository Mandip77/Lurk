import type { ClaudeFinding } from '@/types'

const SYSTEM_PROMPT = `You are a specialized security auditor for AI-generated code vulnerabilities.

Analyze the provided git diff for these specific vulnerability classes:

1. OVER-PERMISSIVE DATABASE ACCESS
   - Supabase RLS disabled or using policy "for all using (true)"
   - Firebase rules allowing unauthenticated reads/writes
   - Missing auth.uid() checks in RLS policies

2. BROKEN AUTH & SESSION HANDLING
   - JWT/tokens stored in localStorage
   - Hardcoded secrets, API keys, or passwords
   - Missing token expiry or validation

3. SUPPLY CHAIN VULNERABILITIES
   - npm package names that appear hallucinated
   - Typosquatting patterns
   - Packages pinned to "*" or "latest"

4. PROMPT INJECTION RISKS
   - Raw user input concatenated into LLM prompts
   - Missing sanitization before AI API calls

Return ONLY a valid JSON array. No markdown, no explanation. Empty array if nothing found.
Schema:
{
  "category": "rls_misconfiguration|broken_auth|supply_chain|prompt_injection|other",
  "severity": "critical|high|medium|low|info",
  "title": "string (max 80 chars)",
  "description": "string",
  "file_path": "string",
  "line_start": number,
  "line_end": number,
  "code_snippet": "string",
  "fix_suggestion": "string",
  "cve_reference": "string|null"
}`

export async function scanCodeWithClaude(diff: string): Promise<{
  findings: ClaudeFinding[]
  tokensUsed: number
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const anthropic = new Anthropic({ apiKey })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `Analyze this PR diff:\n\n${diff.slice(0, 80_000)}` },
    ],
  })

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens
  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const jsonMatch = clean.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return { findings: [], tokensUsed }
    const findings = JSON.parse(jsonMatch[0]) as ClaudeFinding[]
    return { findings: Array.isArray(findings) ? findings : [], tokensUsed }
  } catch {
    return { findings: [], tokensUsed }
  }
}

export function calculateSeverityScore(findings: ClaudeFinding[]): number {
  const pts: Record<string, number> = { critical: 25, high: 15, medium: 8, low: 3, info: 1 }
  return Math.min(100, findings.reduce((sum, f) => sum + (pts[f.severity] ?? 0), 0))
}
