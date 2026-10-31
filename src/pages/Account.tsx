import { useState, useRef } from 'react';
import { Bell, CreditCard, UserPlus, Settings, HelpCircle, Shield, ChevronRight, LogOut, X, Check, Copy, Key, Globe, Camera, Smartphone, RefreshCw, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/utils';
import { useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useApp } from '../context/AppContext';
import { usePwaInstall } from '../components/PwaUpdateBanner';
import { APP_VERSION, APP_BUILD_DATE } from '../version';

type ModalType = 'profile' | 'notifications' | 'payment' | 'invite' | 'settings' | 'help' | 'privacy' | null;

const CURRENCIES = [
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

const FAQS = [
  {
    q: 'How does debt simplification work?',
    a: 'Splits calculates the net balance of every group member and uses an intelligent algorithm to minimize the total number of transactions. For example, if Bob owes Charlie $20 and Charlie owes Alice $20, Splits simplifies it so Bob pays Alice $20 directly.',
  },
  {
    q: 'How do I invite friends to a group?',
    a: 'Open any group page and tap the Share button at the top right, or open the "Add Members" modal to copy the invite link to share on WhatsApp or Telegram.',
  },
  {
    q: 'How do I settle up a debt?',
    a: 'Tap the "Settle Up" button on any group or debt card. Enter the amount paid and select the recipient. If your friend has added a PayNow/UPI handle in their account, it will automatically be displayed for 1-click copying!',
  },
  {
    q: 'Can I add members who don\'t have an account?',
    a: 'Yes! You can add "Virtual Members" (placeholders) to any group. When they register later, they can claim their virtual profile to inherit all past expenses.',
  },
];



export default function Account() {
  const { currentUser, friends, groups, expenses, logout, updateProfile } = useApp();
  const { toast } = useToast();
  const { isInstalled, triggerInstall } = usePwaInstall();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);
  const [copiedPayNow, setCopiedPayNow] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Form states
  const [nameInput, setNameInput] = useState(currentUser?.name || '');
  const [avatarInput, setAvatarInput] = useState(currentUser?.avatar || '');
  const [paynowInput, setPaynowInput] = useState(currentUser?.paynowHandle || '');
  const [currencyInput, setCurrencyInput] = useState(currentUser?.preferredCurrency || 'S$');
  const [emailNotif, setEmailNotif] = useState(currentUser?.notificationEmail ?? true);
  const [pushNotif, setPushNotif] = useState(currentUser?.notificationPush ?? true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [saveToast, setSaveToast] = useState('');

  // Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarInput(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [prevUserId, setPrevUserId] = useState<string | null>(null);
  if (currentUser && currentUser.id !== prevUserId) {
    setPrevUserId(currentUser.id);
    setNameInput(currentUser.name);
    setAvatarInput(currentUser.avatar || '');
    setPaynowInput(currentUser.paynowHandle || '');
    setCurrencyInput(currentUser.preferredCurrency || 'S$');
    setEmailNotif(currentUser.notificationEmail ?? true);
    setPushNotif(currentUser.notificationPush ?? true);
  }

  const stats = [
    { label: 'Friends', value: friends.length },
    { label: 'Groups', value: groups.length },
    { label: 'Expenses', value: expenses.length },
  ];

  const handleSaveProfile = async () => {
    if (!nameInput.trim()) return;
    const finalAvatar = avatarInput.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameInput.trim())}&background=random`;
    await updateProfile({ name: nameInput.trim(), avatar: finalAvatar });
    setSaveToast('Profile updated successfully!');
    setTimeout(() => setSaveToast(''), 2500);
    setActiveModal(null);
  };

  const handleSavePayment = async () => {
    await updateProfile({ paynowHandle: paynowInput.trim() });
    setSaveToast('Payment handle updated successfully!');
    setTimeout(() => setSaveToast(''), 2500);
    setActiveModal(null);
  };

  const handleSaveSettings = async () => {
    await updateProfile({ preferredCurrency: currencyInput });
    setSaveToast('App preferences saved!');
    setTimeout(() => setSaveToast(''), 2500);
    setActiveModal(null);
  };

  const handleSaveNotifications = async () => {
    await updateProfile({ notificationEmail: emailNotif, notificationPush: pushNotif });
    setSaveToast('Notification preferences saved!');
    setTimeout(() => setSaveToast(''), 2500);
    setActiveModal(null);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (!currentPass || !newPass) {
      setPassError('All fields are required.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match.');
      return;
    }
    setSaveToast('Password updated successfully!');
    setTimeout(() => setSaveToast(''), 2500);
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setActiveModal(null);
  };

  const handleForceUpdate = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
    } catch (err) {
      console.error('Failed clearing cache:', err);
    }
    window.location.reload();
  };

  const handleCopyAppUrl = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopiedAppUrl(true);
    setTimeout(() => setCopiedAppUrl(false), 2000);
  };

  return (
    <div className="p-6 pb-24 space-y-6">
      <header className="pt-2 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Account & Settings</h1>
          <p className="text-xs text-slate-400 font-medium">Manage your profile, currency, and payment details</p>
        </div>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="text-rose-600 font-bold text-xs flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-full border border-rose-100 transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </header>

      {/* Save Confirmation Toast */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg text-center flex items-center justify-center gap-2"
          >
            <Check size={16} className="text-emerald-400" />
            {saveToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Card (Apple ID / Revolut Hero Style) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="relative group cursor-pointer" onClick={() => setActiveModal('profile')}>
            <img
              src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=0f172a&color=ffffff&bold=true`}
              alt={currentUser?.name}
              className="w-20 h-20 rounded-full object-cover bg-slate-100 ring-4 ring-slate-100 shadow-md"
            />
            <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{currentUser?.name}</h2>
              {currentUser?.id && (
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200/80">
                  #{currentUser.id.slice(-5)}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5 truncate">{currentUser?.email || 'No email provided'}</p>
            
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/80">
                <span className="text-[10px] font-mono font-semibold text-slate-500">ID: {currentUser?.id}</span>
                <button
                  onClick={() => {
                    if (currentUser?.id) {
                      navigator.clipboard.writeText(currentUser.id);
                      setCopiedUid(true);
                      setTimeout(() => setCopiedUid(false), 2000);
                    }
                  }}
                  className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1"
                  title="Copy User ID"
                >
                  {copiedUid ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copiedUid && <span className="text-[9px] font-bold text-emerald-600">Copied</span>}
                </button>
              </div>

              {currentUser?.paynowHandle ? (
                <div className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200/60">
                  <CreditCard size={12} />
                  <span>PayNow: {currentUser.paynowHandle}</span>
                </div>
              ) : (
                <button
                  onClick={() => setActiveModal('payment')}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  + Add PayNow Handle
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveModal('profile')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-full transition-colors shrink-0"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center">
            <p className="text-xl font-black text-slate-900 tracking-tight">{stat.value}</p>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Preferences */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Preferences</h3>
        <div className="bg-white rounded-3xl overflow-hidden divide-y divide-slate-100 border border-slate-200/80 shadow-xs">
          <button
            onClick={() => setActiveModal('notifications')}
            className="w-full flex items-center gap-3.5 p-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Bell size={18} strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-xs sm:text-sm">Notifications</p>
              <p className="text-[11px] text-slate-400">Push & email alerts</p>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>

          <button
            onClick={() => setActiveModal('payment')}
            className="w-full flex items-center gap-3.5 p-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard size={18} strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-xs sm:text-sm">Payment Methods</p>
              <p className="text-[11px] text-slate-400">
                {currentUser?.paynowHandle ? `PayNow: ${currentUser.paynowHandle}` : 'Set PayNow / UPI handle'}
              </p>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>

          <button
            onClick={() => setActiveModal('invite')}
            className="w-full flex items-center gap-3.5 p-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserPlus size={18} strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-xs sm:text-sm">Invite Friends</p>
              <p className="text-[11px] text-slate-400">Share Splits link & QR code</p>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        </div>
      </section>

      {/* App & Version Updates */}
      <section>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 ml-2">App & Updates</h3>
        <Card className="p-0 overflow-hidden divide-y divide-gray-100 border border-gray-100 shadow-sm bg-white">
          <button
            onClick={triggerInstall}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Smartphone size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 text-sm">Add to Home Screen</p>
                {isInstalled && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Installed</span>
                )}
              </div>
              <p className="text-xs text-gray-500">Install Splits app on iOS & Android Home Screen</p>
            </div>
            <ChevronRight size={20} className="text-gray-300" />
          </button>

          <button
            onClick={handleForceUpdate}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <RefreshCw size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 text-sm">Check for Version Updates</p>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">v{APP_VERSION}</span>
              </div>
              <p className="text-xs text-gray-500">Clear cache & force update to latest release</p>
            </div>
            <ChevronRight size={20} className="text-gray-300" />
          </button>
        </Card>
      </section>

      {/* Support & Settings */}
      <section>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 ml-2">Support & Settings</h3>
        <Card className="p-0 overflow-hidden divide-y divide-gray-100 border border-gray-100 shadow-sm bg-white">
          <button
            onClick={() => setActiveModal('settings')}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Settings size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">App Settings</p>
              <p className="text-xs text-gray-500">Currency ({currentUser?.preferredCurrency || 'S$'})</p>
            </div>
            <ChevronRight size={20} className="text-gray-300" />
          </button>

          <button
            onClick={() => setActiveModal('help')}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <HelpCircle size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">Help & FAQ</p>
              <p className="text-xs text-gray-500">Debt simplification & usage guide</p>
            </div>
            <ChevronRight size={20} className="text-gray-300" />
          </button>

          <button
            onClick={() => setActiveModal('privacy')}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">Privacy & Security</p>
              <p className="text-xs text-gray-500">Password & active sessions</p>
            </div>
            <ChevronRight size={20} className="text-gray-300" />
          </button>
        </Card>
      </section>

      {/* App Version Footer */}
      <footer className="text-center pt-2 pb-4 space-y-1.5">
        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-3.5 py-1 rounded-full text-xs font-semibold border border-gray-200">
          <span>Splits App v{APP_VERSION}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-emerald-600 font-bold">Production</span>
        </div>
        <p className="text-[11px] text-gray-400">
          Built with React & Vite PWA • Build {APP_BUILD_DATE}
        </p>
      </footer>

      {/* Interactive Modals */}
      <AnimatePresence>
        {activeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setActiveModal(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] max-w-md mx-auto bg-white rounded-2xl p-6 shadow-2xl z-50 max-h-[80vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">
                  {activeModal === 'profile' && 'Edit Profile'}
                  {activeModal === 'notifications' && 'Notifications'}
                  {activeModal === 'payment' && 'Payment Methods'}
                  {activeModal === 'invite' && 'Invite Friends'}
                  {activeModal === 'settings' && 'App Settings'}
                  {activeModal === 'help' && 'Help & FAQ'}
                  {activeModal === 'privacy' && 'Privacy & Security'}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 0. Profile Modal (Edit Name & Avatar) */}
              {activeModal === 'profile' && (
                <div className="space-y-5">
                  {/* Live Avatar Preview & Upload */}
                  <div className="flex flex-col items-center gap-3">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-24 h-24 rounded-full cursor-pointer group border-4 border-primary/20 shadow-md overflow-hidden bg-gray-100"
                    >
                      <img
                        src={avatarInput || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameInput || 'User')}&background=random`}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={22} />
                        <span className="text-[10px] font-bold mt-1">Upload</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                    >
                      <Upload size={14} />
                      Upload Photo from Device
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Username
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Standard Avatar Color Templates
                    </label>
                    <div className="grid grid-cols-4 gap-2.5 mb-3">
                      {[
                        { label: 'Royal Blue', color: '2563eb', hex: '#2563eb' },
                        { label: 'Slate Black', color: '1e293b', hex: '#1e293b' },
                        { label: 'Emerald', color: '059669', hex: '#059669' },
                        { label: 'Violet', color: '7c3aed', hex: '#7c3aed' },
                        { label: 'Crimson', color: 'dc2626', hex: '#dc2626' },
                        { label: 'Amber Gold', color: 'd97706', hex: '#d97706' },
                        { label: 'Teal Ocean', color: '0d9488', hex: '#0d9488' },
                        { label: 'Rose Pink', color: 'db2777', hex: '#db2777' },
                      ].map((item) => {
                        const nameToUse = nameInput.trim() || currentUser?.name || 'User';
                        const generatedUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameToUse)}&background=${item.color}&color=ffffff&bold=true`;
                        const isSelected = avatarInput === generatedUrl;

                        return (
                          <button
                            key={item.color}
                            type="button"
                            onClick={() => setAvatarInput(generatedUrl)}
                            className={`p-1 rounded-2xl border-2 transition-all aspect-square flex flex-col items-center justify-center gap-1 ${
                              isSelected
                                ? 'border-primary ring-2 ring-primary/30 scale-105 bg-primary/5'
                                : 'border-transparent hover:border-gray-200 bg-gray-50'
                            }`}
                          >
                            <span
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                              style={{ backgroundColor: item.hex }}
                            >
                              {nameToUse.substring(0, 2).toUpperCase()}
                            </span>
                            <span className="text-[9px] font-semibold text-gray-600 truncate w-full text-center">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-xs text-gray-400 mb-1">Or paste custom image URL:</p>
                    <input
                      type="url"
                      value={avatarInput}
                      onChange={(e) => setAvatarInput(e.target.value)}
                      placeholder="https://example.com/my-photo.jpg"
                      className="w-full px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/50 text-xs font-mono"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30"
                  >
                    Save Profile Changes
                  </button>
                </div>
              )}

              {/* 1. Notifications Modal */}
              {activeModal === 'notifications' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Push Notifications</p>
                      <p className="text-xs text-gray-500">Alerts for new expenses and payments</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={pushNotif}
                      onChange={(e) => setPushNotif(e.target.checked)}
                      className="w-5 h-5 accent-primary rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Email Digest</p>
                      <p className="text-xs text-gray-500">Weekly balance summaries</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailNotif}
                      onChange={(e) => setEmailNotif(e.target.checked)}
                      className="w-5 h-5 accent-primary rounded cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={handleSaveNotifications}
                    className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30"
                  >
                    Save Notification Preferences
                  </button>
                </div>
              )}

              {/* 2. Payment Methods Modal */}
              {activeModal === 'payment' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Add your PayNow, UPI, or Venmo handle. When group members tap "Settle Up" to pay you, your handle will be displayed for 1-click copying!
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PayNow Phone / UUEN / UPI ID
                    </label>
                    <input
                      type="text"
                      value={paynowInput}
                      onChange={(e) => setPaynowInput(e.target.value)}
                      placeholder="+65 9123 4567 or user@uen"
                      className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                    />
                  </div>

                  {currentUser?.paynowHandle && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-blue-600 block">Current Active Handle</span>
                        <span className="font-bold text-gray-900 text-sm">{currentUser.paynowHandle}</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(currentUser.paynowHandle || '');
                          setCopiedPayNow(true);
                          setTimeout(() => setCopiedPayNow(false), 2000);
                        }}
                        className="px-3 py-1 bg-white text-blue-600 text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1"
                      >
                        {copiedPayNow ? <Check size={14} /> : <Copy size={14} />}
                        {copiedPayNow ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleSavePayment}
                    className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30"
                  >
                    Save Payment Handle
                  </button>
                </div>
              )}

              {/* 3. Invite Friends Modal */}
              {activeModal === 'invite' && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                    <UserPlus size={32} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    Invite your friends to track shared expenses together on Splits!
                  </p>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={window.location.origin}
                      className="flex-1 bg-transparent text-xs font-mono text-gray-600 border-none outline-none truncate"
                    />
                    <button
                      onClick={handleCopyAppUrl}
                      className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-1 shrink-0"
                    >
                      {copiedAppUrl ? <Check size={14} /> : <Copy size={14} />}
                      {copiedAppUrl ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              )}

              {/* 4. App Settings Modal */}
              {activeModal === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Globe size={16} /> Preferred Currency Symbol
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CURRENCIES.map(curr => (
                        <button
                          key={curr.code}
                          type="button"
                          onClick={() => setCurrencyInput(curr.symbol)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            currencyInput === curr.symbol
                              ? 'bg-primary/5 border-primary ring-1 ring-primary text-primary'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span className="font-bold text-sm block">{curr.symbol} ({curr.code})</span>
                          <span className="text-[10px] text-gray-500 block truncate">{curr.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30"
                  >
                    Save App Settings
                  </button>
                </div>
              )}

              {/* 5. Help & FAQ Modal */}
              {activeModal === 'help' && (
                <div className="space-y-3">
                  {FAQS.map((faq, index) => {
                    const isOpen = openFaqIndex === index;
                    return (
                      <div key={index} className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                          className="w-full p-3 text-left font-semibold text-sm text-gray-900 flex justify-between items-center gap-2"
                        >
                          <span>{faq.q}</span>
                          <ChevronRight
                            size={16}
                            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="p-3 pt-0 text-xs text-gray-600 border-t border-gray-100/60 leading-relaxed bg-white">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 6. Privacy & Security Modal */}
              {activeModal === 'privacy' && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                    <Shield size={24} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Account Secured</p>
                      <p className="text-[10px] text-emerald-700">Authenticated active session for {currentUser?.email || currentUser?.name}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Key size={14} /> Change Password
                    </h4>

                    {passError && (
                      <p className="text-xs font-bold text-red-500 mb-2">{passError}</p>
                    )}

                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Current Password"
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <input
                        type="password"
                        placeholder="New Password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30"
                  >
                    Update Password
                  </button>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
        title="Sign Out?"
        message="Are you sure you want to sign out of your account on this device?"
        confirmText="Sign Out"
        cancelText="Stay"
        variant="destructive"
      />
    </div>
  );
}
