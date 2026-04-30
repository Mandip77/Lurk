'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LinkButton } from '@/components/ui/button'

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const step = target / 40
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 30)
    return () => clearInterval(timer)
  }, [target])
  return <span>{count.toLocaleString()}{suffix}</span>
}

const findings = [
  { delay: 0, severity: 'critical', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'CRITICAL', text: 'Supabase RLS disabled on users table', file: 'migrations/001.sql · Lines 12-14' },
  { delay: 150, severity: 'high', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: 'HIGH', text: 'JWT stored in localStorage', file: 'src/lib/auth.ts · Line 34' },
  { delay: 300, severity: 'medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'MEDIUM', text: 'Hardcoded API key in source', file: 'src/config.ts · Line 8' },
]

export default function LandingPage() {
  const [visible, setVisible] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll) }
  }, [])

  return (
    <div className="min-h-screen bg-[#060d1a] text-white font-sans">

      {/* NAV */}
      <nav className={`sticky top-0 z-50 border-b transition-all duration-300 ${navScrolled ? 'border-white/10 bg-[#060d1a]/95 backdrop-blur-xl shadow-lg shadow-black/20' : 'border-white/5 bg-[#060d1a]/80 backdrop-blur-md'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/30 flex items-center justify-center text-base transition-all duration-200 group-hover:bg-[#00FF94]/20 group-hover:border-[#00FF94]/50 group-hover:scale-110">
              👁️
            </div>
            <span className="font-semibold text-white tracking-tight group-hover:text-[#00FF94] transition-colors duration-200">Lurk</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            {['#how', '#features', '#pricing'].map((href, i) => (
              <a key={href} href={href} className="hover:text-white transition-colors duration-150 relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-px after:bg-[#00FF94] hover:after:w-full after:transition-all after:duration-200">
                {['How it works', 'Features', 'Pricing'][i]}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <LinkButton href="/login" variant="outline" size="sm" className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white px-4 transition-all duration-150">
              Sign in
            </LinkButton>
            <LinkButton href="/login" size="sm" className="bg-[#00FF94] text-[#060d1a] hover:bg-[#00e085] font-semibold px-4 transition-all duration-150 hover:scale-105 hover:shadow-lg hover:shadow-[#00FF94]/20">
              Start free
            </LinkButton>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden pt-28 pb-24 px-6">
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="w-[800px] h-[500px] rounded-full bg-[#00FF94]/5 blur-[130px] -translate-y-1/4 animate-pulse" style={{ animationDuration: '4s' }} />
        </div>
        <div className="pointer-events-none absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-blue-500/3 blur-[100px]" />
        <div className="pointer-events-none absolute top-1/4 right-1/4 w-[200px] h-[200px] rounded-full bg-purple-500/3 blur-[80px]" />

        <div className={`relative max-w-4xl mx-auto text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 border border-[#00FF94]/20 bg-[#00FF94]/5 rounded-full px-4 py-1.5 text-sm text-[#00FF94] mb-8 hover:bg-[#00FF94]/10 transition-colors duration-200 cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF94] animate-pulse" />
            Now scanning with Claude Haiku — $0.0003 per PR
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
            Every AI-generated PR,{' '}
            <br className="hidden sm:block" />
            <span className="text-[#00FF94] relative">
              scanned before it ships
              <span className="absolute -bottom-1 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00FF94]/50 to-transparent" />
            </span>
          </h1>

          <p className={`text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Lurk connects to your GitHub repositories and automatically audits every pull request for security vulnerabilities that AI code assistants commonly introduce — RLS misconfigurations, hardcoded secrets, broken auth, and supply chain risks.
          </p>

          <div className={`flex flex-col sm:flex-row gap-3 justify-center transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <LinkButton href="/login" className="bg-[#00FF94] text-[#060d1a] hover:bg-[#00e085] font-semibold text-base px-8 py-3 h-auto rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-[#00FF94]/25">
              Start scanning for free →
            </LinkButton>
            <LinkButton href="#how" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-base px-8 py-3 h-auto rounded-xl transition-all duration-200">
              See how it works
            </LinkButton>
          </div>

          <p className="mt-5 text-sm text-slate-500">Free plan · 3 scans/month · No credit card</p>
        </div>

        {/* Animated PR comment mockup */}
        <div className={`relative max-w-2xl mx-auto mt-16 transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="rounded-2xl border border-white/8 bg-[#0d1626] overflow-hidden shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/2">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-slate-500 font-mono">GitHub PR #47 — Lurk Security Scan</span>
              <span className="ml-auto text-xs text-slate-600">just now</span>
            </div>
            <div className="p-5 font-mono text-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">👁️ Lurk Security Scan</span>
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5">CRITICAL</span>
              </div>
              <p className="text-slate-400 text-xs">Score: <span className="text-white font-semibold">73/100</span> · Findings: <span className="text-white font-semibold">3</span> · Model: claude-haiku-4-5</p>
              <div className="border-t border-white/5 my-2" />
              {findings.map((f, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 space-y-1 transition-all duration-500 ${f.bg}`}
                  style={{ transitionDelay: `${600 + f.delay}ms`, opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-12px)' }}
                >
                  <p className={`${f.color} text-xs font-semibold`}>● {f.label} — {f.text}</p>
                  <p className="text-slate-500 text-xs">{f.file}</p>
                </div>
              ))}
              <div className="border-t border-white/5 pt-2">
                <p className="text-[#00FF94] text-xs hover:underline cursor-pointer">View full report → lurk-cyan.vercel.app/scans/abc123</p>
              </div>
            </div>
          </div>
          {/* Glow under card */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-[#00FF94]/10 blur-xl rounded-full" />
        </div>

        {/* Stats row */}
        <div className={`relative max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-6 transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {[
            { value: 99, suffix: '%', label: 'Margin at scale' },
            { value: 3, suffix: 's', label: 'Avg scan time' },
            { value: 0.0003, suffix: '/scan', label: 'AI cost per PR', fixed: true },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-xl border border-white/5 bg-white/2">
              <p className="text-2xl font-bold text-[#00FF94]">
                {s.fixed ? `$${s.value}` : <AnimatedCounter target={s.value as number} suffix={s.suffix} />}
              </p>
              <p className="text-slate-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#00FF94] text-sm font-semibold tracking-widest uppercase mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Set up in under 5 minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-[#00FF94]/20 via-[#00FF94]/40 to-[#00FF94]/20" />
            {[
              { n: '01', title: 'Connect your repo', desc: 'Install the Lurk GitHub App on any repository. No code changes, no CI config required.', icon: '📁' },
              { n: '02', title: 'Open a pull request', desc: 'Every PR triggers an automatic scan. We fetch the diff and send it to Claude for analysis.', icon: '🔍' },
              { n: '03', title: 'Get findings instantly', desc: 'Results appear as a PR comment with severity scores, affected lines, and fix suggestions.', icon: '💬' },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-white/6 bg-[#0d1626] p-6 group hover:border-[#00FF94]/30 hover:bg-[#0d1626]/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#00FF94]/5">
                <div className="text-3xl mb-4">{s.icon}</div>
                <div className="absolute top-5 right-5 font-mono text-3xl font-bold text-white/5 group-hover:text-[#00FF94]/15 transition-colors duration-300">{s.n}</div>
                <h3 className="font-semibold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#00FF94] text-sm font-semibold tracking-widest uppercase mb-3">What we catch</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Vulnerabilities AI tools introduce</h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">Copilot, Cursor, and Claude are powerful, but they hallucinate packages, skip auth checks, and disable RLS. We catch it before you merge.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '🗄️', title: 'RLS Misconfigurations', desc: "Supabase tables with RLS disabled, policies using `true`, or missing auth.uid() checks that expose every user's data.", color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/15', hover: 'hover:border-red-500/30 hover:bg-red-500/8' },
              { icon: '🔐', title: 'Broken Auth & Secrets', desc: 'JWTs in localStorage, hardcoded API keys committed to the repo, missing token expiry, and bypassable auth conditions.', color: 'text-orange-400', bg: 'bg-orange-500/5 border-orange-500/15', hover: 'hover:border-orange-500/30 hover:bg-orange-500/8' },
              { icon: '📦', title: 'Supply Chain Risks', desc: "Hallucinated npm packages that don't exist (typosquatting bait), dependencies pinned to \"*\", and packages with known CVEs.", color: 'text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/15', hover: 'hover:border-yellow-500/30 hover:bg-yellow-500/8' },
              { icon: '💉', title: 'Prompt Injection', desc: 'Raw user input concatenated directly into LLM API calls, missing sanitization, and system prompt leakage vectors.', color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/15', hover: 'hover:border-blue-500/30 hover:bg-blue-500/8' },
            ].map(f => (
              <div key={f.title} className={`rounded-2xl border p-6 ${f.bg} ${f.hover} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group cursor-default`}>
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform duration-200 inline-block">{f.icon}</div>
                <h3 className={`font-semibold text-base mb-2 ${f.color}`}>{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#00FF94] text-sm font-semibold tracking-widest uppercase mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Start free, pay when it saves you</h2>
            <p className="text-slate-400 mt-4">All plans include unlimited repositories. Upgrade for unlimited scans and fix suggestions.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Free', price: '$0', per: 'forever', desc: 'Try it on your next PR', features: ['3 scans per month', 'Core vulnerability detection', 'GitHub PR comments', 'Web report viewer'], cta: 'Start free', href: '/login', highlight: false },
              { name: 'Pro', price: '$15', per: 'per month', desc: 'For developers who ship daily', features: ['Unlimited scans', 'Fix suggestions for all findings', 'Email notifications', 'Priority scan queue', 'API access'], cta: 'Upgrade to Pro', href: '/login', highlight: true },
              { name: 'Agency', price: '$70', per: 'per month', desc: 'For teams and consultants', features: ['Everything in Pro', 'White-label web reports', 'Shareable report links', 'PDF export (self-hosted)', 'Team seats'], cta: 'Get Agency', href: '/login', highlight: false },
            ].map(plan => (
              <div key={plan.name} className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${plan.highlight ? 'border-[#00FF94]/40 bg-[#00FF94]/4 hover:border-[#00FF94]/60 hover:shadow-xl hover:shadow-[#00FF94]/10' : 'border-white/8 bg-[#0d1626] hover:border-white/15 hover:shadow-lg'}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00FF94] text-[#060d1a] text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#00FF94]/30">
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
                <LinkButton href={plan.href} className={plan.highlight
                  ? 'bg-[#00FF94] text-[#060d1a] hover:bg-[#00e085] font-semibold w-full justify-center transition-all duration-200 hover:scale-105'
                  : 'border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white w-full justify-center transition-all duration-200'
                }>
                  {plan.cta}
                </LinkButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#00FF94]/10 border border-[#00FF94]/20 flex items-center justify-center text-2xl mx-auto mb-6 hover:scale-110 hover:bg-[#00FF94]/20 transition-all duration-200 cursor-default">
            👁️
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Your next PR is being watched</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">Connect your first repository in 2 minutes. Free forever for small teams.</p>
          <LinkButton href="/login" className="bg-[#00FF94] text-[#060d1a] hover:bg-[#00e085] font-semibold text-base px-10 py-3 h-auto rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-[#00FF94]/25">
            Get started — it&apos;s free →
          </LinkButton>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span>👁️</span>
            <span className="font-semibold text-slate-400">Lurk</span>
            <span className="text-slate-600">·</span>
            <span>Security scanning for AI-generated code</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-slate-300 transition-colors">Sign in</Link>
            <a href="#pricing" className="hover:text-slate-300 transition-colors">Pricing</a>
            <span>© 2025</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
