import { Crown, Users, Receipt, PieChart } from 'lucide-react';
import type { Group, Expense } from '../types';
import { formatAmount } from '../utils/currency';
import { Card } from './ui/utils';
import { Badge } from './ui/Badge';

interface GroupStatsCardProps {
  group: Group;
  expenses: Expense[];
  currentUserId?: string;
}

export function GroupStatsCard({ group, expenses, currentUserId }: GroupStatsCardProps) {
  // Exclude settlement payments
  const validExpenses = expenses.filter(e => e.kind !== 'payment' && e.amount > 0);
  const totalAmount = validExpenses.reduce((sum, e) => sum + e.amount, 0);
  const memberCount = group.members.length || 1;
  const avgPerMember = totalAmount / memberCount;

  // Calculate total paid per member (Out-of-Pocket Spending)
  const memberSpendMap: Record<string, number> = {};
  validExpenses.forEach(e => {
    memberSpendMap[e.paidBy] = (memberSpendMap[e.paidBy] || 0) + e.amount;
  });

  // Sort spenders from highest to lowest
  const memberSpends = group.members.map(m => ({
    user: m,
    totalPaid: memberSpendMap[m.id] || 0,
    percentage: totalAmount > 0 ? Math.round(((memberSpendMap[m.id] || 0) / totalAmount) * 100) : 0,
  })).sort((a, b) => b.totalPaid - a.totalPaid);

  const topSpender = memberSpends[0];

  // Find Highest Single Expense
  const highestExpense = validExpenses.length > 0
    ? validExpenses.reduce((prev, current) => (prev.amount > current.amount) ? prev : current)
    : null;

  const highestPayer = highestExpense
    ? group.members.find(m => m.id === highestExpense.paidBy)
    : null;

  if (validExpenses.length === 0) {
    return null;
  }

  const currency = group.currency || '$';

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <PieChart size={18} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">
              Group Spending & Contributions
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Out-of-pocket breakdown & key insights
            </p>
          </div>
        </div>
        <Badge variant="default" className="font-bold text-xs">
          Total: {formatAmount(totalAmount, currency)}
        </Badge>
      </div>

      {/* Out-of-Pocket Breakdown Bar Container */}
      <div className="space-y-3.5 bg-gray-50/80 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <span>Member Out-of-Pocket</span>
          <span>{validExpenses.length} {validExpenses.length === 1 ? 'Expense' : 'Expenses'}</span>
        </div>

        {/* Multi-color stacked progress bar */}
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex gap-0.5">
          {memberSpends.map(({ user, percentage }, idx) => {
            const colors = [
              'bg-blue-600 dark:bg-blue-500',
              'bg-emerald-500 dark:bg-emerald-400',
              'bg-purple-600 dark:bg-purple-500',
              'bg-amber-500 dark:bg-amber-400',
              'bg-rose-500 dark:bg-rose-400'
            ];
            const colorClass = colors[idx % colors.length];
            if (percentage <= 0) return null;

            return (
              <div
                key={user.id}
                style={{ width: `${percentage}%` }}
                className={`${colorClass} h-full transition-all`}
                title={`${user.name}: ${percentage}%`}
              />
            );
          })}
        </div>

        {/* Member out-of-pocket list */}
        <div className="space-y-2 pt-1">
          {memberSpends.map(({ user, totalPaid, percentage }, idx) => {
            const isMe = user.id === currentUserId;
            const dotColors = [
              'bg-blue-600 dark:bg-blue-500',
              'bg-emerald-500 dark:bg-emerald-400',
              'bg-purple-600 dark:bg-purple-500',
              'bg-amber-500 dark:bg-amber-400',
              'bg-rose-500 dark:bg-rose-400'
            ];
            const dotColor = dotColors[idx % dotColors.length];

            return (
              <div key={user.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {isMe ? 'You' : user.name}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">({percentage}%)</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-gray-100 shrink-0">
                  {formatAmount(totalPaid, currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Insights Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Top Spender */}
        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Crown size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Top Spender</span>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">
              {topSpender ? (topSpender.user.id === currentUserId ? 'You' : topSpender.user.name) : 'N/A'}
            </p>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {topSpender ? formatAmount(topSpender.totalPaid, currency) : '$0'}
            </p>
          </div>
        </div>

        {/* Highest Single Expense */}
        <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Receipt size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">Largest Purchase</span>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">
              {highestExpense ? highestExpense.description : 'N/A'}
            </p>
            <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
              {highestExpense ? formatAmount(highestExpense.amount, currency) : '$0'}
              {highestPayer && <span className="text-gray-400 dark:text-gray-500 font-normal text-[10px] ml-1">({highestPayer.id === currentUserId ? 'You' : highestPayer.name.split(' ')[0]})</span>}
            </p>
          </div>
        </div>

        {/* Average Spent Per Member */}
        <div className="bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider block">Avg / Member</span>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">
              {formatAmount(avgPerMember, currency)}
            </p>
            <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">
              Across {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
