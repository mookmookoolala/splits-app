import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Smartphone, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePwaInstall } from '../components/PwaUpdateBanner';
import { APP_VERSION } from '../version';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register } = useApp();
  const { isInstalled, triggerInstall } = usePwaInstall();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !password.trim()) {
      setError('Name and password are required.');
      return;
    }

    try {
      const success = await register(name, email || undefined, password);
      if (success) {
        const from = location.state?.from?.pathname || '/';
        navigate(from);
      } else {
        setError('Registration failed. Check for a duplicate name/email and make sure the fields are not just spaces.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col justify-between px-6 py-8 lg:px-8">
      {/* Top Header & Version Badge */}
      <header className="flex justify-between items-center max-w-sm mx-auto w-full pt-2">
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold text-gray-700 border border-gray-200">
          <span>Splits v{APP_VERSION}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        <button
          onClick={triggerInstall}
          className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
        >
          {isInstalled ? <Check size={14} /> : <Smartphone size={14} />}
          {isInstalled ? 'App Installed' : 'Add to Home Screen'}
        </button>
      </header>

      {/* Main Form */}
      <div className="my-auto sm:mx-auto sm:w-full sm:max-w-sm py-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Create your account
          </h2>
          <p className="mt-1 text-center text-xs text-gray-500">
            Track expenses together with friends in 1 click
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
          <form className="space-y-6" onSubmit={handleRegister}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                Full Name
              </label>
              <div className="mt-2">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm px-3"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                Email address <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm px-3"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                  Password
                </label>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm px-3"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="flex w-full justify-center rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all"
              >
                Sign up
              </motion.button>
            </div>
          </form>

          {/* Quick Add to Home Screen Promo Banner on Register Page */}
          <div className="mt-6 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Smartphone size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">Install Splits App 📲</p>
                <p className="text-[10px] text-emerald-700">Add to Home Screen for 1-tap app access</p>
              </div>
            </div>
            <button
              type="button"
              onClick={triggerInstall}
              className="px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg shrink-0 shadow-sm hover:bg-emerald-700 transition-colors"
            >
              Install
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already a member?{' '}
            <Link to="/login" state={location.state} className="font-semibold leading-6 text-primary hover:text-primary-dark">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center pt-4 pb-2">
        <p className="text-[11px] text-gray-400 font-medium">
          Splits App v{APP_VERSION} • Add to Home Screen for instant access
        </p>
      </footer>
    </div>
  );
}
