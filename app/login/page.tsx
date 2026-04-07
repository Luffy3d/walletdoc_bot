'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, Edit2, LogOut, Wallet } from 'lucide-react'

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  
  const router = useRouter()
  // Uses your exact local Supabase setup to prevent Vercel errors
  const supabase = createClient()

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

const checkUserAndFetchData = async () => {
    // 1. Check if user is logged in securely
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      // STOP the loading spinner before redirecting
      setLoading(false) 
      router.push('/login')
      return
    }

    setUserEmail(user.email || '')

    // 2. Fetch only their transactions
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) setTransactions(data)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this transaction?")
    if (!confirmDelete) return

    const { error } = await supabase.from("transactions").delete().eq("id", id)
    
    if (error) {
      alert("Error deleting transaction: " + error.message)
    } else {
      setTransactions(transactions.filter((tx) => tx.id !== id))
    }
  }

  const handleEditAmount = async (id: string, currentAmount: number) => {
    const newAmount = window.prompt("Enter new amount in ₹:", currentAmount.toString())
    if (!newAmount || isNaN(Number(newAmount))) return

    const { error } = await supabase
      .from("transactions")
      .update({ amount: Number(newAmount) })
      .eq("id", id)

    if (error) {
      alert("Error updating transaction: " + error.message)
    } else {
      checkUserAndFetchData() // Refresh list immediately
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <Wallet size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">docwallet Dashboard</h1>
              <p className="text-sm text-slate-500">{userEmail}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Transactions Table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-600">Type</th>
                  <th className="p-4 font-semibold text-slate-600">Category</th>
                  <th className="p-4 font-semibold text-slate-600">Source</th>
                  <th className="p-4 font-semibold text-slate-600">Amount</th>
                  <th className="p-4 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No transactions yet. Send a message to your Telegram bot to log your first expense!
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          tx.type === 'Income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-700">{tx.category}</td>
                      <td className="p-4 text-slate-500">{tx.entity_source || '-'}</td>
                      <td className="p-4 font-semibold text-slate-900">₹{tx.amount}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleEditAmount(tx.id, tx.amount)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="Edit Amount"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(tx.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
