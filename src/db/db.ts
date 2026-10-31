import Dexie, { type EntityTable } from 'dexie';
import type { User, Expense, Activity, GroupType } from '../types';

export interface FriendEntity extends User {
  balance: number;
}

export interface GroupEntity {
  id: string;
  name: string;
  type: GroupType;
  memberIds: string[];
  balance: number;
  currency: string;
  createdBy?: string;
}

export type ExpenseEntity = Expense;

export type ActivityEntity = Activity;

const db = new Dexie('SplitsDB') as Dexie & {
  friends: EntityTable<FriendEntity, 'id'>;
  groups: EntityTable<GroupEntity, 'id'>;
  expenses: EntityTable<ExpenseEntity, 'id'>;
  activities: EntityTable<ActivityEntity, 'id'>;
  users: EntityTable<User & { password?: string }, 'id'>;
};

// Schema declaration:
db.version(2).stores({
  friends: 'id, name, email',
  groups: 'id, name, type',
  expenses: 'id, date, category, groupId, paidBy',
  activities: 'id, date, type',
  users: 'id, name, email'
});

export { db };
