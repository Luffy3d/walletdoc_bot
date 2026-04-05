'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Wallet, TrendingUp, TrendingDown, Search, Filter, RefreshCw, LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Initialize Supabase (Client-side)
const supabase = createClient();

interface Transaction {
  id: string;
  created_at: string;
  type: 'Income' | 'Expense';
  amount: number;
  category: string;
  entity_source: string;
  raw_text: string;
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const [telegramId, setTelegramId] = useState('');
  const [linking, setLinking] = useState(false);
  const [isLinked, setIsLinked] = useState(false);

  const handleLinkTelegram = async () => {
    if (!telegramId || !user) return;
    setLinking(true);
    try {
      const { error } = await supabase
        .from('telegram_devices')
        .insert([{ user_id: user.id, telegram_chat_id: parseInt(telegramId) }]);
      if (error) throw error;
      setIsLinked(true);
      setTelegramId('');
    } catch (err: any) {
      alert('Error linking Telegram: ' + err.message);
    } finally {
      setLinking(false);
    }
  };

  const fetchTransactions = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId) // Filter by logged-in user
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkTelegramLink = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('telegram_devices')
      .select('telegram_chat_id')
      .eq('user_id', userId)
      .single();
    if (data) setIsLinked(true);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      return user;
    };

    fetchUser().then((user) => {
      if (user) {
        fetchTransactions(user.id);
        checkTelegramLink(user.id);
      }
    });
  }, [router, fetchTransactions, checkTelegramLink]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const totalIncome = transactions
    .filter(t => t.type === 'Income')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'Expense')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const balance = totalIncome - totalExpense;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Wallet size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">docwallet</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 sm:flex">
              <User size={14} />
              {user.email}
            </div>
            <button 
              onClick={() => fetchTransactions(user.id)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 active:scale-95"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100 active:scale-95"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Telegram Link Section */}
        {!isLinked && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-indigo-900">Link your Telegram account</h3>
                <p className="text-sm text-indigo-700">Send a message to the bot to get your Chat ID, then enter it here.</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  placeholder="Telegram Chat ID" 
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button 
                  onClick={handleLinkTelegram}
                  disabled={linking || !telegramId}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
                >
                  {linking ? 'Linking...' : 'Link Account'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-3">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">Total Balance</p>
            <h2 className={`mt-2 text-3xl font-bold ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              ₹{balance.toLocaleString('en-IN')}
            </h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-emerald-600">
              <TrendingUp size={16} />
              <p className="text-sm font-medium">Income</p>
            </div>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              ₹{totalIncome.toLocaleString('en-IN')}
            </h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-rose-600">
              <TrendingDown size={16} />
              <p className="text-sm font-medium">Expenses</p>
            </div>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              ₹{totalExpense.toLocaleString('en-IN')}
            </h2>
          </motion.div>
        </div>

        {/* Transactions Table */}
        <div className="mt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search transactions..." 
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                <Filter size={16} />
                Filter
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-slate-100"></div></td>
                        <td className="px-6 py-4"><div className="h-4 w-16 rounded bg-slate-100"></div></td>
                        <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-slate-100"></div></td>
                        <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-slate-100"></div></td>
                        <td className="px-6 py-4"><div className="ml-auto h-4 w-16 rounded bg-slate-100"></div></td>
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No transactions found. Start logging via Telegram!
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="transition-colors hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                          {new Date(tx.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tx.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{tx.category}</td>
                        <td className="px-6 py-4 text-slate-600">{tx.entity_source}</td>
                        <td className={`px-6 py-4 text-right font-bold ${
                          tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {tx.type === 'Income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
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

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} docwallet. Built for medical professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}
