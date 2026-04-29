'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleMagicLink(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const appUrl = window.location.origin
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl}/auth/callback` },
    })
    setSent(true)
    setLoading(false)
  }

  async function handleGitHub() {
    const supabase = createClient()
    const appUrl = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${appUrl}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">👁️</div>
          <h1 className="text-2xl font-bold text-white">Lurk</h1>
          <p className="text-slate-400 mt-1">Security scanning for AI-generated code</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">
          <Button
            onClick={handleGitHub}
            className="w-full bg-white text-black hover:bg-slate-100 font-medium"
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-slate-900 px-2 text-slate-400">or</span>
            </div>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="text-[#00FF94] text-2xl mb-2">✉️</div>
              <p className="text-white font-medium">Check your email</p>
              <p className="text-slate-400 text-sm mt-1">We sent a magic link to {email}</p>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-slate-300">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium"
                size="lg"
              >
                {loading ? 'Sending...' : 'Sign in with Magic Link'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
