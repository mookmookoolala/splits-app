import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowDownLeft, ArrowUpRight, ShoppingBag, Utensils, Car, Plane, Clapperboard, Home, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { formatAmount, formatBalance, round2 } from '../utils/currency';
import { CategoryBreakdownChart, SpendingTrendChart } from '../components/AnalyticsCharts';
import { PendingConfirmationsBanner } from '../components/PendingConfirmationsBanner';
import { NotificationButton } from '../components/NotificationModal';

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'food': return <Utensils size={16} className="text-amber-600" />;
    case 'transport': return <Car size={16} className="text-blue-600" />;
    case 'entertainment': return <Clapperboard size={16} className="text-purple-600" />;
    case 'trip': return <Plane size={16} className="text-sky-600" />;
    case 'utilities': return <Home size={16} className="text-emerald-600" />;
    default: return <ShoppingBag size={16} className="text-slate-600" />;
  }
};

const CategoryBg = (category: string) => {
  switch (category) {
    case 'food': return 'bg-amber-50';
    case 'transport': return 'bg-blue-50';
    case 'entertainment': return 'bg-purple-50';
    case 'trip': return 'bg-sky-50';
    case 'utilities': return 'bg-emerald-50';
    default: return 'bg-slate-100';
  }
};

export default function Dashboard() {
  const { friends, expenses, currentUser, addFriend, users } = useApp();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'activity' | 'analytics'>('activity');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');

  const getUserName = (id: string) => {
    if (id === currentUser?.id) return 'You';
    const user = users.find(u => u.id === id);
    return user ? user.name : 'Unknown User';
  };

  const handleAddFriend = async () => {
    if (newFriendName.trim()) {
      try {
        await addFriend(newFriendName.trim());
        toast.success('Friend added successfully!');
        setNewFriendName('');
        setShowAddFriend(false);
      } catch (error) {
        console.error('Failed to add friend:', error);
        toast.error('Failed to add friend. Please try again.');
      }
    }
  };

  const totalOwedToYou = round2(friends.reduce((acc, friend) => (friend.balance > 0.005 ? acc + friend.balance : acc), 0));
  const totalYouOwe = round2(friends.reduce((acc, friend) => (friend.balance < -0.005 ? acc + Math.abs(friend.balance) : acc), 0));
  const netBalance = round2(totalOwedToYou - totalYouOwe);
  const netBalanceInfo = formatBalance(netBalance);

  const nonPaymentExpenses = expenses.filter(e => e.kind !== 'payment');
  const activeFriends = friends.filter(friend => Math.abs(friend.balance) > 0.005);

  return (
    <div className="p-4 sm:p-6 md:p-8 pb-28 space-y-7 max-w-5xl mx-auto font-sans">
      {/* Sleek Minimal Header */}
      <header className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-3">
          <img
            src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=0f172a&color=ffffff&bold=true`}
            alt={currentUser?.name}
            className="w-10 h-10 rounded-full object-cover bg-slate-200 ring-2 ring-slate-100 shadow-xs"
          />
          <div>
            <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Welcome back</p>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
              {currentUser?.name || 'Dashboard'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationButton />
          <Link to="/add-expense">
            <motion.button
              whileTap={{ scale: 0.96 }}
              className="px-4 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-all"
            >
              <Plus size={16} />
              <span>Add Expense</span>
            </motion.button>
          </Link>
        </div>
      </header>

      {/* Clean Grounded Balance Summary */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Balance</span>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mt-1 tabular-nums">
                <span className={netBalanceInfo.isPositive ? 'text-emerald-400' : netBalanceInfo.isNegative ? 'text-rose-400' : 'text-white'}>
                  {netBalanceInfo.signedFormatted}
                </span>
              </div>
            </div>

            <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-medium text-slate-300">
              {netBalance > 0 ? 'You are owed' : netBalance < 0 ? 'You owe' : 'Settled up'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                <ArrowDownLeft size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400 font-medium truncate">You are owed</p>
                <p className="text-sm sm:text-base font-bold text-emerald-400 truncate tabular-nums">{formatAmount(totalOwedToYou)}</p>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400 shrink-0">
                <ArrowUpRight size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400 font-medium truncate">You owe</p>
                <p className="text-sm sm:text-base font-bold text-rose-400 truncate tabular-nums">{formatAmount(totalYouOwe)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Filter Pill */}
      <div className="flex justify-between items-center border-b border-slate-200/80 pb-3 pt-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'activity' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Balances & Activity
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'analytics' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Analytics
          </button>
        </div>

        <button
          onClick={() => setShowAddFriend(true)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <UserPlus size={14} /> + Friend
        </button>
      </div>

      {/* Pending Payment Confirmations */}
      <PendingConfirmationsBanner />

      {/* TAB 1: BALANCES & ACTIVITY (Clean Frameless Lists) */}
      {activeTab === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Active Balances (6 cols on lg) */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Balances</h2>

            {friends.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl">
                <p className="text-xs font-semibold text-slate-700 mb-1">No friends added yet</p>
                <p className="text-[11px] text-slate-400 mb-3">Add friends by name or User ID (UID) to split bills.</p>
                <button
                  onClick={() => setShowAddFriend(true)}
                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded-full text-xs font-semibold"
                >
                  Add Friend
                </button>
              </div>
            ) : activeFriends.length === 0 ? (
              <div className="p-4 bg-emerald-50/60 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-950">All settled up!</p>
                  <p className="text-[11px] text-emerald-700">No active debts with any friends right now.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
                {activeFriends.map(friend => {
                  const friendBalInfo = formatBalance(friend.balance);
                  return (
                    <div key={friend.id} className="p-3.5 flex items-center gap-3 hover:bg-slate-50/80 transition-colors">
                      <img
                        src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=0f172a&color=ffffff&bold=true`}
                        alt={friend.name}
                        className="w-10 h-10 rounded-full object-cover bg-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-xs text-slate-900 truncate">{friend.name}</h3>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{friend.id.slice(-5)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold ${
                          friendBalInfo.isPositive ? 'text-emerald-600' : friendBalInfo.isNegative ? 'text-rose-500' : 'text-slate-400'
                        }`}>
                          {friendBalInfo.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Expenses (6 cols on lg) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Expenses</h2>
              <Link to="/activity" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                View All
              </Link>
            </div>

            {nonPaymentExpenses.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                No recent expenses logged.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
                {nonPaymentExpenses.slice(0, 5).map(expense => (
                  <div key={expense.id} className="p-3.5 flex items-center gap-3 hover:bg-slate-50/80 transition-colors">
                    <div className={`w-9 h-9 rounded-xl ${CategoryBg(expense.category)} flex items-center justify-center shrink-0`}>
                      <CategoryIcon category={expense.category} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-xs text-slate-900 truncate">{expense.description}</h3>
                      <p className="text-[11px] text-slate-400">
                        {getUserName(expense.paidBy)} paid • {expense.date}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${expense.paidBy === currentUser?.id ? 'text-emerald-600' : 'text-slate-900'}`}>
                        ${expense.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SPENDING ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
              No spending data available yet. Start logging expenses to see category & monthly breakdowns!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CategoryBreakdownChart expenses={expenses} />
              <SpendingTrendChart expenses={expenses} />
            </div>
          )}
        </div>
      )}

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddFriend && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40"
              onClick={() => setShowAddFriend(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-x-4 top-[20%] max-w-sm mx-auto bg-white rounded-3xl p-6 shadow-2xl z-50 border border-slate-100"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-900">Add Friend</h3>
                <button onClick={() => setShowAddFriend(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Friend Name or User ID (UID)</label>
                  <input
                    type="text"
                    value={newFriendName}
                    onChange={e => setNewFriendName(e.target.value)}
                    placeholder="e.g. Lin or u_12345678"
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-xs font-mono"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed bg-amber-50/80 p-3 rounded-2xl border border-amber-100/80">
                    💡 <strong>Tip:</strong> Ask your friend to check their <strong>User ID (UID)</strong> under <em>Account ➔ Profile</em> and paste their exact <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200 text-amber-900">u_...</code> ID above!
                  </p>
                </div>
                <button
                  onClick={handleAddFriend}
                  disabled={!newFriendName.trim()}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-md disabled:opacity-50 transition-all"
                >
                  Add Friend
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
