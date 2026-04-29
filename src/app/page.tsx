import { LinkButton } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <span className="font-bold text-white">Sentinel AI</span>
        </div>
        <div className="flex items-center gap-4">
          <LinkButton href="/pricing" variant="ghost" size="sm" className="text-slate-400">Pricing</LinkButton>
          <LinkButton href="/login" size="sm" className="bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium">
            Get Started Free
          </LinkButton>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-8">
          <span className="w-2 h-2 bg-[#00FF94] rounded-full animate-pulse" />
          AI-powered security scanning for every pull request
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Stop shipping<br />
          <span className="text-[#00FF94]">vulnerable AI code</span>
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Sentinel AI automatically scans every pull request for security vulnerabilities introduced by AI-generated code — RLS misconfigurations, broken auth, supply chain risks, and more.
        </p>
        <div className="flex items-center gap-4 justify-center">
          <LinkButton href="/login" size="lg" className="bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium text-base">
            Start scanning for free
          </LinkButton>
          <LinkButton href="/pricing" size="lg" variant="outline" className="border-slate-700 text-white hover:bg-slate-800 text-base">
            View pricing
          </LinkButton>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-slate-800">
        <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Connect your repo', desc: 'Install the Sentinel AI GitHub App. No code changes required.' },
            { step: '02', title: 'Open a pull request', desc: 'Every PR automatically triggers a security scan in the background.' },
            { step: '03', title: 'Get instant feedback', desc: 'Findings appear as a PR comment with severity scores and fix suggestions.' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="text-4xl font-bold text-[#00FF94] mb-4 font-mono">{item.step}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vulnerability categories */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-slate-800">
        <h2 className="text-3xl font-bold text-center mb-4">What we detect</h2>
        <p className="text-slate-400 text-center mb-12">Specialized in vulnerabilities that AI code generators commonly introduce</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '🗄️', title: 'RLS Misconfigurations', desc: 'Supabase tables with disabled or overly permissive RLS policies' },
            { icon: '🔐', title: 'Broken Auth', desc: 'JWT in localStorage, missing token expiry, hardcoded secrets' },
            { icon: '📦', title: 'Supply Chain', desc: 'Hallucinated npm packages, typosquatting, known malicious deps' },
            { icon: '💉', title: 'Prompt Injection', desc: 'Unsanitized user input passed directly to LLM API calls' },
          ].map(cat => (
            <div key={cat.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-2xl mb-3">{cat.icon}</div>
              <h3 className="text-white font-semibold mb-2">{cat.title}</h3>
              <p className="text-slate-400 text-sm">{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-slate-800 text-center">
        <h2 className="text-3xl font-bold mb-4">Simple pricing</h2>
        <p className="text-slate-400 mb-10">Free to start. Upgrade for fix suggestions and unlimited scans.</p>
        <div className="flex items-center gap-6 justify-center flex-wrap">
          {[
            { name: 'Free', price: '$0', features: '3 scans/month' },
            { name: 'Pro', price: '$29/mo', features: 'Unlimited + fix suggestions', popular: true },
            { name: 'Agency', price: '$99/mo', features: 'White-label PDF reports' },
          ].map(plan => (
            <div
              key={plan.name}
              className={`bg-slate-900 border rounded-xl p-6 w-52 ${plan.popular ? 'border-[#00FF94]' : 'border-slate-800'}`}
            >
              <p className="text-white font-bold text-lg">{plan.name}</p>
              <p className={`text-2xl font-bold mt-1 ${plan.popular ? 'text-[#00FF94]' : 'text-white'}`}>{plan.price}</p>
              <p className="text-slate-400 text-sm mt-2">{plan.features}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <LinkButton href="/login" size="lg" className="bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium">
            Start for free →
          </LinkButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-slate-500 text-sm">
        <p>© 2025 Sentinel AI · Security scanning for AI-generated code</p>
      </footer>
    </div>
  )
}
