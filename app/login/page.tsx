'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wallet, Mail, Loader2, CheckCircle2, KeyRound } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  // STEP 1: Request the 8-digit code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, 
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: `8-digit code sent to ${email}` })
      setStep('otp') 
    }
    setLoading(false)
  }

  // STEP 2: Verify the code and log in directly
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else if (data.session) {
      // SUCCESS! The session cookie is securely set. Let's go to the dashboard.
      router.push('/dashboard')
    }
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
            docwallet Secure Login
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {step === 'email' ? 'Enter your email to receive a secure login code.' : 'Enter the 8-digit code sent to your email.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.form 
              key="email-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="mt-8 space-y-4" 
              onSubmit={handleSendCode}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {message && (
                <div className={`rounded-xl p-4 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Send Login Code'}
              </button>
            </motion.form>

          ) : (

            <motion.form 
              key="otp-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="mt-8 space-y-4" 
              onSubmit={handleVerifyCode}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">8-Digit Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 outline-none tracking-widest font-mono text-lg focus:ring-2 focus:ring-indigo-200"
                    placeholder="12345678"
                  />
                </div>
              </div>

              {message && (
                <div className={`rounded-xl p-4 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {message.type === 'success' && <CheckCircle2 className="inline mr-2 h-4 w-4" />}
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 8}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Verify & Log In'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setMessage(null); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700 mt-2"
              >
                ← Back to email
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
