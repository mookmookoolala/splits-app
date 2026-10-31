import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30';

    const variants = {
      primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-[0.98]',
      secondary: 'bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 active:scale-[0.98]',
      destructive: 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/40 active:scale-[0.98]',
      outline: 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300 active:scale-[0.98]',
      ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 active:scale-[0.98]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
      md: 'px-4 py-2.5 text-sm rounded-2xl gap-2',
      lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5 font-semibold',
      icon: 'p-2 rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
