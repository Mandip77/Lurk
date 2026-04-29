import Anthropic from '@anthropic-ai/sdk'
import type { ClaudeFinding } from '@/types'

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

const SYSTEM_PROMPT = `You are a specialized security auditor focused exclusively on vulnerabilities introduced by AI-generated code. You have deep expertise in:

OVER-PERMISSIVE DATABASE ACCESS: Supabase Row Level Security (RLS) policies that are disabled, overly broad, or missing entirely. Firebase/Firestore security rules that allow unauthenticated access. Check for patterns like "using true" in RLS policies, missing auth.uid() checks, or rules that grant full table access.

BROKEN AUTHENTICATION & SESSION HANDLING: JWT tokens stored in localStorage instead of httpOnly cookies. Missing token expiry validation. Hardcoded secrets or API keys committed directly in code. Auth bypass conditions. Missing CSRF protection. Improper OAuth state parameter handling.

SUPPLY CHAIN VULNERABILITIES: npm/pip packages that appear to be hallucinated (non-existent package names that look plausible but don't exist on the registry). Known malicious package names (typosquatting patterns). Packages pinned to extremely old versions with known CVEs. Missing package integrity checks (no lockfile or --ignore-scripts concerns).

PROMPT INJECTION RISKS: User-controlled input passed directly to LLM API calls without sanitization. System prompt leakage vectors. Missing output validation from AI responses before using in security-sensitive contexts.

Analyze the provided code diff. For each vulnerability found, provide your analysis as a JSON array. If no vulnerabilities are found, return an empty array.

Return ONLY valid JSON, no explanation, no markdown. Format:
[
  {
    "category": "rls_misconfiguration|broken_auth|supply_chain|prompt_injection|other",
    "severity": "critical|high|medium|low|info",
    "title": "Short title (max 80 chars)",
    "description": "Detailed explanation of the vulnerability and why it is dangerous",
    "file_path": "path/to/file.ts",
    "line_start": 42,
    "line_end": 47,
    "code_snippet": "The relevant lines of code",
    "fix_suggestion": "Specific code fix or configuration change to remediate this issue",
    "cve_reference": "CVE-XXXX-XXXXX if applicable, otherwise null"
  }
]`

export async function scanCodeWithClaude(diff: string): Promise<{
  findings: ClaudeFinding[]
  tokensUsed: number
}> {
  const truncatedDiff = diff.slice(0, 100_000)

  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze this pull request diff for security vulnerabilities:\n\n${truncatedDiff}`,
      },
    ],
  })

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens
  const content = response.content[0]

  if (content.type !== 'text') {
    return { findings: [], tokensUsed }
  }

  try {
    const text = content.text.trim()
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return { findings: [], tokensUsed }

    const findings = JSON.parse(jsonMatch[0]) as ClaudeFinding[]
    return { findings: Array.isArray(findings) ? findings : [], tokensUsed }
  } catch {
    return { findings: [], tokensUsed }
  }
}

export function calculateSeverityScore(findings: ClaudeFinding[]): number {
  const points = { critical: 25, high: 15, medium: 8, low: 3, info: 1 }
  const total = findings.reduce((sum, f) => sum + (points[f.severity] ?? 0), 0)
  return Math.min(100, total)
}
