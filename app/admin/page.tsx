'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Activity, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// 🚨 ADMIN EMAIL - ONLY this email can see this page
const ADMIN_EMAIL = "ranadev4test@gmail.com" 

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function checkAdminAndFetch() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || user.email !== ADMIN_EMAIL) {
        router.push('/') // Kick out non-admins
        return
      }

      setAuthorized(true)

      // Fetch Stats
      const { count: totalCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      const { count: activeCount } = await supabase.from('telegram_devices').select('*', { count: 'exact', head: true })

      setStats({
        totalUsers: totalCount || 0,
        activeUsers: activeCount || 0
      })
      setLoading(false)
    }

    checkAdminAndFetch()
  }, [])

  if (!authorized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12 font-sans text-slate-900">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold mb-2">
              <ShieldCheck size={20} />
              <span className="uppercase tracking-widest text-xs">Admin Command Center</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">docwallet Growth</h1>
          </div>
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-all">
            <ArrowLeft size={16} /> My Dashboard
          </Link>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Total Users Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Users size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Registered</p>
            <p className="text-5xl font-black mt-2">{stats.totalUsers}</p>
          </div>

          {/* Active Bots Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Activity size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Linked Telegram Bots</p>
            <p className="text-5xl font-black mt-2">{stats.activeUsers}</p>
          </div>
        </div>

        <div className="mt-12 rounded-2xl bg-slate-900 p-8 text-white">
          <h3 className="text-lg font-bold mb-2">Growth Tip 📈</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your conversion rate is currently **{stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : 0}%**. 
            This represents how many users signed up and actually linked their Telegram bot. Focus on making the "Link Bot" step as easy as possible to increase this number.
          </p>
        </div>
      </div>
    </div>
  )
}
