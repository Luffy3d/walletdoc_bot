import Link from 'next/link'
import { Wallet, MessageCircle, BarChart3, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react'

// --- SEO METADATA ---
export const metadata = {
  title: 'docwallet | AI Expense Tracker on Telegram',
  description: 'Track your expenses as easily as texting a friend. docwallet uses AI to automatically categorize your spending via Telegram and visualize it on a beautiful web dashboard.',
  keywords: 'Telegram expense tracker, AI personal finance bot, track expenses by chat, budget tracker without app',
  openGraph: {
    title: 'docwallet | The Zero-Friction AI Expense Tracker',
    description: 'Stop using complicated budgeting apps. Text your expenses to our AI bot and let it do the heavy lifting.',
    type: 'website',
  }
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Wallet size={20} />
            </div>
            <span className="text-xl font-bold text-slate-900">docwallet</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Log In
            </Link>
            <Link href="/login" className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all">
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Powered by Google Gemini AI</span>
          </div>
          
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl">
            Track expenses as easily as <span className="text-indigo-600">texting a friend.</span>
          </h1>
          
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Tired of complicated budgeting apps? Just text your expenses to docwallet on Telegram. Our AI automatically categorizes your spending and updates your private visual dashboard instantly.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Start Tracking for Free <ArrowRight size={18} />
            </Link>
            <p className="text-sm text-slate-500 sm:hidden">No app installation required.</p>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-slate-500">
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500"/> Zero friction logging</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500"/> No app downloads</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500"/> Bank-level privacy</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / FEATURES SECTION */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">The end of manual data entry.</h2>
            <p className="mt-4 text-lg text-slate-600">docwallet combines the convenience of a chat app with the power of a professional financial dashboard.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 hover:shadow-lg transition-shadow">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <MessageCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Natural Chat Interface</h3>
              <p className="text-slate-600">
                Just type <em>"Paid ₹400 for Uber"</em> or <em>"Received ₹2000 from client"</em>. The AI understands context and handles the rest.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 hover:shadow-lg transition-shadow">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Beautiful Visual Dashboard</h3>
              <p className="text-slate-600">
                Log in to your private web dashboard to view automatic categorization, monthly summaries, and export your data to CSV.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 hover:shadow-lg transition-shadow">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">100% Private & Secure</h3>
              <p className="text-slate-600">
                We don't ask for your bank passwords. You only log what you want. Your data is encrypted and securely stored.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <footer className="bg-slate-900 py-20 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-6">Ready to take control of your money?</h2>
          <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-indigo-400 transition-colors">
            Create Your Free Account
          </Link>
          <div className="mt-12 border-t border-slate-800 pt-8 text-sm text-slate-400">
            © {new Date().getFullYear()} docwallet. Built for seamless financial tracking.
          </div>
        </div>
      </footer>

    </div>
  )
}
