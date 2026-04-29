import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('tier').eq('id', user.id).single()

  if (profile?.tier !== 'agency') {
    return NextResponse.json({ error: 'Agency tier required' }, { status: 403 })
  }

  const { scan_id, client_name, agency_name, agency_logo_url, is_public } = await req.json()

  const serviceClient = createServiceClient()

  const { data: scan } = await supabase
    .from('scans')
    .select('id, repository_id')
    .eq('id', scan_id)
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return NextResponse.json({
    report_id: report.id,
    slug: report.slug,
    report_url: `${appUrl}/reports/${report.slug}`,
  })
}
