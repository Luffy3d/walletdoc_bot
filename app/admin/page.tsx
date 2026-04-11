'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Users, Activity } from 'lucide-react'

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [stats, setStats] = useState({ totalUsers: 0, linkedBots: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function verifyAndFetch() {
      const { data: { user }, error } = await supabase.auth.getUser()

      // THE BOUNCER: Kick out unauthorized users
      if (error || !user || user.email !== 'ranadev4test@gmail.com') {
        router.replace('/dashboard')
        return
      }

      // If authorized, reveal the page
      setIsAuthorized(true)

      // 🚨 FETCH STATS FROM SUPABASE
      try {
        // 1. Fetch total registered users
        // CHANGE 'users' TO YOUR ACTUAL TABLE NAME
        const { count: totalUsers } = await supabase
          .from('users') 
          .select('*', { count: 'exact', head: true })

        // 2. Fetch users with linked telegram bots
        // CHANGE 'users' AND 'chat_id' TO YOUR ACTUAL TABLE/COLUMN NAMES
        const { count: linkedBots } = await supabase
          .from('users') 
          .select('*', { count: 'exact', head: true })
          .not('chat_id', 'is', null) 

        setStats({
          totalUsers: totalUsers || 0,
          linkedBots: linkedBots || 0
        })
      } catch (err) {
        console.error("Error fetching stats:", err)
      } finally {
        setLoadingStats(false)
      }
    }

    verifyAndFetch()
  }, [])

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  // Calculate conversion rate for the Growth Tip
  const conversionRate = stats.totalUsers > 0 
    ? Math.round((stats.linkedBots / stats.totalUsers) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Activity size={18} />
              <span className="text-sm font-bold tracking-wider uppercase">Admin Command Center</span>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900">docwallet Growth</h1>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← My Dashboard
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 text-slate-500">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Users size={24} />
              </div>
              <h2 className="text-sm font-bold tracking-widest uppercase">Total Registered</h2>
            </div>
            {loadingStats ? (
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            ) : (
              <p className="text-6xl font-black text-slate-900">{stats.totalUsers}</p>
            )}
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 text-slate-500">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Activity size={24} />
              </div>
              <h2 className="text-sm font-bold tracking-widest uppercase">Linked Telegram Bots</h2>
            </div>
            {loadingStats ? (
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            ) : (
              <p className="text-6xl font-black text-slate-900">{stats.linkedBots}</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl text-slate-300 shadow-lg">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            Growth Tip 📈
          </h3>
          <p className="text-sm leading-relaxed">
            Your conversion rate is currently <strong className="text-white">{conversionRate}%</strong>. This represents how many users signed up and actually linked their Telegram bot. Focus on making the "Link Bot" step as easy as possible to increase this number.
          </p>
        </div>
      </div>
    </div>
  )
}
