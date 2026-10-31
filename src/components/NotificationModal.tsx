import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, ShieldAlert, Receipt, Users, CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatAmount } from '../utils/currency';
import { Card } from './ui/utils';

export function NotificationButton() {
  const { currentUser, expenses, activities, users, friends, confirmSettlement, rejectSettlement } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!currentUser) return null;

  // Filter pending payment confirmations where logged-in user is recipient
  const pendingPayments = expenses.filter(e => {
    if (e.kind !== 'payment' || e.status !== 'pending') return false;
    const recipientId = e.splitWith?.[0];
    return recipientId === currentUser.id;
  });

  const badgeCount = pendingPayments.length;

  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    if (user) return user.name;
    const friend = friends.find(f => f.id === id);
    if (friend) return friend.name;
    return 'Someone';
  };

  const handleConfirm = async (id: string) => {
    setProcessingId(id);
    try {
      await confirmSettlement(id);
    } catch (err) {
      console.error('Failed to confirm settlement:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectSettlement(id);
    } catch (err) {
      console.error('Failed to reject settlement:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      {/* Notification Bell Button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(true)}
        className="relative w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className={badgeCount > 0 ? 'text-amber-500 animate-pulse' : 'text-gray-600'} />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </motion.button>

      {/* Notification Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 md:bg-black/10 backdrop-blur-xs z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Drawer (Mobile bottom sheet, Desktop top-right popover) */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 max-w-md mx-auto bg-white rounded-t-3xl md:rounded-2xl md:fixed md:top-20 md:right-8 lg:right-28 md:bottom-auto md:left-auto md:w-96 md:max-w-none md:border md:border-gray-200/80 shadow-2xl z-50 max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Drawer Handle (Mobile only) */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0 md:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Bell size={20} className="text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                  {badgeCount > 0 && (
                    <span className="px-2 py-0.5 bg-[#ebdccb] text-[#73431f] font-bold text-xs rounded-full">
                      {badgeCount} Action Required
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Pending Payment Confirmations Section */}
                {pendingPayments.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-xs font-bold text-[#865128] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-[#865128]" /> Pending Payment Confirmations
                    </h3>

                    <div className="space-y-3">
                      {pendingPayments.map(payment => {
                        const payerName = getUserName(payment.paidBy);
                        const isProcessing = processingId === payment.id;

                        return (
                          <Card key={payment.id} className="p-4 bg-gradient-to-r from-[#fdfbf7] to-[#f7f1e7] border border-[#e2d5c3] shadow-sm space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-[#ebdccb] text-[#73431f] flex items-center justify-center shrink-0">
                                  <ShieldAlert size={18} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900 leading-snug">
                                    {payerName} recorded a payment to you
                                  </p>
                                  <span className="text-xs text-[#865128] font-medium">
                                    Needs your confirmation to update balance
                                  </span>
                                </div>
                              </div>

                              <span className="text-base font-extrabold text-blue-700 shrink-0">
                                {formatAmount(payment.amount)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-[#e8d9c8]">
                              <button
                                onClick={() => handleConfirm(payment.id)}
                                disabled={isProcessing}
                                className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <Check size={15} />
                                {isProcessing ? 'Confirming...' : 'Accept Payment'}
                              </button>

                              <button
                                onClick={() => handleReject(payment.id)}
                                disabled={isProcessing}
                                className="py-2.5 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-stone-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                <X size={15} />
                                Reject
                              </button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 2. Recent Activities Section */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Activity</h3>
                    <Link
                      to="/activity"
                      onClick={() => setIsOpen(false)}
                      className="text-xs text-blue-600 font-semibold flex items-center gap-0.5 hover:underline"
                    >
                      View All <ChevronRight size={14} />
                    </Link>
                  </div>

                  {activities.length === 0 && pendingPayments.length === 0 ? (
                    <Card className="p-6 text-center text-gray-400 bg-gray-50 border border-dashed border-gray-200">
                      <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50 text-blue-600" />
                      <p className="text-sm font-semibold text-gray-700">All caught up!</p>
                      <p className="text-xs text-gray-400 mt-0.5">No new notifications or pending actions.</p>
                    </Card>
                  ) : (
                    <div className="space-y-2.5">
                      {activities.slice(0, 5).map(act => {
                        let Icon = Receipt;
                        let bgClass = 'bg-gray-100 text-gray-600';
                        if (act.type === 'payment') {
                          Icon = CheckCircle2;
                          bgClass = 'bg-blue-100 text-blue-600';
                        } else if (act.type === 'group_created') {
                          Icon = Users;
                          bgClass = 'bg-[#ebdccb] text-[#73431f]';
                        }

                        return (
                          <div key={act.id} className="p-3 bg-gray-50 rounded-xl flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center shrink-0`}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                                {act.description}
                              </p>
                              <span className="text-[10px] text-gray-400">{act.date}</span>
                            </div>
                            {act.amount && (
                              <span className="text-xs font-bold text-gray-900 shrink-0">
                                ${act.amount.toFixed(2)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
