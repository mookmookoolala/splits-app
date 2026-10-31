import type { HTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200/60 dark:border-gray-700/60',
    destructive: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
    outline: 'bg-transparent text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800',
    success: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors select-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
