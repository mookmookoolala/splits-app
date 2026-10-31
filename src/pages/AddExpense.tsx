import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Utensils, Car, Clapperboard, Plane, Home, ShoppingBag, CreditCard, Users, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import type { ExpenseCategory } from '../types';

export default function AddExpense() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { groups, friends, currentUser, addExpense } = useApp();
  const { toast } = useToast();
  const defaultGroupId = searchParams.get('group');

  const initialGroup = defaultGroupId && groups.some(group => group.id === defaultGroupId) ? defaultGroupId : null;

  // Step state: if defaultGroupId is provided, start directly at step 2
  const [step, setStep] = useState<1 | 2 | 3>(initialGroup ? 2 : 1);

  const [selectedGroup, setSelectedGroup] = useState<string | null>(initialGroup);
  const [selectedFriends, setSelectedFriends] = useState<string[]>(() => {
    if (!currentUser) return [];
    const grp = groups.find(g => g.id === initialGroup);
    return grp ? grp.members.map(m => m.id) : [currentUser.id];
  });
  const [paidByUserId, setPaidByUserId] = useState<string>(currentUser?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');

  const categories: Array<{
    id: ExpenseCategory;
    icon: typeof Utensils;
    label: string;
    color: string;
    bg: string;
  }> = [
    { id: 'food', icon: Utensils, label: 'Food', color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'transport', icon: Car, label: 'Transport', color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'entertainment', icon: Clapperboard, label: 'Entertainment', color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'trip', icon: Plane, label: 'Trip', color: 'text-sky-500', bg: 'bg-sky-50' },
    { id: 'utilities', icon: Home, label: 'Utilities', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'other', icon: ShoppingBag, label: 'Other', color: 'text-slate-500', bg: 'bg-slate-50' },
  ];

  const handleSelectGroup = (groupId: string | null) => {
    setSelectedGroup(groupId);
    if (groupId) {
      const grp = groups.find(g => g.id === groupId);
      if (grp) {
        setSelectedFriends(grp.members.map(m => m.id));
      }
    } else {
      setSelectedFriends(currentUser ? [currentUser.id] : []);
    }
    setStep(2);
  };

  const toggleFriend = (id: string) => {
    if (selectedFriends.includes(id)) {
      setSelectedFriends(selectedFriends.filter(fid => fid !== id));
    } else {
      setSelectedFriends([...selectedFriends, id]);
    }
  };

  const handleSave = async () => {
    if (!amount || !description || !currentUser) return;

    const actualPaidBy = paidByUserId || currentUser.id;

    try {
      await addExpense({
        description,
        amount: parseFloat(amount),
        category,
        splitWith: selectedFriends.filter(id => id !== actualPaidBy),
        groupId: selectedGroup || undefined,
        paidBy: actualPaidBy,
      });

      toast.success('Expense saved successfully!');

      if (selectedGroup) {
        navigate(`/groups/${selectedGroup}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast.error('Failed to save expense. Please try again.');
    }
  };

  // Members available in current context
  const availableMembers = selectedGroup
    ? groups.find(g => g.id === selectedGroup)?.members || []
    : (currentUser ? [currentUser, ...friends] : []);

  const friendList = availableMembers.filter(member => member.id !== (paidByUserId || currentUser?.id));

  return (
    <div className="min-h-screen bg-slate-50 relative max-w-md mx-auto shadow-2xl flex flex-col font-sans">
      {/* Step Header */}
      <header className="flex justify-between items-center px-6 py-5 bg-white border-b border-slate-100">
        <button
          onClick={() => {
            if (step > 1 && !initialGroup) {
              setStep((step - 1) as 1 | 2);
            } else {
              navigate(-1);
            }
          }}
          className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
        >
          {step > 1 && !initialGroup ? <ArrowLeft size={18} /> : <X size={18} />}
        </button>

        <div className="text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Step {step} of 3
          </span>
          <h1 className="text-sm font-bold text-slate-900">
            {step === 1 ? 'Select Group or Trip' : step === 2 ? 'Expense Details' : 'Who Paid & Split'}
          </h1>
        </div>

        {step === 3 ? (
          <button
            onClick={handleSave}
            disabled={!amount || !description}
            className="px-3.5 h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm disabled:opacity-50 transition-all"
          >
            <Check size={16} className="mr-1" /> Save
          </button>
        ) : (
          <div className="w-9" />
        )}
      </header>

      {/* Wizard Step Progress Bar */}
      <div className="w-full bg-slate-100 h-1">
        <div
          className="bg-slate-900 h-1 transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence mode="wait">
          {/* STEP 1: SELECT GROUP OR STANDALONE */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <div className="text-center py-2">
                <h2 className="text-lg font-bold text-slate-900">Where are you splitting this?</h2>
                <p className="text-xs text-slate-400 mt-1">Select a group or split 1-on-1 with a friend</p>
              </div>

              {/* Standalone Option */}
              <div
                onClick={() => handleSelectGroup(null)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                  selectedGroup === null
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white text-slate-800 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  selectedGroup === null ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  👤
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold">1-on-1 / Standalone</h3>
                  <p className={`text-xs ${selectedGroup === null ? 'text-slate-300' : 'text-slate-400'}`}>
                    Split directly with a friend (no group)
                  </p>
                </div>
                <ArrowRight size={18} className={selectedGroup === null ? 'text-white' : 'text-slate-400'} />
              </div>

              {/* Group Options */}
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Your Groups & Trips:</span>
                {groups.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4 bg-white rounded-2xl border border-slate-100">
                    No groups created yet. You can split as Standalone!
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {groups.map(group => (
                      <div
                        key={group.id}
                        onClick={() => handleSelectGroup(group.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                          selectedGroup === group.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-white text-slate-800 border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                          selectedGroup === group.id ? 'bg-slate-800' : 'bg-slate-100'
                        }`}>
                          {group.type === 'apartment' ? '🏠' : group.type === 'trip' ? '✈️' : '👥'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold truncate">{group.name}</h3>
                          <p className={`text-xs ${selectedGroup === group.id ? 'text-slate-300' : 'text-slate-400'}`}>
                            {group.members.length} members
                          </p>
                        </div>
                        <ArrowRight size={18} className={selectedGroup === group.id ? 'text-white' : 'text-slate-400'} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: AMOUNT, DESCRIPTION & CATEGORY */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              {/* Selected Group Pill */}
              <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 text-xs">
                <span className="text-slate-400 font-semibold">Logged under:</span>
                <button
                  onClick={() => setStep(1)}
                  className="font-bold text-slate-900 hover:text-blue-600 flex items-center gap-1"
                >
                  <span>{selectedGroup ? groups.find(g => g.id === selectedGroup)?.name : '1-on-1 Standalone'}</span>
                  <span className="text-[10px] text-blue-600">Change</span>
                </button>
              </div>

              {/* Amount Display */}
              <div className="text-center py-4">
                <div className="flex items-center justify-center text-slate-400 text-3xl font-medium">
                  <span className="mr-2 text-slate-900 font-extrabold text-4xl">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-48 bg-transparent text-slate-900 placeholder-slate-300 outline-none font-extrabold text-center text-5xl"
                    autoFocus
                  />
                </div>
              </div>

              {/* Description */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What was this for? (e.g. Dinner, Taxi, Hotel)"
                  className="w-full bg-transparent text-slate-900 placeholder-slate-300 outline-none font-semibold text-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all border ${
                        category === cat.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : `${cat.bg} border-transparent text-slate-700 hover:border-slate-200`
                      }`}
                    >
                      <cat.icon size={18} className={category === cat.id ? 'text-white' : cat.color} />
                      <span className="text-xs font-semibold">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Step Button */}
              <button
                onClick={() => setStep(3)}
                disabled={!amount || !description}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all"
              >
                <span>Continue to Payer & Split</span>
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* STEP 3: WHO PAID & WHO SPLITS */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              {/* Summary Pill */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold truncate">{description}</p>
                  <p className="text-[11px] text-slate-300">
                    {selectedGroup ? groups.find(g => g.id === selectedGroup)?.name : '1-on-1 Standalone'}
                  </p>
                </div>
                <span className="text-lg font-extrabold text-emerald-400">${parseFloat(amount || '0').toFixed(2)}</span>
              </div>

              {/* Who Paid? */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-1">
                  <CreditCard size={14} className="text-blue-600" /> Who Paid?
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {availableMembers.map(member => {
                    const isSelected = (paidByUserId || currentUser?.id) === member.id;
                    const isMe = member.id === currentUser?.id;

                    return (
                      <button
                        key={member.id}
                        onClick={() => setPaidByUserId(member.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <img
                          src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0f172a&color=ffffff&bold=true`}
                          alt={member.name}
                          className="w-5 h-5 rounded-full object-cover bg-slate-200"
                        />
                        <span>{isMe ? 'You' : member.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Split With */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-1">
                  <Users size={14} className="text-emerald-600" /> Split With
                </label>
                <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs">
                  {friendList.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-3">No other members to split with.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {friendList.map(user => {
                        const isSelected = selectedFriends.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                            onClick={() => toggleFriend(user.id)}
                          >
                            <div className="flex items-center gap-3">
                              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full bg-slate-200 object-cover" />
                              <span className={`text-xs font-semibold ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                                {user.name}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check size={12} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Final Save Button */}
              <button
                onClick={handleSave}
                disabled={!amount || !description}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 disabled:opacity-50 transition-all"
              >
                <Check size={16} />
                <span>Save Expense (${parseFloat(amount || '0').toFixed(2)})</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
