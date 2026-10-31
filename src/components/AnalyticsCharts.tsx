import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Car, Clapperboard, Plane, Home, ShoppingBag, PieChart, TrendingUp } from 'lucide-react';
import type { Expense, ExpenseCategory } from '../types';
import { formatAmount } from '../utils/currency';
import { Card } from './ui/utils';
import { Badge } from './ui/Badge';

interface CategoryConfig {
  label: string;
  icon: typeof Utensils;
  color: string;
  bgColor: string;
  textColor: string;
}

const CATEGORY_MAP: Record<ExpenseCategory, CategoryConfig> = {
  food: { label: 'Food & Drink', icon: Utensils, color: '#10b981', bgColor: 'bg-emerald-50 dark:bg-emerald-950/40', textColor: 'text-emerald-600 dark:text-emerald-400' },
  transport: { label: 'Transportation', icon: Car, color: '#6366f1', bgColor: 'bg-indigo-50 dark:bg-indigo-950/40', textColor: 'text-indigo-600 dark:text-indigo-400' },
  entertainment: { label: 'Entertainment', icon: Clapperboard, color: '#8b5cf6', bgColor: 'bg-purple-50 dark:bg-purple-950/40', textColor: 'text-purple-600 dark:text-purple-400' },
  trip: { label: 'Trip & Travel', icon: Plane, color: '#f59e0b', bgColor: 'bg-amber-50 dark:bg-amber-950/40', textColor: 'text-amber-600 dark:text-amber-400' },
  utilities: { label: 'Utilities', icon: Home, color: '#f43f5e', bgColor: 'bg-rose-50 dark:bg-rose-950/40', textColor: 'text-rose-600 dark:text-rose-400' },
  other: { label: 'Other', icon: ShoppingBag, color: '#64748b', bgColor: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-600 dark:text-slate-400' },
};

interface ChartProps {
  expenses: Expense[];
  currency?: string;
}

export function CategoryBreakdownChart({ expenses, currency = '$' }: ChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<ExpenseCategory | null>(null);

  // Filter out payments if any, focus on expenses
  const validExpenses = expenses.filter(e => e.kind !== 'payment' && e.amount > 0);
  const totalAmount = validExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate totals per category
  const categoryTotals = validExpenses.reduce((acc, expense) => {
    const cat = expense.category || 'other';
    acc[cat] = (acc[cat] || 0) + expense.amount;
    return acc;
  }, {} as Record<ExpenseCategory, number>);

  // Build sorted list of categories present
  const categoryData = (Object.keys(CATEGORY_MAP) as ExpenseCategory[])
    .map(cat => ({
      category: cat,
      amount: categoryTotals[cat] || 0,
      percentage: totalAmount > 0 ? ((categoryTotals[cat] || 0) / totalAmount) * 100 : 0,
      config: CATEGORY_MAP[cat],
    }))
    .filter(item => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (totalAmount === 0 || categoryData.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
        <PieChart size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">No category spending data yet</p>
      </Card>
    );
  }

  // SVG Donut Calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const donutSlices = categoryData.map((item, index) => {
    const previousAngle = categoryData
      .slice(0, index)
      .reduce((sum, prev) => sum + prev.percentage, 0);

    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((previousAngle / 100) * circumference);

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeCategory = categoryData.find(item => item.category === hoveredCategory);

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-3xl w-full min-w-0 overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <PieChart size={18} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">
              Category Breakdown
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Spending distribution across categories
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="font-semibold">
          {categoryData.length} {categoryData.length === 1 ? 'category' : 'categories'}
        </Badge>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 w-full min-w-0">
        {/* SVG Donut Chart */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center mx-auto md:mx-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              className="stroke-gray-100 dark:stroke-gray-800"
              strokeWidth="10"
            />
            {/* Category slices */}
            {donutSlices.map(slice => (
              <motion.circle
                key={slice.category}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={slice.config.color}
                strokeWidth={hoveredCategory === slice.category ? 13 : 10}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: slice.strokeDasharray }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="cursor-pointer transition-all duration-200 hover:opacity-90 drop-shadow-sm"
                onMouseEnter={() => setHoveredCategory(slice.category)}
                onMouseLeave={() => setHoveredCategory(null)}
              />
            ))}
          </svg>

          {/* Donut Center Info */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-3 min-w-0">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate max-w-full">
              {activeCategory ? activeCategory.config.label : 'Total Spent'}
            </span>
            <span className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight truncate max-w-full">
              {formatAmount(activeCategory ? activeCategory.amount : totalAmount, currency)}
            </span>
            {activeCategory && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeCategory.percentage.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Category Legend & Progress Bars */}
        <div className="flex-1 w-full min-w-0 space-y-3">
          {categoryData.map(item => {
            const Icon = item.config.icon;
            const isHovered = hoveredCategory === item.category;

            return (
              <div
                key={item.category}
                onMouseEnter={() => setHoveredCategory(item.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`p-2.5 rounded-2xl transition-all cursor-pointer w-full border ${
                  isHovered
                    ? 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'
                    : 'bg-transparent border-transparent hover:bg-gray-50/60 dark:hover:bg-gray-800/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5 gap-2 min-w-0 w-full">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-xl shrink-0 ${item.config.bgColor} ${item.config.textColor}`}>
                      <Icon size={14} />
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{item.config.label}</span>
                  </div>
                  <div className="text-right shrink-0 whitespace-nowrap flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-gray-100">{formatAmount(item.amount, currency)}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.config.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export function SpendingTrendChart({ expenses, currency = '$' }: ChartProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const validExpenses = expenses.filter(e => e.kind !== 'payment' && e.amount > 0);

  if (validExpenses.length === 0) {
    return null;
  }

  // Date fallback helpers
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const getTodayMonth = () => getTodayISO().substring(0, 7);

  const getGroupKey = (rawDate: string): string => {
    if (!rawDate || rawDate === 'Just now') {
      return viewMode === 'monthly' ? getTodayMonth() : getTodayISO();
    }
    if (viewMode === 'monthly') {
      if (rawDate.length >= 7) return rawDate.substring(0, 7);
      return getTodayMonth();
    }
    if (rawDate.length >= 10 && rawDate.includes('-')) return rawDate.substring(0, 10);
    return rawDate;
  };

  // Aggregate by key
  const dateTotals = validExpenses.reduce((acc, expense) => {
    const key = getGroupKey(expense.date);
    acc[key] = (acc[key] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Sort keys chronologically
  const sortedKeys = Object.keys(dateTotals).sort((a, b) => {
    if (a.includes('-') && b.includes('-')) return a.localeCompare(b);
    const timeA = new Date(a).getTime();
    const timeB = new Date(b).getTime();
    if (isNaN(timeA) || isNaN(timeB)) return a.localeCompare(b);
    return timeA - timeB;
  });

  const displayLimit = viewMode === 'monthly' ? 6 : 7;
  const displayKeys = sortedKeys.slice(-displayLimit);
  const maxAmount = Math.max(...displayKeys.map(k => dateTotals[k]), 1);

  const formatDateLabel = (rawKey: string) => {
    if (!rawKey || rawKey === 'Just now' || rawKey === getTodayISO()) {
      return viewMode === 'monthly' ? 'This Mo' : 'Today';
    }

    if (viewMode === 'monthly') {
      if (/^\d{4}-\d{2}$/.test(rawKey)) {
        const [year, month] = rawKey.split('-').map(Number);
        const parsed = new Date(year, month - 1, 1);
        return parsed.toLocaleDateString('en-US', { month: 'short' });
      }
      return rawKey;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawKey)) {
      const [year, month, day] = rawKey.split('-').map(Number);
      const parsed = new Date(year, month - 1, day);
      return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const parsed = new Date(rawKey);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return rawKey;
  };

  const activeHoverKey = hoveredIndex !== null ? displayKeys[hoveredIndex] : null;

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-3xl w-full min-w-0">
      {/* Header with Segmented Pill Toggle */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">
              Spending Velocity
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {activeHoverKey
                ? `${formatDateLabel(activeHoverKey)}: ${formatAmount(dateTotals[activeHoverKey], currency)}`
                : 'Hover bars for details'}
            </p>
          </div>
        </div>
        
        {/* Toggle Segmented Pill */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 rounded-lg transition-all ${
              viewMode === 'daily'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 rounded-lg transition-all ${
              viewMode === 'monthly'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Chart Area with Gridlines */}
      <div className="relative h-48 pt-4 pb-2 px-1 w-full min-w-0">
        {/* Subtle Background Y-Axis Gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pt-4">
          <div className="w-full border-b border-gray-100 dark:border-gray-800/60" />
          <div className="w-full border-b border-gray-100 dark:border-gray-800/60" />
          <div className="w-full border-b border-gray-100 dark:border-gray-800/60" />
        </div>

        {/* Bars Container */}
        <div className="relative h-full flex items-end justify-between gap-3 z-10">
          {displayKeys.map((key, idx) => {
            const amount = dateTotals[key];
            const heightPercent = Math.max((amount / maxAmount) * 100, 8);
            const formattedDate = formatDateLabel(key);
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={key}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex-1 flex flex-col items-center justify-end h-full min-w-0 group cursor-pointer"
              >
                {/* Popover Tooltip on Hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute -top-7 z-20 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xl pointer-events-none whitespace-nowrap"
                    >
                      {formatAmount(amount, currency)}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bar Pill */}
                <div className="w-full max-w-[28px] h-full flex items-end">
                  <motion.div
                    className={`w-full rounded-t-xl transition-all duration-200 ${
                      isHovered
                        ? 'bg-gradient-to-t from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/20 scale-105'
                        : 'bg-gradient-to-t from-emerald-500/90 to-teal-400/90'
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                {/* Date/Month Label */}
                <span className={`text-[11px] font-semibold text-center mt-2.5 transition-colors whitespace-nowrap ${
                  isHovered ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {formattedDate}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
