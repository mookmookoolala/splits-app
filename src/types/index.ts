export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'trip'
  | 'utilities'
  | 'other';

export type ExpenseKind = 'expense' | 'payment';

export type GroupType =
  | 'apartment'
  | 'trip'
  | 'food'
  | 'entertainment'
  | 'other';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isVirtual?: boolean;
  paynowHandle?: string;
  preferredCurrency?: string;
  notificationEmail?: boolean;
  notificationPush?: boolean;
}

export interface SimplifiedDebt {
  from: string; // DebtId
  fromName: string;
  to: string; // CreditorId
  toName: string;
  amount: number;
}

export interface MemberBalance {
  userId: string;
  name: string;
  avatar?: string;
  balance: number;
}

export interface Group {
  id: string;
  name: string;
  members: User[];
  type: GroupType;
  balance: number; // Positive means you are owed, negative means you owe
  currency: string;
  createdBy?: string;
  adminIds?: string[];
  memberBalances?: MemberBalance[];
  simplifiedDebts?: SimplifiedDebt[];
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // User ID
  date: string;
  category: ExpenseCategory;
  splitWith: string[]; // Array of User IDs
  kind?: ExpenseKind;
  groupId?: string;
  status?: 'pending' | 'confirmed' | 'rejected';
}

export interface Activity {
  id: string;
  type: 'expense_added' | 'payment' | 'group_created';
  description: string;
  amount?: number;
  date: string;
  user: User;
  group?: string;
  status?: 'pending' | 'confirmed' | 'rejected';
}

export interface Friend extends User {
  balance: number; // Positive means you are owed, negative means you owe
}
