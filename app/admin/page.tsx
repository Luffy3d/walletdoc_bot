'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Users, Activity, ChevronDown, ChevronUp } from 'lucide-react'

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  
  // States to hold the user data and toggle the table
  const [stats, setStats] = useState({ totalUsers: 0, linkedBots: 0 })
  const [usersList, setUsersList] = useState<any[]>([])
  const [showTable, setShowTable] = useState(false)
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

      setIsAuthorized(true)

      try {
        // 1. Fetch ALL user data AND their connected transactions to count them
        const { data: allUsers, count: totalUsers } = await supabase
          .from('users') 
          .select('*, transactions(id, created_at)', { count: 'exact' })

        // 2. Fetch users with linked telegram bots
        const { count: linkedBots } = await supabase
          .from('users') 
          .select('*', { count: 'exact', head: true })
          .not('tci', 'is', null) 

        setStats({
          totalUsers: totalUsers || 0,
          linkedBots: linkedBots || 0
        })
        
        // 3. Process the transaction counts for the table
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const enrichedUsers = (allUsers || []).map(u => {
          const txs = u.transactions || []
          const totalEntries = txs.length
          
          // Filter transactions to only count ones from the current month & year
          const currentMonthEntries = txs.filter((tx: any) => {
            const txDate = new Date(tx.created_at)
            return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
          }).length

          return {
            ...u,
            totalEntries,
            currentMonthEntries
          }
        })

        // Sort by users who have the most entries this month
        enrichedUsers.sort((a, b) => b.currentMonthEntries - a.currentMonthEntries)

        setUsersList(enrichedUsers)
        
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
          {/* Interactive Card: Click to toggle table */}
          <div 
            onClick={() => setShowTable(!showTable)}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-6 text-slate-500">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                  <Users size={24} />
                </div>
                <h2 className="text-sm font-bold tracking-widest uppercase">Total Registered</h2>
              </div>
              {showTable ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {loadingStats ? (
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            ) : (
              <p className="text-6xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{stats.totalUsers}</p>
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

        {/* Detailed Users Table (Revealed on Click) */}
        {showTable && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm mb-6 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">User Directory</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Contact Info</th>
                    <th className="px-6 py-4 font-semibold">Telegram ID</th>
                    <th className="px-6 py-4 font-semibold">Total Entries</th>
                    <th className="px-6 py-4 font-semibold">This Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No users found in database.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{u.full_name || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span>{u.email || 'N/A'}</span>
                            <span className="text-xs text-slate-400">{u.phone_number || 'No Phone'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {u.tci ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              {u.tci}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not Linked</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {u.totalEntries}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            u.currentMonthEntries > 0 
                              ? 'bg-blue-50 text-blue-700 ring-blue-600/20' 
                              : 'bg-slate-50 text-slate-600 ring-slate-500/10'
                          }`}>
                            {u.currentMonthEntries} logged
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
