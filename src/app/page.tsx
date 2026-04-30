import { LinkButton } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060d1a] text-white font-sans">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#060d1a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/30 flex items-center justify-center text-base">
              👁️
            </div>
            <span className="font-semibold text-white tracking-tight">Lurk</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <LinkButton href="/login" variant="outline" size="sm" className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white px-4">
              Sign in
            </LinkButton>
            <LinkButton href="/login" size="sm" className="bg-[#00FF94] text-[#060d1a] hover:bg-[#00e085] font-semibold px-4">
              Start free
            </LinkButton>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-28 pb-24 px-6">
        {/* background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="w-[700px] h-[400px] rounded-full bg-[#00FF94]/6 blur-[120px] -translate-y-1/4" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-[#00FF94]/20 bg-[#00FF94]/5 rounded-full px-4 py-1.5 text-sm text-[#00FF94] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF94] animate-pulse" />
            Now scanning with Claude Haiku — $0.0003 per PR
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
            Every AI-generated PR,{' '}
            <br className="hidden sm:block" />
            <span className="text-[#00FF94]">scanned before it ships</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Lurk connects to your GitHub repositories and automatically audits every pull request for security vulnerabilities that AI code assistants commonly introduce — RLS misconfigurations, hardcoded secrets, broken auth, and supply chain risks.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <LinkButton
              href="/login"
              className="bg-[#00FF94] text-[#060d1a] hover:bg-[#00e085] font-semibold text-base px-8 py-3 h-auto rounded-xl"
            >
              Start scanning for free →
            </LinkButton>
            <LinkButton
              href="#how"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-base px-8 py-3 h-auto rounded-xl"
            >
              See how it works
            </LinkButton>
          </div>

          <p className="mt-5 text-sm text-slate-500">Free plan · 3 scans/month · No credit card</p>
        </div>

        {/* PR comment preview */}
        <div className="relative max-w-2xl mx-auto mt-16">
          <div className="rounded-2xl border border-white/8 bg-[#0d1626] overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/2">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-slate-500 font-mono">GitHub PR #47 — Comment</span>
            </div>
            <div className="p-5 font-mono text-sm space-y-2">
              <p className="text-white font-semibold">👁️ Lurk Security Scan</p>
              <p className="text-slate-400">Status: <span className="text-red-400 font-semibold">🔴 CRITICAL</span> &nbsp;·&nbsp; Score: <span className="text-white">73/100</span> &nbsp;·&nbsp; Findings: <span className="text-white">3</span></p>
              <div className="border-t border-white/5 my-3" />
              <div className="space-y-1">
                <p className="text-red-400">🔴 CRITICAL — Supabase RLS disabled on users table</p>
                <p className="text-slate-500 text-xs">File: <span className="text-slate-400">supabase/migrations/001.sql</span> · Lines 12-14</p>
              </div>
              <div className="space-y-1 mt-3">
                <p className="text-orange-400">🟠 HIGH — JWT stored in localStorage</p>
                <p className="text-slate-500 text-xs">File: <span className="text-slate-400">src/lib/auth.ts</span> · Line 34</p>
              </div>
              <div className="border-t border-white/5 my-3" />
              <p className="text-[#00FF94] text-xs">View full report → lurk.dev/scans/abc123</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#00FF94] text-sm font-semibold tracking-widest uppercase mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Set up in under 5 minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                title: 'Connect your repo',
                desc: 'Install the Lurk GitHub App on any repository. No code changes, no CI config.',
                icon: '📁',
              },
              {
                n: '02',
                title: 'Open a pull request',
                desc: 'Every PR triggers an automatic scan. We fetch the diff and send it to Claude for analysis.',
                icon: '🔍',
              },
              {
                n: '03',
                title: 'Get findings instantly',
                desc: 'Results appear as a PR comment with severity scores, affected lines, and fix suggestions.',
                icon: '💬',
              },
            ].map(s => (
              <div key={s.n} className="relative rounded-2xl border border-white/6 bg-[#0d1626] p-6 group hover:border-[#00FF94]/20 transition-colors">
                <div className="text-3xl mb-4">{s.icon}</div>
                <div className="absolute top-5 right-5 font-mono text-3xl font-bold text-white/5 group-hover:text-[#00FF94]/10 transition-colors">{s.n}</div>
                <h3 className="font-semibold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#00FF94] text-sm font-semibold tracking-widest uppercase mb-3">What we catch</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Vulnerabilities AI tools introduce</h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">
              Copilot, Cursor, and Claude are powerful — but they hallucinate packages, skip auth checks, and disable RLS. We catch it before you merge.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: '🗄️',
                title: 'RLS Misconfigurations',
                desc: 'Supabase tables with RLS disabled, policies using `true`, or missing auth.uid() checks that expose every user\'s data.',
                color: 'text-red-400',
                bg: 'bg-red-500/5 border-red-500/15',
              },
              {
                icon: '🔐',
                title: 'Broken Auth & Secrets',
                desc: 'JWTs in localStorage, hardcoded API keys committed to the repo, missing token expiry, and bypassable auth conditions.',
                color: 'text-orange-400',
                bg: 'bg-orange-500/5 border-orange-500/15',
              },
              {
                icon: '📦',
                title: 'Supply Chain Risks',
                desc: 'Hallucinated npm packages that don\'t exist (typosquatting bait), dependencies pinned to "*", and packages with known CVEs.',
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/5 border-yellow-500/15',
              },
              {
                icon: '💉',
                title: 'Prompt Injection',
                desc: 'Raw user input concatenated directly into LLM API calls, missing sanitization, and system prompt leakage vectors.',
                color: 'text-blue-400',
                bg: 'bg-blue-500/5 border-blue-500/15',
              },
            ].map(f => (
              <div key={f.title} className={`rounded-2xl border p-6 ${f.bg}`}>
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className={`font-semibold text-base mb-2 ${f.color}`}>{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#00FF94] text-sm font-semibold tracking-widest uppercase mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Start free, pay when it saves you</h2>
            <p className="text-slate-400 mt-4">All plans include unlimited repositories. Upgrade for unlimited scans and fix suggestions.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: 'Free',
                price: '$0',
                per: 'forever',
                desc: 'Try it on your next PR',
                features: ['3 scans per month', 'Core vulnerability detection', 'GitHub PR comments', 'Web report viewer'],
                cta: 'Start free',
                href: '/login',
                highlight: false,
              },
              {
                name: 'Pro',
                price: '$15',
                per: 'per month',
                desc: 'For developers who ship daily',
                features: ['Unlimited scans', 'Fix suggestions for all findings', 'Email notifications', 'Priority scan queue', 'API access'],
                cta: 'Upgrade to Pro',
                href: '/login',
                highlight: true,
              },
              {
                name: 'Agency',
                price: '$70',
                per: 'per month',
                desc: 'For teams and consultants',
                features: ['Everything in Pro', 'White-label web reports', 'Shareable report links', 'PDF export (self-hosted)', 'Team seats'],
                cta: 'Get Agency',
                href: '/login',
                highlight: false,
              },
            ].map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? 'border-[#00FF94]/40 bg-[#00FF94]/4'
                    : 'border-white/8 bg-[#0d1626]'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00FF94] text-[#060d1a] text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-500 text-sm mb-1.5">/{plan.per}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">{plan.desc}</p>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="text-[#00FF94] mt-0.5 shrink-0 font-bold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <LinkButton
                  href={plan.href}
                  className={
                    plan.highlight
                      ? 'bg-[#00FF94] text-[#060d1a] hover:bg-[#00e085] font-semibold w-full justify-center'
                      : 'border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white w-full justify-center'
                  }
                >
                  {plan.cta}
                </LinkButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#00FF94]/10 border border-[#00FF94]/20 flex items-center justify-center text-2xl mx-auto mb-6">
            👁️
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Your next PR is being scanned
          </h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Connect your first repository in 2 minutes. Free forever for small teams.
          </p>
          <LinkButton
            href="/login"
            className="bg-[#00FF94] text-[#060d1a] hover:bg-[#00e085] font-semibold text-base px-10 py-3 h-auto rounded-xl"
          >
            Get started — it&apos;s free →
          </LinkButton>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span>👁️</span>
            <span className="font-semibold text-slate-400">Lurk</span>
            <span className="text-slate-600">·</span>
            <span>Security scanning for AI-generated code</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/login" className="hover:text-slate-300 transition-colors">Sign in</a>
            <a href="#pricing" className="hover:text-slate-300 transition-colors">Pricing</a>
            <span>© 2025</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
