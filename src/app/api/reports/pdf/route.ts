/**
 * PDF generation via Python/WeasyPrint.
 *
 * Self-hosted: WeasyPrint requires libpango + libcairo.
 *   Install deps: pip install -r requirements.txt
 *   Linux: apt-get install -y python3-weasyprint libpango-1.0-0 libharfbuzz0b
 *
 * Vercel: This route returns 501 — use the web report page + window.print() instead.
 *   The /reports/[slug] page already has a "Print / Save PDF" button.
 */

import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

const execFileAsync = promisify(execFile)

const IS_VERCEL = process.env.VERCEL === '1'

export async function GET(req: NextRequest) {
  // On Vercel, redirect to the web report with a print hint
  if (IS_VERCEL) {
    return NextResponse.json(
      {
        error: 'PDF generation via WeasyPrint requires a self-hosted deployment.',
        hint: 'Use the /reports/[slug] web page — it has a "Print / Save PDF" button that produces identical output.',
        docs: 'https://github.com/your-org/lurk#pdf-generation',
      },
      { status: 501 }
    )
  }

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const token = searchParams.get('token') // optional bearer token for private reports

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Allow public reports OR reports with a valid owner token
  const { data: report } = await supabase
    .from('reports')
    .select('*, scans(*, findings(*), repositories(full_name))')
    .eq('slug', slug)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (!report.is_public) {
    // Require a signed token (e.g., passed as query param after auth)
    if (!token) {
      return NextResponse.json({ error: 'This report is private' }, { status: 403 })
    }
    // Verify token is the report owner's user ID (simple approach)
    // In production, use a signed JWT here
    const { data: user } = await supabase.auth.getUser(token)
    if (user?.user?.id !== report.user_id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }
  }

  const scan = report.scans as {
    pr_title?: string
    severity_score: number
    findings: unknown[]
    repositories: { full_name: string } | null
  } | null

  const reportData = {
    repo_name: scan?.repositories?.full_name ?? 'Unknown Repository',
    pr_title: scan?.pr_title ?? null,
    findings: (scan?.findings ?? []),
    severity_score: scan?.severity_score ?? 0,
    client_name: report.client_name,
    agency_name: report.agency_name,
    agency_logo_url: report.agency_logo_url,
  }

  // Write data to a temp file (avoids shell escaping issues with large JSON)
  const tmpId = randomBytes(8).toString('hex')
  const dataPath = join(tmpdir(), `sentinel_data_${tmpId}.json`)
  const pdfPath = join(tmpdir(), `sentinel_report_${tmpId}.pdf`)

  try {
    await writeFile(dataPath, JSON.stringify(reportData))

    const scriptPath = join(process.cwd(), 'scripts', 'generate_report.py')

    await execFileAsync('python3', [scriptPath, '--file', dataPath, '--output', pdfPath], {
      timeout: 30_000, // 30s max
    })

    const pdfBuffer = await readFile(pdfPath)

    const filename = [
      report.agency_name ?? 'sentinel',
      report.client_name ?? 'report',
      slug,
    ]
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[pdf-gen]', msg)

    if (msg.includes('ENOENT') && msg.includes('python3')) {
      return NextResponse.json(
        { error: 'python3 not found. Install Python 3 and run: pip install -r requirements.txt' },
        { status: 500 }
      )
    }
    if (msg.includes('weasyprint') || msg.includes('jinja2')) {
      return NextResponse.json(
        { error: 'Missing Python dependencies. Run: pip install -r requirements.txt' },
        { status: 500 }
      )
    }
    console.error('[pdf-gen] unhandled error:', msg)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  } finally {
    // Clean up temp files
    await unlink(dataPath).catch(() => {})
    await unlink(pdfPath).catch(() => {})
  }
}
