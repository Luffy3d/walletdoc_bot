'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wallet, Mail, Loader2, CheckCircle2, User, Phone, KeyRound } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [step, setStep] = useState<'email' | 'otp'>('email')
  
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const supabase = createClient()

  // STEP 1: Request the 6-digit code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Differentiate between Login and Signup
    const authOptions: any = {
      shouldCreateUser: isSignUp, // Prevents creating accidental accounts on the Login tab
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
        text: `6-digit code sent to ${email}` 
      })
      setStep('otp') // Move to OTP verification step
    }
    setLoading(false)
  }

  // STEP 2: Verify the 6-digit code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    }) // ✅ FIX: Added the missing closing bracket and parenthesis here!

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else if (data.session || data.user) {
      // Keep the button spinning while routing
      setLoading(true) 
      
      // 🚨 THE SMART REDIRECT: Check if it is the Admin email
      if (email.toLowerCase() === 'ranadev4test@gmail.com') {
        setMessage({ type: 'success', text: 'Admin Verified! Loading control panel...' })
        window.location.href = '/admin'
      } else {
        setMessage({ type: 'success', text: 'Verified! Loading your dashboard...' })
        window.location.href = '/dashboard'
      }
    } else {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      setLoading(false)
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
            docwallet
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {step === 'email' 
              ? (isSignUp ? 'Sign up to start tracking your expenses.' : 'Log in to access your dashboard.')
              : 'Enter the 6-digit code sent to your email.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.div key="email-step" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              
              {/* Sleek Tab Toggle */}
              <div className="flex p-1 mt-6 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setMessage(null); }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    !isSignUp ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setMessage(null); }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    isSignUp ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSendCode}>
                <AnimatePresence mode="popLayout">
                  {isSignUp && (
                    <motion.div
                      key="signup-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                          <input
                            type="text"
                            required={isSignUp}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Mobile</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                          <input
                            type="tel"
                            required={isSignUp}
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-indigo-200 sm:text-sm"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                  {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (isSignUp ? 'Send Sign Up Code' : 'Send Login Code')}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.form 
              key="otp-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="mt-8 space-y-4" 
              onSubmit={handleVerifyCode}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">6-Digit Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 outline-none tracking-widest font-mono text-lg focus:ring-2 focus:ring-indigo-200 text-center"
                    placeholder="123456"
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
                disabled={loading || otp.length !== 6}
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
