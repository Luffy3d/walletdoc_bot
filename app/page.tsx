'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Wallet, TrendingUp, TrendingDown, Search, Filter, 
  RefreshCw, LogOut, Trash2, Edit2, Loader2, Download, Upload 
} from 'lucide-react'

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  const checkUserAndFetchData = async () => {
    setLoading(true)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      setLoading(false)
      router.push('/login')
      return
    }

    setUserId(user.id)
    setUserEmail(user.email || '')
    setUserName(user.user_metadata?.full_name || null)

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
      checkUserAndFetchData()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // --- EXPORT FUNCTION ---
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert("No transactions to export!");
      return;
    }

    const headers = ['Date', 'Type', 'Category', 'Source', 'Amount'];
    const csvRows = transactions.map(tx => {
      const date = new Date(tx.created_at).toLocaleDateString('en-GB');
      return `"${date}","${tx.type}","${tx.category}","${tx.entity_source || ''}","${tx.amount}"`;
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `docwallet_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- NEW IMPORT FUNCTION ---
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return

    // Reset input so they can upload the same file again if they want
    if (fileInputRef.current) fileInputRef.current.value = ''

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      if (!text) return

      // Split into rows and remove empty lines
      const lines = text.split('\n').filter(line => line.trim() !== '')
      if (lines.length < 2) {
        alert("The CSV file seems to be empty.")
        return
      }

      // Skip the header row (index 0)
      const dataRows = lines.slice(1)
      const newTransactions = []

      for (const row of dataRows) {
        // Smart split that ignores commas inside quotes
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim())
        
        // Ensure row has Date, Type, Category, Source, Amount
        if (cols.length >= 5 && cols[4] !== '') {
          
          // Try to parse the UK format date (DD/MM/YYYY) back into a standard format
          let createdAt = new Date().toISOString()
          const dateParts = cols[0].split('/')
          if (dateParts.length === 3) {
            // Convert to YYYY-MM-DD
            const parsedDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
            if (!isNaN(parsedDate.getTime())) {
              createdAt = parsedDate.toISOString()
            }
          }

          newTransactions.push({
            user_id: userId,
            type: cols[1] === 'Income' ? 'Income' : 'Expense',
            category: cols[2] || 'Uncategorized',
            entity_source: cols[3] || null,
            amount: Number(cols[4]),
            created_at: createdAt,
            raw_text: "Imported via CSV"
          })
        }
      }

      if (newTransactions.length > 0) {
        setLoading(true)
        // Bulk insert all rows at once into Supabase
        const { error } = await supabase.from('transactions').insert(newTransactions)
        
        if (error) {
          alert("Error importing transactions: " + error.message)
          setLoading(false)
        } else {
          alert(`✅ Successfully imported ${newTransactions.length} transactions!`)
          // Refresh the dashboard to show the new data
          checkUserAndFetchData()
        }
      } else {
        alert("Could not read any valid transactions. Please make sure it matches the docwallet Export format.")
      }
    }
    
    // Trigger the file reading
    reader.readAsText(file)
  }

  // Calculate Totals
  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalBalance = totalIncome - totalExpense

  // Filter transactions by search
  const filteredTransactions = transactions.filter(tx => 
    tx.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.entity_source?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      {/* Top Navbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <Wallet size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">docwallet</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100 px-4 py-2 rounded-full">
            <span>👋</span> Hi, {userName ? userName.split(' ')[0] : userEmail?.split('@')[0]}
          </div>
          <button onClick={checkUserAndFetchData} className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 px-4 py-2 rounded-lg hover:bg-rose-100 transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-2">Total Balance</p>
            <h2 className="text-3xl font-bold text-slate-900">₹{totalBalance.toLocaleString('en-IN')}</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-emerald-500" />
              <p className="text-sm font-medium text-emerald-600">Income</p>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">₹{totalIncome.toLocaleString('en-IN')}</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={18} className="text-rose-500" />
              <p className="text-sm font-medium text-rose-600">Expenses</p>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">₹{totalExpense.toLocaleString('en-IN')}</h2>
          </div>
        </div>

        {/* Search & Filter Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-slate-900">Recent Transactions</h2>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            {/* HIDDEN FILE INPUT */}
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef}
              onChange={handleImportCSV} 
              className="hidden" 
              id="csv-upload" 
            />
            
            {/* IMPORT BUTTON */}
            <label 
              htmlFor="csv-upload"
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Upload size={16} /> Import
            </label>

            {/* EXPORT BUTTON */}
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download size={16} /> Export
            </button>
            
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Source</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          tx.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-700">{tx.category}</td>
                      <td className="p-4 text-slate-500">{tx.entity_source || '-'}</td>
                      <td className={`p-4 text-right font-bold ${
                        tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'Income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleEditAmount(tx.id, tx.amount)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit Amount"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete"
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
