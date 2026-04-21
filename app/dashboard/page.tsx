'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Wallet, TrendingUp, TrendingDown, Search, RefreshCw, 
  LogOut, Trash2, Edit2, Loader2, Download, Upload, MessageCircle, X, CheckCircle2, Unlink
} from 'lucide-react'
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

// 1. STRICT TYPESCRIPT INTERFACE
export interface Transaction {
  id: string;
  user_id: string;
  type: 'Income' | 'Expense';
  amount: number;
  category: string;
  entity_source: string | null;
  created_at: string;
  raw_text?: string;
}

export default function DashboardPage() {
  // --- STATES ---
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Telegram States
  const [isTelegramLinked, setIsTelegramLinked] = useState(false)
  const [telegramInput, setTelegramInput] = useState('')
  const [linkedChatId, setLinkedChatId] = useState<string | null>(null)
  const [linkingDevice, setLinkingDevice] = useState(false)

  // Modal States (The New UX Upgrade)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Transaction>>({})
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUserAndFetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- DATA FETCHING ---
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
    setUserName((user.user_metadata?.full_name as string) || null)

    // Check Telegram Link
    const { data: deviceData } = await supabase
      .from('telegram_devices')
      .select('telegram_chat_id')
      .eq('user_id', user.id)
      .single()

    if (deviceData) {
      setIsTelegramLinked(true)
      setLinkedChatId(deviceData.telegram_chat_id)
    } else {
      setIsTelegramLinked(false)
      setLinkedChatId(null)
    }

    // Fetch Transactions (Limited to 1000 for safety, orders by newest)
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (data) setTransactions(data as Transaction[])
    setLoading(false)
  }

  // --- TELEGRAM LOGIC ---
  const handleLinkTelegram = async () => {
    if (!telegramInput.trim() || !userId) return
    setLinkingDevice(true)
    
    const { error } = await supabase.from('telegram_devices').insert([
      { user_id: userId, telegram_chat_id: telegramInput.trim() }
    ])

    if (error) {
      alert("Error linking account: " + error.message)
    } else {
      setIsTelegramLinked(true)
      setLinkedChatId(telegramInput.trim())
      setTelegramInput('')
    }
    setLinkingDevice(false)
  }

  const handleUnlinkTelegram = async () => {
    if (!userId) return;
    const confirmUnlink = window.confirm("Are you sure you want to unlink your Telegram bot? You won't be able to log transactions via chat until you link it again.");
    if (!confirmUnlink) return;

    setLinkingDevice(true);
    await supabase.from('telegram_devices').delete().eq('user_id', userId);
    setIsTelegramLinked(false);
    setLinkedChatId(null);
    setLinkingDevice(false);
  }

  // --- DELETE MODAL LOGIC ---
  const openDeleteModal = (id: string) => {
    setDeletingTxId(id)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingTxId) return

    const { error } = await supabase.from("transactions").delete().eq("id", deletingTxId)
    
    if (!error) {
      setTransactions(transactions.filter((tx) => tx.id !== deletingTxId))
    }
    setIsDeleteModalOpen(false)
    setDeletingTxId(null)
  }

  // --- EDIT MODAL LOGIC ---
  const openEditModal = (tx: Transaction) => {
    setEditForm(tx)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.id) return

    const { error } = await supabase
      .from("transactions")
      .update({ 
        amount: editForm.amount,
        type: editForm.type,
        category: editForm.category,
        entity_source: editForm.entity_source,
        created_at: editForm.created_at
      })
      .eq("id", editForm.id)

    if (!error) {
      // Update the local state instantly without a full database reload
      setTransactions(transactions.map(tx => 
        tx.id === editForm.id ? { ...tx, ...editForm } as Transaction : tx
      ))
      setIsEditModalOpen(false)
    } else {
      alert("Error updating transaction: " + error.message)
    }
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

      const newTransactions: any[] = []
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

  const expensesByCategory = transactions
    .filter(t => t.type === 'Expense')
    .reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});
  
  const pieChartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  })).sort((a, b) => b.value - a.value);

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
    <main className="min-h-screen bg-slate-50 font-sans pb-10 relative">
      
      {/* 🔴 DELETE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Transaction?</h3>
            <p className="text-sm text-slate-500 mb-6">This action cannot be undone. Are you sure you want to permanently delete this record?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔵 EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Edit Transaction</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                  <select 
                    value={editForm.type} 
                    onChange={(e) => setEditForm({...editForm, type: e.target.value as 'Income' | 'Expense'})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white text-sm font-medium"
                  >
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount (₹)</label>
                  <input 
                    type="number" 
                    value={editForm.amount}
                    onChange={(e) => setEditForm({...editForm, amount: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                <input 
                  type="text" 
                  value={editForm.category}
                  onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Source / Merchant (Optional)</label>
                <input 
                  type="text" 
                  value={editForm.entity_source || ''}
                  onChange={(e) => setEditForm({...editForm, entity_source: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                <input 
                  type="date" 
                  value={editForm.created_at ? new Date(editForm.created_at).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    // Update date while trying to preserve time safely
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) setEditForm({...editForm, created_at: newDate.toISOString()})
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-sm hover:scale-105 transition-transform cursor-pointer">
            <Wallet size={24} />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">docwallet</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100 px-4 py-2 rounded-full">
            <span>👋</span> Hi, {userName ? userName.split(' ')[0] : userEmail?.split('@')[0]}
          </div>
          <button onClick={checkUserAndFetchData} className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw size={16} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-4 py-2 rounded-xl hover:bg-rose-100 transition-colors">
            <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* TELEGRAM LINK STATUS BAR */}
        {isTelegramLinked ? (
          <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900">Telegram Bot Connected</h3>
                <p className="text-sm text-emerald-700 mt-0.5">Chat ID: <strong className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{linkedChatId}</strong></p>
              </div>
            </div>
            <button 
              onClick={handleUnlinkTelegram}
              disabled={linkingDevice}
              className="flex items-center gap-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-rose-100"
            >
              <Unlink size={16} /> Disconnect
            </button>
          </div>
        ) : (
          <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-100 p-3 rounded-full text-indigo-600 shrink-0">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-indigo-900">Link your Telegram Account</h3>
                <div className="text-sm text-indigo-700 mt-2 space-y-1">
                  <p>1. Open our bot here: <a href="https://t.me/walletdoc_bot" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2 hover:text-indigo-900 transition-colors">@walletdoc_bot ↗</a></p>
                  <p>2. Send the message <strong>/start</strong> to the bot.</p>
                  <p>3. It will reply with your Chat ID. Paste it below!</p>
                </div>
              </div>
            </div>
            <div className="flex w-full lg:w-auto gap-2 mt-4 lg:mt-0">
              <input
                type="text"
                placeholder="Enter Chat ID..."
                value={telegramInput}
                onChange={(e) => setTelegramInput(e.target.value)}
                className="w-full lg:w-48 px-4 py-2.5 text-sm font-medium border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <button
                onClick={handleLinkTelegram}
                disabled={linkingDevice}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors whitespace-nowrap shadow-sm disabled:opacity-50"
              >
                {linkingDevice ? 'Linking...' : 'Link Bot'}
              </button>
            </div>
          </div>
        )}

        {/* SUMMARY METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm font-bold tracking-wider uppercase text-slate-400 mb-2">Total Balance</p>
            <h2 className={`text-4xl font-black ${totalBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              ₹{totalBalance.toLocaleString('en-IN')}
            </h2>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-emerald-500" />
              <p className="text-sm font-bold tracking-wider uppercase text-emerald-600">Total Income</p>
            </div>
            <h2 className="text-4xl font-black text-slate-900">₹{totalIncome.toLocaleString('en-IN')}</h2>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={18} className="text-rose-500" />
              <p className="text-sm font-bold tracking-wider uppercase text-rose-600">Total Expenses</p>
            </div>
            <h2 className="text-4xl font-black text-slate-900">₹{totalExpense.toLocaleString('en-IN')}</h2>
          </div>
        </div>

        {/* CHARTS */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Expenses by Category</h3>
              <div className="h-[300px] w-full">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400 text-sm">No expense data yet.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Cash Flow Overview</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} formatter={(value: any) => `₹${value.toLocaleString()}`} />
                    <Legend iconType="circle" />
                    <Bar dataKey="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TABLE CONTROLS */}
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
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-medium"
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
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              <Upload size={16} /> <span className="hidden sm:inline">Import</span>
            </label>

            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download size={16} /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* TRANSACTION TABLE */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-5">Date</th>
                  <th className="p-5">Type</th>
                  <th className="p-5">Category</th>
                  <th className="p-5">Source</th>
                  <th className="p-5 text-right">Amount</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      No transactions found. Log one via Telegram to get started!
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-5 text-slate-600 font-medium">
                        {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${
                          tx.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-5 font-bold text-slate-800">{tx.category}</td>
                      <td className="p-5 text-slate-500 font-medium">{tx.entity_source || '-'}</td>
                      <td className={`p-5 text-right font-black tracking-tight ${
                        tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'Income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-5">
                        <div className="flex justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal(tx)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => openDeleteModal(tx.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
