'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wallet, Mail, Loader2, CheckCircle2, User, Phone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const authOptions: any = {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    }

    if (isSignUp) {
      authOptions.data = {
        full_name: fullName,
        mobile_number: mobile,
      }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: authOptions,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ 
        type: 'success', 
        text: `Check your email for the magic link to ${isSignUp ? 'create your account' : 'log in'}!` 
      })
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Wallet size={28} />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            Welcome to docwallet
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isSignUp ? 'Sign up to start tracking your expenses effortlessly.' : 'Log in to access your dashboard and track your finances.'}
          </p>
        </div>

        {/* NEW: Sleek Tab Toggle */}
        <div className="flex p-1 mt-6 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setMessage(null); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              !isSignUp 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setMessage(null); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              isSignUp 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleAuth}>
          <AnimatePresence mode="popLayout">
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Full Name Input */}
                <div className="space-y-2">
                  <label htmlFor="full-name" className="text-sm font-medium text-slate-700">Full Name</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                      id="full-name"
                      type="text"
                      required={isSignUp}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                      placeholder="e.g. Ranganathan"
                    />
                  </div>
                </div>

                {/* Mobile Number Input */}
                <div className="space-y-2">
                  <label htmlFor="mobile" className="text-sm font-medium text-slate-700">Mobile Number</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Phone className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                      id="mobile"
                      type="tel"
                      required={isSignUp}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Input (Always Visible) */}
          <div className="space-y-2">
            <label htmlFor="email-address" className="text-sm font-medium text-slate-700">
              Email address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <input
                id="email-address"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {message && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-2 rounded-xl p-4 text-sm ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {message.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0" />}
              {message.text}
            </motion.div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isSignUp ? 'Send Sign Up Link' : 'Send Login Link'
              )}
            </button>
          </div>
        </form>

      </motion.div>
    </div>
  )
}
