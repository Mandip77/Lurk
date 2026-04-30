import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstallationOctokit } from '@/lib/github'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const installationId = searchParams.get('installation_id')
  const setupAction = searchParams.get('setup_action') // 'install' or 'update'

  if (!installationId) {
    return NextResponse.redirect(`${origin}/repositories?error=missing_installation_id`)
  }

  // Get current user from session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    const octokit = await getInstallationOctokit(installationId)
    const service = createServiceClient()

    if (setupAction === 'install' || !setupAction) {
      // List all repos accessible to this installation
      const { data: installationRepos } = await octokit.apps.listReposAccessibleToInstallation({
        per_page: 100,
      })

      const repos = installationRepos?.repositories ?? []

      if (repos.length > 0) {
        const rows = repos.map((r: { id: number; full_name: string; private: boolean }) => ({
          user_id: user.id,
          installation_id: installationId,
          provider_repo_id: String(r.id),
          full_name: r.full_name,
          provider: 'github',
          is_active: true,
          webhook_secret: crypto.randomUUID(),
        }))

        await service
          .from('repositories')
          .upsert(rows, { onConflict: 'user_id,provider,provider_repo_id' })
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin
    return NextResponse.redirect(`${appUrl}/repositories?synced=1`)
  } catch (err) {
    console.error('GitHub setup callback error:', err)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin
    return NextResponse.redirect(`${appUrl}/repositories?error=sync_failed`)
  }
}
