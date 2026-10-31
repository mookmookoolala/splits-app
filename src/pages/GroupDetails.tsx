import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Receipt, UserPlus, X, Check, Copy, Share, Trash2, Pencil, ArrowRight, Sparkles, CheckCircle2, Crown, FileText, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/utils';
import { useApp } from '../context/AppContext';
import { formatAmount, formatBalance } from '../utils/currency';
import { GroupStatsCard } from '../components/GroupStatsCard';
import { CategoryBreakdownChart, SpendingTrendChart } from '../components/AnalyticsCharts';
import { PendingConfirmationsBanner } from '../components/PendingConfirmationsBanner';
import { useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export default function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, addMembersToGroup, addVirtualMemberToGroup, friends, settleUp, removeMemberFromGroup, makeGroupAdmin, removeGroupAdmin, groups, expenses } = useApp();
  const { toast } = useToast();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleToUser, setSettleToUser] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPayNow, setCopiedPayNow] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [filterPayer, setFilterPayer] = useState<string>('all');

  const group = id ? groups.find(entry => entry.id === id) : undefined;
  const groupExpenses = expenses.filter(expense => expense.groupId === id);

  const handleCopyTripSummary = () => {
    if (!group) return;
    const validExps = groupExpenses.filter(e => e.kind !== 'payment' && e.amount > 0);
    const totalSpent = validExps.reduce((sum, e) => sum + e.amount, 0);
    const curr = group.currency || '$';

    const memberSpendMap: Record<string, number> = {};
    validExps.forEach(e => {
      memberSpendMap[e.paidBy] = (memberSpendMap[e.paidBy] || 0) + e.amount;
    });

    let report = `✈️ ${group.name} Trip & Expense Summary\n`;
    report += `----------------------------------\n`;
    report += `Total Trip Cost: ${formatAmount(totalSpent, curr)}\n`;
    report += `----------------------------------\n`;
    report += `Out-of-Pocket Spending:\n`;
    group.members.forEach(m => {
      const paid = memberSpendMap[m.id] || 0;
      const name = m.id === currentUser?.id ? 'You' : m.name;
      report += `• ${name}: ${formatAmount(paid, curr)}\n`;
    });

    if (group.simplifiedDebts && group.simplifiedDebts.length > 0) {
      report += `\n💡 Settlement Breakdown:\n`;
      group.simplifiedDebts.forEach(debt => {
        const fromName = debt.from === currentUser?.id ? 'You' : debt.fromName;
        const toName = debt.to === currentUser?.id ? 'You' : debt.toName;
        report += `• ${fromName} ➔ ${toName}: ${formatAmount(debt.amount, curr)}\n`;
      });
    }

    report += `----------------------------------\n`;
    report += `Tracked via Splits (${window.location.origin})`;

    navigator.clipboard.writeText(report);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleCopyId = () => {
    if (!group?.id) return;
    const url = `${window.location.origin}/join/${group.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!group?.id) return;
    const url = `${window.location.origin}/join/${group.id}`;
    if (navigator.share) {
      navigator.share({
        title: `Join ${group.name} on Splits`,
        url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!group) {
    return (
      <div className="p-6 text-center pt-20">
        <p className="text-gray-500 mb-4">Group not found</p>
        <button onClick={() => navigate('/groups')} className="text-primary font-bold">
          Back to Groups
        </button>
      </div>
    );
  }

  const totalGroupExpenses = groupExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleAddMembers = async () => {
    if (selectedFriends.length > 0) {
      await addMembersToGroup(group.id, selectedFriends);
    }
    if (newMemberName.trim()) {
      await addVirtualMemberToGroup(group.id, newMemberName.trim());
    }
    setShowAddMember(false);
    setSelectedFriends([]);
    setNewMemberName('');
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
  };

  const handleConfirmRemoveMember = async () => {
    if (!group?.id || !memberToRemove) return;
    setIsRemovingMember(true);
    try {
      const error = await removeMemberFromGroup(group.id, memberToRemove.id);
      if (error) {
        toast.error(error);
      } else {
        toast.success(`${memberToRemove.name} removed from group`);
      }
    } catch {
      toast.error('Failed to remove member.');
    } finally {
      setIsRemovingMember(false);
      setMemberToRemove(null);
    }
  };

  const handleSettleUp = async () => {
    if (!currentUser || !settleToUser || !settleAmount) return;
    await settleUp(currentUser.id, settleToUser, parseFloat(settleAmount), group.id);
    setShowSettleUp(false);
    setSettleAmount('');
    setSettleToUser('');
  };

  const openQuickSettle = (toUserId: string, amount: number) => {
    setSettleToUser(toUserId);
    setSettleAmount(amount.toString());
    setShowSettleUp(true);
  };

  const toggleFriendSelection = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(entry => entry !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  const availableFriends = friends.filter(friend => !group.members.some(member => member.id === friend.id));
  const userBalanceInfo = formatBalance(group.balance, group.currency || '$');

  return (
    <div className="min-h-screen bg-slate-50/70 pb-28 relative font-sans">
      <header className="bg-white/90 backdrop-blur-md px-6 pt-5 pb-5 border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/groups')}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 flex flex-col min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">{group.name}</h1>
            <button onClick={handleCopyId} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-900 transition-colors text-left w-fit">
              <span className="font-mono">ID: {group.id}</span>
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="flex gap-1.5 items-center">
            <button
              onClick={handleCopyTripSummary}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl relative group transition-colors"
              title="Copy Trip Summary Report for WhatsApp/Telegram"
            >
              {copiedSummary ? <Check size={18} className="text-emerald-500" /> : <FileText size={18} />}
              {copiedSummary && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-slate-900 text-white px-2.5 py-1 rounded-xl shadow-lg whitespace-nowrap z-30 font-bold">
                  Report Copied!
                </span>
              )}
            </button>
            <button onClick={handleShare} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl relative group transition-colors" title="Share Invite Link">
              {copiedLink ? <Check size={18} className="text-emerald-500" /> : <Share size={18} />}
              {copiedLink && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-slate-900 text-white px-2 py-1 rounded-xl shadow-lg whitespace-nowrap z-30 font-bold">
                  Link copied!
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSettleUp(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-all shadow-xs"
            >
              Settle Up
            </button>
            <button
              onClick={() => setShowAddMember(true)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              title="Add Member"
            >
              <UserPlus size={16} />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-end pt-1">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Total spent</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">{formatAmount(totalGroupExpenses, group.currency || '$')}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Your balance</p>
            <p className={`text-lg font-extrabold tabular-nums ${userBalanceInfo.isPositive ? 'text-emerald-600' : userBalanceInfo.isNegative ? 'text-rose-500' : 'text-slate-500'}`}>
              {userBalanceInfo.signedFormatted}
            </p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Pending Payment Confirmations */}
        <PendingConfirmationsBanner groupId={group.id} />

        {/* Members Overview with Balances */}
        <section>
          <div className="flex items-center justify-between mb-3 ml-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase">Members & Roles</h2>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
            {group.members.length > 0 ? (
              group.members.map(member => {
                const mb = group.memberBalances?.find(b => b.userId === member.id);
                const balInfo = mb ? formatBalance(mb.balance, group.currency || '$') : null;
                const isAdmin = (group.adminIds && group.adminIds.includes(member.id)) || (group.createdBy ? group.createdBy === member.id : false);
                const isUserGroupAdmin = Boolean(
                  currentUser && (
                    (group.adminIds && group.adminIds.includes(currentUser.id)) ||
                    (group.createdBy ? group.createdBy === currentUser.id : true)
                  )
                );

                return (
                  <div key={member.id} className="flex flex-col items-center min-w-[95px] relative group bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                    <div className="relative mb-1">
                      <img
                        src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=2563eb&color=ffffff&bold=true`}
                        alt={member.name}
                        className="w-12 h-12 rounded-full bg-gray-200 object-cover"
                      />

                      {/* Admin Crown Badge */}
                      {isAdmin && (
                        <div
                          className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-sm"
                          title="Group Admin"
                        >
                          <Crown size={11} className="fill-amber-950" />
                        </div>
                      )}

                      {/* Remove Member Button for Admin */}
                      {isUserGroupAdmin && member.id !== currentUser?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-transform active:scale-95 z-10"
                          title={`Remove ${member.name} from group`}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-gray-900 text-center truncate w-full mb-0.5">
                      {member.id === currentUser?.id ? 'You' : member.name.split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-mono text-gray-400 mb-1">
                      #{member.id.slice(-5)}
                    </span>

                    {/* Admin Status Tag */}
                    {isAdmin ? (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 mb-1 flex items-center gap-0.5">
                        👑 Admin
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 mb-1">
                        Member
                      </span>
                    )}

                    {/* Admin Promotion / Demotion Action for Admin */}
                    {isUserGroupAdmin && member.id !== currentUser?.id && (
                      <button
                        onClick={async () => {
                          try {
                            if (isAdmin) {
                              await removeGroupAdmin(group.id, member.id);
                              toast.info(`Removed admin privileges from ${member.name}`);
                            } else {
                              await makeGroupAdmin(group.id, member.id);
                              toast.success(`${member.name} is now a group admin`);
                            }
                          } catch (err) {
                            console.error('Failed to update admin:', err);
                            toast.error(err instanceof Error ? err.message : 'Failed to update admin role.');
                          }
                        }}
                        className="text-[9px] font-bold text-primary hover:underline mt-0.5 transition-opacity"
                      >
                        {isAdmin ? 'Dismiss Admin' : '+ Make Admin'}
                      </button>
                    )}

                    {balInfo && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                        balInfo.isPositive ? 'bg-emerald-50 text-emerald-600' : balInfo.isNegative ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {balInfo.signedFormatted}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 italic pl-2">No members yet</p>
            )}
          </div>
        </section>

        {/* Group Stats Card */}
        <GroupStatsCard group={group} expenses={groupExpenses} currentUserId={currentUser?.id} />

        {/* Analytics Section */}
        {groupExpenses.length > 0 && (
          <section className="space-y-4">
            <CategoryBreakdownChart expenses={groupExpenses} currency={group.currency || '$'} />
            <SpendingTrendChart expenses={groupExpenses} currency={group.currency || '$'} />
          </section>
        )}

        {/* Simplified Debts ("Who owes whom") */}
        <section>
          <div className="flex items-center justify-between mb-3 ml-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              Simplified Debts
            </h2>
          </div>

          {!group.simplifiedDebts || group.simplifiedDebts.length === 0 ? (
            <Card className="p-4 bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-900">All settled up!</p>
                <p className="text-xs text-emerald-600">No outstanding debts remaining in this group.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {group.simplifiedDebts.map((debt, index) => {
                const isUserDebtor = debt.from === currentUser?.id;
                const isUserCreditor = debt.to === currentUser?.id;

                return (
                  <Card key={index} className={`p-4 flex items-center justify-between transition-all ${
                    isUserDebtor ? 'bg-amber-50/40 border-amber-200/60' : isUserCreditor ? 'bg-emerald-50/40 border-emerald-200/60' : 'bg-white'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <span className="font-semibold text-sm text-gray-900 truncate max-w-[90px]">
                        {isUserDebtor ? 'You' : debt.fromName}
                      </span>
                      <ArrowRight size={16} className="text-gray-400 shrink-0" />
                      <span className="font-semibold text-sm text-gray-900 truncate max-w-[90px]">
                        {isUserCreditor ? 'You' : debt.toName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-sm text-gray-900">
                        {formatAmount(debt.amount, group.currency || '$')}
                      </span>

                      {isUserDebtor && (
                        <button
                          onClick={() => openQuickSettle(debt.to, debt.amount)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Expenses List */}
        <section className="space-y-3">
          <div className="flex justify-between items-center ml-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-1.5">
              <Filter size={14} className="text-blue-600" />
              Expenses ({groupExpenses.length})
            </h2>

            {/* Quick Export Button */}
            <button
              onClick={handleCopyTripSummary}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <FileText size={14} /> Export Report
            </button>
          </div>

          {/* Filter Chips */}
          {groupExpenses.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-6 px-6">
              <button
                onClick={() => setFilterPayer('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                  filterPayer === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                All Payers
              </button>
              {group.members.map(member => (
                <button
                  key={member.id}
                  onClick={() => setFilterPayer(member.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                    filterPayer === member.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Paid by {member.id === currentUser?.id ? 'You' : member.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {groupExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No expenses yet</p>
              </div>
            ) : groupExpenses.filter(e => filterPayer === 'all' || e.paidBy === filterPayer).length === 0 ? (
              <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-xs">No expenses found matching filter</p>
              </div>
            ) : (
              groupExpenses
                .filter(e => filterPayer === 'all' || e.paidBy === filterPayer)
                .map(expense => (
                  <Card key={expense.id} className="p-4 flex gap-4 group relative">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                      <Receipt size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-900 truncate">{expense.description}</p>
                        <span className="font-bold text-gray-900 ml-2">{formatAmount(expense.amount, group.currency || '$')}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>{expense.paidBy === currentUser?.id ? 'You' : group.members.find(member => member.id === expense.paidBy)?.name || 'Unknown'} paid</span>
                        {expense.date && (
                          <>
                            <span>•</span>
                            <span>{expense.date}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <Link
                      to={`/edit-expense/${expense.id}`}
                      className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 hover:text-primary transition-all shadow-sm self-center"
                      title="Edit or Delete Expense"
                    >
                      <Pencil size={14} />
                    </Link>
                  </Card>
                ))
            )}
          </div>
        </section>
      </div>

      <Link to={`/add-expense?group=${group.id}`}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/30 z-20"
        >
          <Plus size={28} />
        </motion.button>
      </Link>

      <AnimatePresence>
        {showAddMember && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setShowAddMember(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-[10%] max-w-sm mx-auto bg-white rounded-2xl p-6 shadow-xl z-50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add Members</h3>
                <button onClick={() => setShowAddMember(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {availableFriends.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No friends available to add</p>
                ) : (
                  availableFriends.map(friend => (
                    <div
                      key={friend.id}
                      onClick={() => toggleFriendSelection(friend.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedFriends.includes(friend.id) ? 'bg-primary/5 border border-primary/20' : 'hover:bg-gray-50'
                      }`}
                    >
                      <img src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=random`} alt={friend.name} className="w-10 h-10 rounded-full bg-gray-200" />
                      <span className="flex-1 font-medium">{friend.name}</span>
                      {selectedFriends.includes(friend.id) && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Share Link Banner */}
              <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">Invite via Share Link</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/join/${group.id}`}
                    className="flex-1 bg-white text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 font-mono truncate"
                  />
                  <button
                    onClick={handleShare}
                    className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg shrink-0 hover:bg-primary-dark transition-colors flex items-center gap-1"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-700 mb-2">Or add new person</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Enter name"
                    className="flex-1 px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleAddMembers}
                  disabled={selectedFriends.length === 0 && !newMemberName.trim()}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  Add Members
                </button>
              </div>
            </motion.div>
          </>
        )}

        {showSettleUp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setShowSettleUp(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-[20%] max-w-sm mx-auto bg-white rounded-2xl p-6 shadow-xl z-50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Settle Up</h3>
                <button onClick={() => setShowSettleUp(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay to</label>
                  <select
                    value={settleToUser}
                    onChange={(e) => setSettleToUser(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select person</option>
                    {group.members
                      .filter(member => member.id !== currentUser?.id)
                      .map(member => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                  </select>
                </div>

                {(() => {
                  const targetMember = group.members.find(m => m.id === settleToUser);
                  if (!targetMember?.paynowHandle) return null;
                  return (
                    <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">PayNow / Payment Handle</span>
                        <span className="font-bold text-gray-900 text-sm">{targetMember.paynowHandle}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(targetMember.paynowHandle || '');
                          setCopiedPayNow(true);
                          setTimeout(() => setCopiedPayNow(false), 2000);
                        }}
                        className="px-3 py-1 bg-white text-blue-600 text-xs font-bold rounded-lg border border-blue-200 shadow-sm flex items-center gap-1 hover:bg-blue-50 transition-colors"
                      >
                        {copiedPayNow ? <Check size={14} /> : <Copy size={14} />}
                        {copiedPayNow ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/50 font-bold text-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSettleUp}
                  disabled={!settleToUser || !settleAmount}
                  className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:shadow-none"
                >
                  Pay ${parseFloat(settleAmount || '0').toFixed(2)}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemoveMember}
        title="Remove Member from Group?"
        message={`Are you sure you want to remove ${memberToRemove?.name || 'this member'} from ${group.name}? They will lose access to group expenses.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isRemovingMember}
      />
    </div>
  );
}
