import type { HTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-3xl shadow-sm p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Avatar({ src, alt, className, fallback }: { src?: string, alt: string, className?: string, fallback: string }) {
  return (
    <div className={cn("relative inline-block rounded-full overflow-hidden bg-gray-200", className)}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium">
          {fallback}
        </div>
      )}
    </div>
  );
}
