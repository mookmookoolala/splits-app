/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles, Smartphone, Share, PlusSquare, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_VERSION } from '../version';

export function PwaUpdateBanner() {
  const [dismissedUpdate, setDismissedUpdate] = useState(false);
  const [dismissedMobileBanner, setDismissedMobileBanner] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('pwa_mobile_banner_dismissed') === 'true'
  );
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [isStandalone, setIsStandalone] = useState(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as unknown as { standalone?: boolean }).standalone))
  );

  const [isMobile] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const showUpdateBanner = Boolean(needRefresh) && !dismissedUpdate;
  const showMobileInstallBanner = isMobile && !isStandalone && !dismissedMobileBanner && !showUpdateBanner;

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismissMobileBanner = () => {
    setDismissedMobileBanner(true);
    localStorage.setItem('pwa_mobile_banner_dismissed', 'true');
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsStandalone(true);
        setInstallPrompt(null);
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
      if (isIOS) {
        setShowIOSModal(true);
      } else {
        alert('To add Splits to your Home Screen, open your browser menu (⋮ or share) and tap "Add to Home screen".');
      }
    }
  };

  return (
    <>
      {/* 1. Top Version Update Banner */}
      <AnimatePresence>
        {showUpdateBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-4 right-4 max-w-md mx-auto z-50 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-4 shadow-2xl border border-white/20 backdrop-blur-md flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-amber-300 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  New Version Ready!
                  <span className="text-[10px] bg-white/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">v{APP_VERSION}</span>
                </p>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Update now for new features & performance fixes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleUpdate}
                className="px-3.5 py-2 bg-white text-emerald-700 font-bold text-xs rounded-xl shadow-md hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <RefreshCw size={14} className="animate-spin" />
                Update
              </button>
              <button
                onClick={() => setDismissedUpdate(true)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Bottom Mobile "Add to Home Screen" Notification Banner */}
      <AnimatePresence>
        {showMobileInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 bg-gray-900/95 text-white rounded-2xl p-4 shadow-2xl border border-gray-800 backdrop-blur-lg flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <Smartphone size={22} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm text-white flex items-center gap-1">
                  Add Splits to Home Screen 📲
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  Install for 1-tap app access & faster performance!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallApp}
                className="px-3.5 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all shrink-0"
              >
                Install
              </button>
              <button
                onClick={handleDismissMobileBanner}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. iOS Safari Step-by-Step Installation Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowIOSModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 bottom-8 max-w-sm mx-auto bg-white rounded-3xl p-6 shadow-2xl z-50 border border-gray-100 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Smartphone size={18} className="text-primary" />
                  Install Splits on iOS
                </h3>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Follow these 2 quick steps to add Splits to your iPhone or iPad Home Screen:
              </p>

              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      Tap Share <Share size={14} className="text-blue-500" />
                    </p>
                    <p className="text-[11px] text-gray-500">Tap the Share icon at the bottom of Safari</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      Add to Home Screen <PlusSquare size={14} className="text-emerald-500" />
                    </p>
                    <p className="text-[11px] text-gray-500">Scroll down & tap "Add to Home Screen"</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 text-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} />
                Got it!
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Global hook / helper to trigger install prompt from anywhere (e.g. Account page)
export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as unknown as { standalone?: boolean }).standalone))
  );

  useEffect(() => {
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
      if (isIOS) {
        alert('To install Splits on iOS:\n1. Tap the Share button in Safari 📤\n2. Select "Add to Home Screen" 📲');
      } else {
        alert('Splits is already installed or ready on your device Home Screen!');
      }
    }
  };

  return { isInstalled, canInstall: Boolean(installPrompt), triggerInstall };
}
