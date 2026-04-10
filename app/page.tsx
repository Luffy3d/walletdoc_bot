import Link from 'next/link'
import { Wallet, MessageCircle, BarChart3, ShieldCheck, ArrowRight, CheckCircle2, TrendingUp, Zap } from 'lucide-react'

// --- ADVANCED SEO METADATA ---
export const metadata = {
  title: 'docwallet | The Zero-Friction Telegram Expense Tracker',
  description: 'Stop manually entering data. docwallet is an AI personal finance bot that tracks your expenses via Telegram. Just text what you spent, and we build your dashboard.',
  keywords: 'Telegram expense tracker, AI personal finance bot, track expenses by chat, budget tracker without app, automated finance tracker India',
  openGraph: {
    title: 'docwallet | Text Your Expenses. We Do The Rest.',
    description: 'Budgeting apps are designed to fail because of friction. Try docwallet: the AI expense tracker that lives right inside your Telegram.',
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

      {/* HERO SECTION: The "Hook" */}
      <section className="relative overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="mx-auto max-w-6xl px-6 text-center relative z-10">
          
          {/* UPDATED BADGE */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 mb-8 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">AI POWERED</span>
          </div>
          
          {/* UPDATED HEADLINE (No striking, uniform color) */}
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl">
            Track your expenses as easily as texting a friend.
          </h1>
          
          <p className="mx-auto mt-10 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Ditch the clunky budgeting apps. Just tell the docwallet Telegram bot what you spent. Our AI instantly categorizes it and updates your private financial dashboard.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Start Tracking for Free <ArrowRight size={18} />
            </Link>
          </div>

          {/* CONTACT INFO SECTION */}
          <div className="mt-10 text-center text-slate-800 text-base sm:text-lg">
            <p className="font-medium mb-1">Contact for customization</p>
            <p className="mb-1">
              Email: <a href="mailto:ranadev4test@gmail.com" className="text-slate-900 font-medium underline underline-offset-4 decoration-slate-300 hover:text-indigo-600 hover:decoration-indigo-600 transition-colors">ranadev4test@gmail.com</a>
            </p>
            <p>
              GitHub: <a href="https://github.com/Luffy3d" target="_blank" rel="noopener noreferrer" className="text-slate-900 font-medium underline underline-offset-4 decoration-slate-300 hover:text-indigo-600 hover:decoration-indigo-600 transition-colors">https://github.com/Luffy3d</a>
            </p>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-slate-500">
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500"/> Takes 2 seconds</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500"/> No app downloads</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500"/> 100% Free to start</div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM SECTION: The "Agitation" */}
      <section className="bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Budgeting apps are designed to fail.</h2>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed">
            You know the cycle. You download a finance tracker, meticulously log every coffee for three days, and then give up because it's too much work. <strong>You shouldn't need six screen taps and a dropdown menu just to log a ₹500 petrol run.</strong> Friction is the enemy of consistency.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS / FEATURES SECTION: The "Solution" */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Meet zero-friction finance.</h2>
            <p className="mt-4 text-lg text-slate-600">docwallet combines the convenience of Telegram with the power of a professional dashboard.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 hover:-translate-y-1">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <MessageCircle size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Natural Chat Interface</h3>
              <p className="text-slate-600">
                Forget forms. Just type <em>"Paid ₹12,000 for Car EMI"</em> or <em>"Got ₹2000 from client"</em>. Our AI understands context, extracts the exact data, and categorizes it instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 hover:shadow-xl hover:shadow-emerald-100 transition-all duration-300 hover:-translate-y-1">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Your Private Dashboard</h3>
              <p className="text-slate-600">
                Behind the chat bot is a secure, blazing-fast web dashboard. Log in from your laptop to see your net balance, edit entries, and view your monthly cash flow.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 hover:shadow-xl hover:shadow-rose-100 transition-all duration-300 hover:-translate-y-1">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Bank-Level Privacy</h3>
              <p className="text-slate-600">
                We never ask for your bank passwords or read your SMS. You have complete control over what gets logged. Want to leave? Export all your data to CSV with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <footer className="bg-indigo-600 py-20 text-center relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute top-12 -right-12 w-64 h-64 rounded-full bg-white blur-3xl"></div>
        </div>
        
        <div className="mx-auto max-w-4xl px-6 relative z-10">
          <h2 className="text-3xl font-bold text-white sm:text-5xl mb-6">Take control of your money today.</h2>
          <p className="text-indigo-100 mb-10 text-lg max-w-2xl mx-auto">Join the smart professionals who track their finances without the headache. Setup takes exactly 45 seconds.</p>
          <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-10 py-5 text-lg font-bold text-indigo-600 shadow-xl hover:bg-slate-50 hover:scale-[1.02] transition-all">
            <Zap size={20} className="text-amber-500" /> Let's Go
          </Link>
          <div className="mt-16 pt-8 text-sm text-indigo-200">
            © {new Date().getFullYear()} docwallet. Built for seamless financial tracking.
          </div>
        </div>
      </footer>

    </div>
  )
}
