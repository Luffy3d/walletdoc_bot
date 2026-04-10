'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Wallet, TrendingUp, TrendingDown, Search, RefreshCw, 
  LogOut, Trash2, Edit2, Loader2, Download, Upload, MessageCircle 
} from 'lucide-react'
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [isTelegramLinked, setIsTelegramLinked] = useState(true)
  const [telegramInput, setTelegramInput] = useState('')
  const [linkingDevice, setLinkingDevice] = useState(false)
  
  const fileInputRef = useRef<any>(null)
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

    const { data: deviceData } = await supabase
      .from('telegram_devices')
      .select('telegram_chat_id')
      .eq('user_id', user.id)
      .single()

    setIsTelegramLinked(!!deviceData)

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) setTransactions(data)
    setLoading(false)
  }

  const handleLinkTelegram = async () => {
    if (!telegramInput.trim() || !userId) return
    setLinkingDevice(true)
    
    const { error } = await supabase.from('telegram_devices').insert([
      { user_id: userId, telegram_chat_id: telegramInput.trim() }
    ])

    if (error) {
      alert("Error linking account: " + error.message)
    } else {
      alert("✅ Telegram account linked successfully!")
      setIsTelegramLinked(true)
      setTelegramInput('')
    }
    setLinkingDevice(false)
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this transaction?")
    if (!confirmDelete) return

    const { error } = await supabase.from("transactions").delete().eq("id", id)
    
    if (!error) {
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

    if (!error) checkUserAndFetchData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // --- CSV FUNCTIONS ---
  const handleExportCSV = () => {
    if (transactions.length === 0) return alert("No transactions to export!");
    const headers = ['Date', 'Type', 'Category', 'Source', 'Amount'];
    const csvRows = transactions.map(tx => `"${new Date(tx.created_at).toLocaleDateString('en-GB')}","${tx.type}","${tx.category}","${tx.entity_source || ''}","${tx.amount}"`);
    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `docwallet_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return
    if (fileInputRef.current) fileInputRef.current.value = ''

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      if (!text) return
      const lines = text.split('\n').filter(line => line.trim() !== '')
      if (lines.length < 2) return alert("Empty CSV.")

      const newTransactions = []
      const csvSplitRegex = new RegExp(',(?=(?:(?:[^"]*"){2})*[^"]*$)')

      for (const row of lines.slice(1)) {
        const cols = row.split(csvSplitRegex).map(col => col.replace(/^"|"$/g, '').trim())
        if (cols.length >= 5 && cols[4] !== '') {
          let createdAt = new Date().toISOString()
          const dateParts = cols[0].split('/')
          if (dateParts.length === 3) {
            const parsed = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
            if (!isNaN(parsed.getTime())) createdAt = parsed.toISOString()
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
        await supabase.from('transactions').insert(newTransactions)
        checkUserAndFetchData()
      }
    }
    reader.readAsText(file)
  }

  // --- DATA CALCULATIONS ---
  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalBalance = totalIncome - totalExpense

  const filteredTransactions = transactions.filter(tx => 
    tx.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.entity_source?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate Data for Pie Chart (Expenses by Category)
  const expensesByCategory = transactions
    .filter(t => t.type === 'Expense')
    .reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});
  
  const pieChartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  })).sort((a, b) => b.value - a.value); // Sort biggest expenses first

  // Calculate Data for Bar Chart (Income vs Expense)
  const barChartData = [
    { name: 'Summary', Income: totalIncome, Expense: totalExpense }
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-10">
      
      {/* HEADER */}
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
            <RefreshCw size={16} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 px-4 py-2 rounded-lg hover:bg-rose-100 transition-colors">
            <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* TELEGRAM LINKING CARD */}
        {!isTelegramLinked && (
          <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-100 p-3 rounded-full text-indigo-600 shrink-0">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-indigo-900">Link your Telegram Account</h3>
                <p className="text-sm text-indigo-700 mt-1">
                  Start tracking expenses naturally via chat. Open the docwallet Telegram bot, type <strong>/start</strong>, and paste your Chat ID here.
                </p>
              </div>
            </div>
            <div className="flex w-full lg:w-auto gap-2">
              <input
                type="text"
                placeholder="Enter Chat ID..."
                value={telegramInput}
                onChange={(e) => setTelegramInput(e.target.value)}
                className="w-full lg:w-48 px-4 py-2 text-sm border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <button
                onClick={handleLinkTelegram}
                disabled={linkingDevice}
                className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {linkingDevice ? 'Linking...' : 'Link Bot'}
              </button>
            </div>
          </div>
        )}

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-2">Total Balance</p>
            <h2 className="text-3xl font-bold text-slate-900">₹{totalBalance.toLocaleString('en-IN')}</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-emerald-500" />
              <p className="text-sm font-medium text-emerald-600">Total Income</p>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">₹{totalIncome.toLocaleString('en-IN')}</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={18} className="text-rose-500" />
              <p className="text-sm font-medium text-rose-600">Total Expenses</p>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">₹{totalExpense.toLocaleString('en-IN')}</h2>
          </div>
        </div>

        {/* VISUAL CHARTS SECTION */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Pie Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Expenses by Category</h3>
              <div className="h-[300px] w-full">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400 text-sm">No expense data yet.</div>
                )}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Cash Flow Overview</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS TABLE HEADER */}
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
            
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef}
              onChange={handleImportCSV} 
              className="hidden" 
              id="csv-upload" 
            />
            <label 
              htmlFor="csv-upload"
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Upload size={16} /> <span className="hidden sm:inline">Import</span>
            </label>

            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download size={16} /> <span className="hidden sm:inline">Export</span>
            </button>
            
          </div>
        </div>

        {/* TRANSACTIONS TABLE */}
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
                      No transactions found. Log one via Telegram to get started!
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
    </main>
  )
}
