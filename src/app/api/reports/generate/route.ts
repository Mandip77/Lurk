import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const PRIVATE_IP_RE = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|fc00:|fd)/

function isSafePublicUrl(url: string): boolean {
  if (!url.startsWith('https://')) return false
  try {
    const { hostname } = new URL(url)
    return !PRIVATE_IP_RE.test(hostname)
  } catch {
    return false
  }
}

const generateReportSchema = z.object({
  scan_id: z.string().uuid(),
  client_name: z.string().max(255).optional().nullable(),
  agency_name: z.string().max(255).optional().nullable(),
  agency_logo_url: z.string().max(2048)
    .refine(isSafePublicUrl, { message: 'URL must be a public HTTPS URL' })
    .optional().nullable(),
  is_public: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('tier').eq('id', user.id).single()

  if (profile?.tier !== 'agency') {
    return NextResponse.json({ error: 'Agency tier required' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = generateReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { scan_id, client_name, agency_name, agency_logo_url, is_public } = parsed.data

  const serviceClient = createServiceClient()

  // Verify ownership — prevents IDOR
  const { data: scan } = await supabase
    .from('scans')
    .select('id, repository_id')
    .eq('id', scan_id)
    .eq('user_id', user.id)
    .single()

  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

  const { data: report, error } = await serviceClient
    .from('reports')
    .insert({
      user_id: user.id,
      scan_id,
      client_name,
      agency_name,
      agency_logo_url,
      is_public: is_public ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return NextResponse.json({
    report_id: report.id,
    slug: report.slug,
    report_url: `${appUrl}/reports/${report.slug}`,
  })
}
