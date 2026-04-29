export type UserTier = 'free' | 'pro' | 'agency'
export type ScanStatus = 'queued' | 'scanning' | 'complete' | 'failed'
export type FindingCategory = 'rls_misconfiguration' | 'broken_auth' | 'supply_chain' | 'session_token' | 'prompt_injection' | 'other'
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  stripe_customer_id: string | null
  tier: UserTier
  created_at: string
}

export interface Repository {
  id: string
  user_id: string
  provider: 'github' | 'gitlab' | 'bitbucket'
  provider_repo_id: string
  full_name: string
  installation_id: string | null
  webhook_secret: string | null
  is_active: boolean
  created_at: string
}

export interface Scan {
  id: string
  repository_id: string
  pr_number: number | null
  pr_title: string | null
  pr_author: string | null
  pr_url: string | null
  status: ScanStatus
  findings: Finding[]
  fix_suggestions: FixSuggestion[]
  severity_score: number
  tokens_used: number
  created_at: string
  completed_at: string | null
  repositories?: Repository
}

export interface Finding {
  id: string
  scan_id: string
  category: FindingCategory
  severity: FindingSeverity
  title: string
  description: string | null
  file_path: string | null
  line_start: number | null
  line_end: number | null
  code_snippet: string | null
  fix_suggestion: string | null
  cve_reference: string | null
  created_at: string
}

export interface FixSuggestion {
  file_path: string
  suggestion: string
}

export interface Report {
  id: string
  user_id: string
  scan_id: string
  client_name: string | null
  agency_name: string | null
  agency_logo_url: string | null
  pdf_url: string | null
  created_at: string
  scans?: Scan
}

export interface ScanUsage {
  id: string
  user_id: string
  month: string
  scan_count: number
}

export interface ClaudeFinding {
  category: FindingCategory
  severity: FindingSeverity
  title: string
  description: string
  file_path: string
  line_start: number
  line_end: number
  code_snippet: string
  fix_suggestion: string
  cve_reference: string | null
}
