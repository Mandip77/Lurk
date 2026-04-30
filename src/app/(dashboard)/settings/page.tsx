import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

  async function handleBillingPortal() {
    'use server'
    // Client-side redirect handled via form
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
        <h2 className="text-white font-semibold">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Email</span>
            <span className="text-white">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Name</span>
            <span className="text-white">{profile?.full_name ?? '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Plan</span>
            <span className="text-white capitalize">{profile?.tier ?? 'free'}</span>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
        <h2 className="text-white font-semibold">Billing</h2>
        <p className="text-slate-400 text-sm">Manage your subscription and payment methods.</p>
        <form action="/api/stripe/portal" method="POST">
          <Button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white">
            Open Billing Portal
          </Button>
        </form>
        <Link href="/pricing" className="text-[#00FF94] text-sm hover:underline block">
          View pricing plans →
        </Link>
      </Card>

      <Card className="bg-red-950/30 border-red-900 p-6 space-y-4">
        <h2 className="text-red-400 font-semibold">Danger Zone</h2>
        <p className="text-slate-400 text-sm">These actions are irreversible.</p>
        <Button variant="destructive" size="sm" disabled>
          Delete Account
        </Button>
      </Card>
    </div>
  )
}
