import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Users, ArrowUpRight, ArrowDownLeft, Inbox } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Activity() {
  const { activities, users, friends, currentUser } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'payment' | 'expense' | 'group'>('all');

  const formatActivityDescription = (desc: string) => {
    return desc.replace(/(u_[a-f0-9-]+|f_[a-f0-9-]+)/gi, (match) => {
      if (match === currentUser?.id) return 'You';
      const user = users.find(u => u.id === match);
      if (user) return user.name;
      const friend = friends.find(f => f.id === match);
      if (friend) return friend.name;
      return 'Someone';
    });
  };

  const filteredActivities = activities.filter(activity => {
    if (filterType === 'all') return true;
    if (filterType === 'payment') return activity.type === 'payment';
    if (filterType === 'expense') return activity.type === 'expense_added' || !activity.type;
    if (filterType === 'group') return activity.type === 'group_created';
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 pb-28 space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Activity</h1>
          <p className="text-xs text-slate-500 mt-0.5">Recent expenses and payments</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-slate-100 p-1 rounded-xl text-xs w-fit">
          {(['all', 'payment', 'expense', 'group'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-all ${
                filterType === tab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab === 'all' ? 'All Activity' : tab === 'payment' ? 'Settlements' : tab === 'expense' ? 'Expenses' : 'Groups'}
            </button>
          ))}
        </div>
      </header>

      {/* Main Activity Timeline */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-xs text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No activity logged</h3>
              <p className="text-xs text-slate-400 mt-0.5">Transactions and events will appear here once you split bills or settle up.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {filteredActivities.map((activity, idx) => {
                const formattedDescription = formatActivityDescription(activity.description);
                const isPayment = activity.type === 'payment';
                const isGroupCreated = activity.type === 'group_created';
                const isIncomingPayment = isPayment && formattedDescription.toLowerCase().includes('paid you');

                return (
                  <motion.div
                    key={activity.id || idx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="p-4 sm:p-5 flex items-center gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Visual Icon Badge */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isPayment
                        ? isIncomingPayment
                          ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50'
                          : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200/50'
                        : isGroupCreated
                        ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/50'
                        : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/60'
                    }`}>
                      {isPayment ? (
                        isIncomingPayment ? <ArrowDownLeft size={20} strokeWidth={2.3} /> : <ArrowUpRight size={20} strokeWidth={2.3} />
                      ) : isGroupCreated ? (
                        <Users size={20} strokeWidth={2.2} />
                      ) : (
                        <Receipt size={20} strokeWidth={2.2} />
                      )}
                    </div>

                    {/* Description & Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                            {formattedDescription}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {activity.group && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                                {activity.group}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 font-medium">
                              {activity.date}
                            </span>
                          </div>
                        </div>

                        {/* Amount if present */}
                        {activity.amount !== undefined && (
                          <div className="text-right shrink-0">
                            <span className={`text-sm sm:text-base font-extrabold tracking-tight ${
                              isIncomingPayment
                                ? 'text-emerald-600'
                                : isPayment
                                ? 'text-rose-500'
                                : 'text-slate-900'
                            }`}>
                              {isIncomingPayment ? '+' : isPayment ? '-' : ''}${activity.amount.toFixed(2)}
                            </span>
                            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              {isPayment ? (isIncomingPayment ? 'Received' : 'Paid out') : 'Logged'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
