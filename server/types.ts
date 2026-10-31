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
  from: string;
  fromName: string;
  to: string;
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
  balance: number;
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
  paidBy: string;
  date: string;
  category: ExpenseCategory;
  splitWith: string[];
  kind?: ExpenseKind;
  groupId?: string;
  status?: string;
}

export interface Friend extends User {
  balance: number;
}
