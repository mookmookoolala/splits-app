import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Check, Utensils, Car, Clapperboard, Plane, Home, ShoppingBag, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { Expense, ExpenseCategory } from '../types';

const categories: Array<{
  id: ExpenseCategory;
  icon: typeof Utensils;
  label: string;
  color: string;
  bg: string;
}> = [
  { id: 'food', icon: Utensils, label: 'Food', color: 'text-orange-500', bg: 'bg-orange-100' },
  { id: 'transport', icon: Car, label: 'Transport', color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 'entertainment', icon: Clapperboard, label: 'Entertainment', color: 'text-purple-500', bg: 'bg-purple-100' },
  { id: 'trip', icon: Plane, label: 'Trip', color: 'text-sky-500', bg: 'bg-sky-100' },
  { id: 'utilities', icon: Home, label: 'Utilities', color: 'text-yellow-500', bg: 'bg-yellow-100' },
  { id: 'other', icon: ShoppingBag, label: 'Other', color: 'text-gray-500', bg: 'bg-gray-100' },
];

type EditExpenseFormProps = {
  expense: Expense;
};

function EditExpenseForm({ expense }: EditExpenseFormProps) {
  const navigate = useNavigate();
  const { groups, users, currentUser, updateExpense, deleteExpense } = useApp();
  const { toast } = useToast();

  const [amount, setAmount] = useState(() => expense.amount.toString());
  const [description, setDescription] = useState(() => expense.description);
  const [category, setCategory] = useState<ExpenseCategory>(() => expense.category);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(() => expense.groupId || null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>(() => expense.splitWith);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const paidBy = expense.paidBy;
  const isPayment = expense.kind === 'payment';

  const isPayer = currentUser?.id === paidBy;
  const targetGroup = selectedGroup
    ? groups.find(g => g.id === selectedGroup)
    : (expense.groupId ? groups.find(g => g.id === expense.groupId) : null);
  const isGroupAdmin = targetGroup ? targetGroup.createdBy === currentUser?.id : false;
  const isParticipant = expense.splitWith.includes(currentUser?.id || '');
  const isGroupMember = targetGroup ? targetGroup.members.some(m => m.id === currentUser?.id) : false;
  const canEdit = Boolean(isPayer || isGroupAdmin || isParticipant || isGroupMember);

  const toggleFriend = (fid: string) => {
    if (!canEdit) return;
    if (selectedFriends.includes(fid)) {
      setSelectedFriends(selectedFriends.filter(id => id !== fid));
    } else {
      setSelectedFriends([...selectedFriends, fid]);
    }
  };

  const handleSave = async () => {
    if (!canEdit || !amount || !description || !currentUser) return;

    try {
      await updateExpense({
        ...expense,
        description,
        amount: parseFloat(amount),
        category,
        splitWith: selectedFriends,
        groupId: selectedGroup || undefined,
        paidBy,
      });

      toast.success(`${isPayment ? 'Payment' : 'Expense'} updated successfully`);
      navigate(-1);
    } catch (error) {
      console.error('Failed to update expense:', error);
      toast.error('Failed to update expense. Please try again.');
    }
  };

  const handleDelete = () => {
    if (!canEdit) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExpense(expense.id);
      toast.success(`${isPayment ? 'Payment' : 'Expense'} deleted successfully`);
      navigate(-1);
    } catch (error) {
      console.error(`Failed to delete ${isPayment ? 'payment' : 'expense'}:`, error);
      toast.error(`Failed to delete ${isPayment ? 'payment' : 'expense'}. Please try again.`);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const availableUsers = selectedGroup
    ? (groups.find(g => g.id === selectedGroup)?.members || [])
    : (currentUser ? users.filter(u => u.id !== currentUser.id) : []);

  const usersToSplitWith = availableUsers.filter(u => u.id !== paidBy);

  return (
    <div className="min-h-screen bg-[#fcfbf9] relative max-w-md mx-auto shadow-2xl overflow-hidden flex flex-col">
      <header className="flex justify-between items-center p-6 pb-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600"
        >
          <X size={20} />
        </motion.button>
        <h1 className="text-lg font-bold text-gray-900">
          {isPayment ? 'Edit Payment' : 'Edit Expense'}
        </h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={!canEdit || !amount || !description}
          className="px-4 h-10 bg-primary/20 text-primary-dark rounded-xl flex items-center justify-center font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={18} className="mr-1" />
          Save
        </motion.button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
        {!canEdit && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs font-semibold">
            <span className="shrink-0 text-amber-600 font-bold">⚠️</span>
            <span>Only the person who paid this {isPayment ? 'payment' : 'expense'} or the group admin has permission to edit or delete it.</span>
          </div>
        )}
        <div className="text-center py-6">
          <div className="flex items-center justify-center text-gray-400 text-4xl font-medium">
            <span className="mr-2">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-48 bg-transparent text-gray-900 placeholder-gray-300 outline-none font-bold text-center"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this for?"
            className="w-full text-lg font-medium text-gray-900 placeholder-gray-300 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-3 block px-1">Category</label>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-colors ${
                  category === cat.id ? 'bg-white shadow-md ring-2 ring-primary/20' : 'bg-white/50 hover:bg-white'
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${cat.bg} ${cat.color} flex items-center justify-center mb-2`}>
                  <cat.icon size={20} />
                </div>
                <span className={`text-xs font-medium ${category === cat.id ? 'text-gray-900' : 'text-gray-500'}`}>
                  {cat.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-3 block px-1">Group</label>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedGroup(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedGroup === null
                  ? 'bg-gray-800 text-white shadow-lg shadow-gray-800/20'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              No Group
            </motion.button>
            {groups.map(group => (
              <motion.button
                key={group.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedGroup(group.id);
                  setSelectedFriends(group.members.filter(member => member.id !== paidBy).map(member => member.id));
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedGroup === group.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {group.name}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-3 block px-1">Split With</label>
          <div className="space-y-2">
            {usersToSplitWith.length === 0 ? (
              <p className="text-sm text-gray-500 italic p-2">No friends to split with in this context.</p>
            ) : (
              usersToSplitWith.map(user => (
                <div
                  key={user.id}
                  onClick={() => toggleFriend(user.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedFriends.includes(user.id) ? 'bg-white shadow-sm ring-1 ring-primary/20' : 'bg-white/50 hover:bg-white'
                  }`}
                >
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=ffffff&bold=true`}
                    alt={user.name}
                    className="w-10 h-10 rounded-full bg-gray-200"
                  />
                  <span className="flex-1 font-medium text-gray-900">{user.name}</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                    selectedFriends.includes(user.id) ? 'bg-primary text-white' : 'bg-gray-200'
                  }`}>
                    {selectedFriends.includes(user.id) && <Check size={14} />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delete Expense / Delete Payment Button */}
        {canEdit && (
          <div className="pt-4 border-t border-gray-200">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Trash2 size={18} />
              {isDeleting ? 'Deleting...' : `Delete ${isPayment ? 'Payment' : 'Expense'}`}
            </motion.button>
          </div>
        )}

        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${isPayment ? 'Payment' : 'Expense'}?`}
          message={`Are you sure you want to delete this ${isPayment ? 'payment' : 'expense'}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
}

export default function EditExpense() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { expenses } = useApp();

  const expense = id ? expenses.find(entry => entry.id === id) : undefined;

  if (!expense) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] relative max-w-md mx-auto shadow-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 mb-4">Expense not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary/20 text-primary-dark rounded-xl font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <EditExpenseForm key={expense.id} expense={expense} />;
}
