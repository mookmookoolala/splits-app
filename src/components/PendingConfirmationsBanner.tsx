import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, X, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatAmount } from '../utils/currency';
import { Card } from './ui/utils';

interface BannerProps {
  groupId?: string;
}

export function PendingConfirmationsBanner({ groupId }: BannerProps) {
  const { currentUser, expenses, users, friends, confirmSettlement, rejectSettlement } = useApp();
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!currentUser) return null;

  // Find incoming pending payments for the logged-in user
  const pendingPayments = expenses.filter(e => {
    if (e.kind !== 'payment' || e.status !== 'pending') return false;
    if (groupId && e.groupId !== groupId) return false;

    // Recipient is in splitWith array or target user
    const recipientId = e.splitWith?.[0];
    return recipientId === currentUser.id;
  });

  if (pendingPayments.length === 0) return null;

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
    <div className="space-y-3">
      <AnimatePresence>
        {pendingPayments.map(payment => {
          const payerName = getUserName(payment.paidBy);
          const isProcessing = processingId === payment.id;

          return (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="p-4 bg-gradient-to-r from-[#fdfbf7] to-[#f7f1e7] border border-[#e2d5c3] shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9.5 h-9.5 rounded-xl bg-[#ebdccb] text-[#73431f] flex items-center justify-center shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#865128] uppercase tracking-wider block flex items-center gap-1">
                        <ShieldAlert size={12} className="text-[#865128]" /> Pending Payment Confirmation
                      </span>
                      <p className="text-sm font-bold text-gray-900 leading-snug">
                        {payerName} recorded a payment to you
                      </p>
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
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
