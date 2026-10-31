import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, X } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={!isLoading ? onClose : undefined}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-100 dark:border-gray-800 z-10"
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  variant === 'destructive'
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                }`}
              >
                {variant === 'destructive' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {message}
                </p>
              </div>

              {!isLoading && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button
                variant={variant}
                size="md"
                onClick={onConfirm}
                isLoading={isLoading}
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
