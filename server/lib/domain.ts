import { randomUUID } from 'node:crypto';
import type { Expense, Friend, Group, User, SimplifiedDebt, MemberBalance } from '../types.js';
import { Prisma, type PrismaClient } from '@prisma/client';

type PrismaLike = PrismaClient;

type StoredUser = User & {
  password: string;
};

type StoredFriend = {
  id: string;
  ownerId: string | null;
  linkedUserId: string | null;
  name: string;
  email: string | null;
  avatar: string | null;
  isVirtual: boolean;
};
type StoredExpense = Expense;

export const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ');
export const normalizeEmail = (value?: string) => value?.trim().toLowerCase() || '';
export const createId = (prefix: string) => `${prefix}_${randomUUID()}`;

export const parseStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : typeof value === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(value) as unknown;
            return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
          } catch {
            return [];
          }
        })()
      : [];

export const createAvatar = (name: string, bgHex: string = '2563eb') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgHex}&color=ffffff&bold=true`;

const round2 = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100;

export const computeGroupMemberBalancesAndDebts = (
  members: User[],
  groupExpenses: StoredExpense[]
) => {
  const balanceMap = new Map<string, number>();
  members.forEach(m => balanceMap.set(m.id, 0));

  for (const expense of groupExpenses) {
    if (expense.kind === 'payment') {
      if (expense.status === 'pending' || expense.status === 'rejected') continue;
      const counterpartyId = expense.splitWith[0];
      if (!counterpartyId) continue;
      balanceMap.set(expense.paidBy, round2((balanceMap.get(expense.paidBy) || 0) + expense.amount));
      balanceMap.set(counterpartyId, round2((balanceMap.get(counterpartyId) || 0) - expense.amount));
      continue;
    }

    const participants = [...new Set([expense.paidBy, ...expense.splitWith])];
    if (participants.length === 0) continue;

    const share = round2(expense.amount / participants.length);

    for (const pId of participants) {
      if (pId === expense.paidBy) {
        const totalOwedByOthers = round2(expense.amount - share);
        balanceMap.set(pId, round2((balanceMap.get(pId) || 0) + totalOwedByOthers));
      } else {
        balanceMap.set(pId, round2((balanceMap.get(pId) || 0) - share));
      }
    }
  }

  const memberBalances: MemberBalance[] = members.map(m => {
    const rawBal = balanceMap.get(m.id) || 0;
    const roundedBal = Math.abs(round2(rawBal)) < 0.005 ? 0 : round2(rawBal);
    return {
      userId: m.id,
      name: m.name,
      avatar: m.avatar,
      balance: roundedBal,
    };
  });

  const debtors: Array<{ id: string; name: string; debt: number }> = [];
  const creditors: Array<{ id: string; name: string; credit: number }> = [];

  for (const mb of memberBalances) {
    if (mb.balance < -0.005) {
      debtors.push({ id: mb.userId, name: mb.name, debt: round2(Math.abs(mb.balance)) });
    } else if (mb.balance > 0.005) {
      creditors.push({ id: mb.userId, name: mb.name, credit: round2(mb.balance) });
    }
  }

  debtors.sort((a, b) => b.debt - a.debt);
  creditors.sort((a, b) => b.credit - a.credit);

  const simplifiedDebts: SimplifiedDebt[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const settle = round2(Math.min(debtors[i].debt, creditors[j].credit));
    if (settle > 0.005) {
      simplifiedDebts.push({
        from: debtors[i].id,
        fromName: debtors[i].name,
        to: creditors[j].id,
        toName: creditors[j].name,
        amount: settle,
      });
      debtors[i].debt = round2(debtors[i].debt - settle);
      creditors[j].credit = round2(creditors[j].credit - settle);
    }
    if (debtors[i].debt < 0.005) i++;
    if (creditors[j].credit < 0.005) j++;
  }

  return { memberBalances, simplifiedDebts };
};

const computeBalances = (userId: string, expenses: StoredExpense[]) => {
  const friendBalances = new Map<string, number>();
  const groupBalances = new Map<string, number>();

  for (const expense of expenses) {
    if (expense.kind === 'payment') {
      if (expense.status === 'pending' || expense.status === 'rejected') continue;
      const counterpartyId = expense.splitWith[0];
      if (!counterpartyId) continue;

      if (expense.paidBy === userId) {
        friendBalances.set(counterpartyId, round2((friendBalances.get(counterpartyId) || 0) + expense.amount));
        if (expense.groupId) {
          groupBalances.set(expense.groupId, round2((groupBalances.get(expense.groupId) || 0) + expense.amount));
        }
      } else if (counterpartyId === userId) {
        friendBalances.set(expense.paidBy, round2((friendBalances.get(expense.paidBy) || 0) - expense.amount));
        if (expense.groupId) {
          groupBalances.set(expense.groupId, round2((groupBalances.get(expense.groupId) || 0) - expense.amount));
        }
      }

      continue;
    }

    const participants = [...new Set([expense.paidBy, ...expense.splitWith])];
    if (!participants.includes(userId)) continue;

    const share = round2(expense.amount / participants.length);

    if (expense.paidBy === userId) {
      const others = participants.filter(participantId => participantId !== userId);
      others.forEach(participantId => {
        friendBalances.set(participantId, round2((friendBalances.get(participantId) || 0) + share));
      });

      if (expense.groupId) {
        groupBalances.set(expense.groupId, round2((groupBalances.get(expense.groupId) || 0) + share * others.length));
      }
    } else {
      friendBalances.set(expense.paidBy, round2((friendBalances.get(expense.paidBy) || 0) - share));

      if (expense.groupId) {
        groupBalances.set(expense.groupId, round2((groupBalances.get(expense.groupId) || 0) - share));
      }
    }
  }

  for (const [key, val] of friendBalances.entries()) {
    const r = round2(val);
    friendBalances.set(key, Math.abs(r) < 0.005 ? 0 : r);
  }
  for (const [key, val] of groupBalances.entries()) {
    const r = round2(val);
    groupBalances.set(key, Math.abs(r) < 0.005 ? 0 : r);
  }

  return { friendBalances, groupBalances };
};

const toUser = (user: StoredUser): User => ({
  id: user.id,
  name: user.name,
  email: user.email || undefined,
  avatar: user.avatar || undefined,
  paynowHandle: (user as unknown as { paynowHandle?: string | null }).paynowHandle || undefined,
  preferredCurrency: (user as unknown as { preferredCurrency?: string | null }).preferredCurrency || 'S$',
  notificationEmail: (user as unknown as { notificationEmail?: boolean | null }).notificationEmail ?? true,
  notificationPush: (user as unknown as { notificationPush?: boolean | null }).notificationPush ?? true,
});

const toUserFromFriend = (friend: StoredFriend): User => ({
  id: friend.id,
  name: friend.name,
  email: friend.email || undefined,
  avatar: friend.avatar || createAvatar(friend.name),
  isVirtual: friend.isVirtual || undefined,
});

const toFriend = (friend: StoredFriend, balance: number): Friend => ({
  id: friend.id,
  name: friend.name,
  email: friend.email || undefined,
  avatar: friend.avatar || undefined,
  isVirtual: friend.isVirtual || undefined,
  balance,
});

export const buildAppState = async (db: PrismaLike, userId: string) => {
  const [currentUser, allUsers, ownedFriends, placeholderFriends, groups, expenses, activities] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.user.findMany({ orderBy: { createdAt: 'asc' } }),
    db.friend.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } }),
    db.friend.findMany({ where: { ownerId: null, isVirtual: true }, orderBy: { createdAt: 'asc' } }),
    db.group.findMany({ orderBy: { createdAt: 'asc' } }),
    db.expense.findMany({ orderBy: { createdAt: 'desc' } }),
    db.activity.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  if (!currentUser) {
    return null;
  }

  // Auto-claim groups where a friend placeholder matches currentUser by linkedUserId, name, or email
  const allDbFriends = await db.friend.findMany();
  const currentEmail = currentUser.email ? currentUser.email.toLowerCase() : '';
  const currentName = currentUser.name.toLowerCase();

  const matchingFriendPlaceholders = allDbFriends.filter(f =>
    f.linkedUserId === currentUser.id ||
    f.name.toLowerCase() === currentName ||
    (currentEmail && f.email && f.email.toLowerCase() === currentEmail)
  );

  const matchingFriendIds = new Set(matchingFriendPlaceholders.map(f => f.id));

  if (matchingFriendIds.size > 0) {
    // 1. Migrate Groups
    for (const group of groups) {
      const currentMembers = parseStringArray(group.memberIds);
      const hasMatch = currentMembers.some(id => matchingFriendIds.has(id));
      if (hasMatch) {
        const updatedMembers = [...new Set(currentMembers.map(id => (matchingFriendIds.has(id) ? userId : id)))];
        await db.group.update({
          where: { id: group.id },
          data: { memberIds: updatedMembers as unknown as Prisma.InputJsonValue },
        }).catch(() => {});
        (group as unknown as { memberIds: string[] }).memberIds = updatedMembers;
      }
    }

    // 2. Migrate ALL Expenses (both group and non-group)
    for (const exp of expenses) {
      let updatedPaidBy = exp.paidBy;
      let updatedSplitWith = parseStringArray(exp.splitWith);
      let needsUpdate = false;

      if (matchingFriendIds.has(exp.paidBy)) {
        updatedPaidBy = userId;
        needsUpdate = true;
      }

      if (updatedSplitWith.some(id => matchingFriendIds.has(id))) {
        updatedSplitWith = [...new Set(updatedSplitWith.map(id => (matchingFriendIds.has(id) ? userId : id)))];
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db.expense.update({
          where: { id: exp.id },
          data: {
            paidBy: updatedPaidBy,
            splitWith: updatedSplitWith as unknown as Prisma.InputJsonValue,
          },
        }).catch(() => {});
        exp.paidBy = updatedPaidBy;
        (exp as unknown as { splitWith: string[] }).splitWith = updatedSplitWith;
      }
    }

    // 3. Link friend placeholders in DB
    for (const friend of matchingFriendPlaceholders) {
      if (!friend.linkedUserId) {
        await db.friend.update({
          where: { id: friend.id },
          data: { linkedUserId: userId },
        }).catch(() => {});
      }
    }
  }

  const visibleGroups = groups.filter(group => parseStringArray(group.memberIds).includes(userId));
  const visibleGroupIds = new Set(visibleGroups.map(group => group.id));

  const storedExpenses: StoredExpense[] = expenses.map(expense => ({
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    paidBy: expense.paidBy,
    date: expense.date,
    category: expense.category as Expense['category'],
    kind: (expense.kind as Expense['kind']) || 'expense',
    splitWith: parseStringArray(expense.splitWith),
    groupId: expense.groupId || undefined,
  }));

  const { friendBalances, groupBalances } = computeBalances(userId, storedExpenses);

  const userMap = new Map(allUsers.map(user => [user.id, toUser(user as StoredUser)]));
  const placeholderMap = new Map(placeholderFriends.map(friend => [friend.id, friend as StoredFriend]));
  const friendMap = new Map(ownedFriends.map(friend => [friend.id, friend as StoredFriend]));
  const allDbFriendsMap = new Map(allDbFriends.map(friend => [friend.id, friend as StoredFriend]));

  const groupPayload: Array<Group & { memberIds: string[] }> = visibleGroups.map(group => {
    const rawMemberIds = parseStringArray(group.memberIds);
    const resolvedMembers = rawMemberIds
      .map(memberId => {
        if (userMap.has(memberId)) return userMap.get(memberId);
        if (friendMap.has(memberId)) return toUserFromFriend(friendMap.get(memberId) as StoredFriend);
        if (placeholderMap.has(memberId)) return toUserFromFriend(placeholderMap.get(memberId) as StoredFriend);
        if (allDbFriendsMap.has(memberId)) return toUserFromFriend(allDbFriendsMap.get(memberId) as StoredFriend);
        return undefined;
      })
      .filter((member): member is User => Boolean(member))
      .map(member => {
        if (member.avatar) return member;
        return { ...member, avatar: createAvatar(member.name) };
      });

    // Deduplicate members so duplicate placeholders / user IDs for the same person do not show up twice
    const members: User[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    for (const m of resolvedMembers) {
      const lowerName = m.name.toLowerCase();
      if (!seenIds.has(m.id)) {
        if (m.id.startsWith('u_')) {
          // If real registered user, replace any earlier placeholder with matching name
          const matchIdx = members.findIndex(exist => exist.name.toLowerCase() === lowerName);
          if (matchIdx !== -1) {
            members[matchIdx] = m;
          } else {
            members.push(m);
          }
          seenNames.add(lowerName);
        } else if (!seenNames.has(lowerName)) {
          members.push(m);
          seenNames.add(lowerName);
        }
        seenIds.add(m.id);
      }
    }

    const thisGroupExpenses = storedExpenses.filter(e => e.groupId === group.id);
    const { memberBalances, simplifiedDebts } = computeGroupMemberBalancesAndDebts(members, thisGroupExpenses);

    const rawAdmins = parseStringArray((group as unknown as { adminIds?: unknown }).adminIds);
    const adminIds = rawAdmins.length > 0 ? rawAdmins : (group.createdById ? [group.createdById] : []);

    return {
      id: group.id,
      name: group.name,
      type: group.type as Group['type'],
      members,
      memberIds: members.map(m => m.id),
      balance: groupBalances.get(group.id) || 0,
      currency: group.currency,
      createdBy: group.createdById || undefined,
      adminIds,
      memberBalances,
      simplifiedDebts,
    };
  });

  // Build complete friend list including owned friends AND counterparties with balances/shared groups
  const counterpartyIds = new Set<string>();
  for (const [fId, bal] of friendBalances.entries()) {
    if (Math.abs(bal) > 0.005) counterpartyIds.add(fId);
  }
  for (const group of groupPayload) {
    for (const m of group.members) {
      if (m.id !== userId) counterpartyIds.add(m.id);
    }
  }

  const friendListMap = new Map<string, Friend>();

  // Add owned friends
  for (const friend of ownedFriends) {
    friendListMap.set(friend.id, toFriend(friend as StoredFriend, friendBalances.get(friend.id) || 0));
  }

  // Add counterparties/co-members that are registered users or friends
  for (const cId of counterpartyIds) {
    if (friendListMap.has(cId)) continue;

    if (userMap.has(cId)) {
      const u = userMap.get(cId)!;
      friendListMap.set(u.id, {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || createAvatar(u.name),
        balance: friendBalances.get(u.id) || 0,
      });
    } else if (placeholderMap.has(cId)) {
      const p = placeholderMap.get(cId)!;
      friendListMap.set(p.id, toFriend(p, friendBalances.get(p.id) || 0));
    }
  }

  const friendPayload = Array.from(friendListMap.values());

  const visibleExpenses = expenses
    .map(expense => ({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      paidBy: expense.paidBy,
      date: expense.date,
      category: expense.category as Expense['category'],
      kind: (expense.kind as Expense['kind']) || 'expense',
      status: expense.status || 'confirmed',
      splitWith: parseStringArray(expense.splitWith),
      groupId: expense.groupId || undefined,
    }))
    .filter(expense => {
      const participants = [expense.paidBy, ...expense.splitWith];
      return participants.includes(userId) || (expense.groupId ? visibleGroupIds.has(expense.groupId) : false);
    });

  const visibleActivities = activities
    .filter(activity => activity.userId === userId || (activity.groupId ? visibleGroupIds.has(activity.groupId) : false))
    .map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      amount: activity.amount || undefined,
      date: activity.date,
      user: userMap.get(activity.userId) || toUser(currentUser as StoredUser),
      group: groupPayload.find(group => group.id === activity.groupId)?.name,
    }));

  return {
    currentUser: toUser(currentUser as StoredUser),
    users: [
      toUser(currentUser as StoredUser),
      ...friendPayload.map(friend => ({
        id: friend.id,
        name: friend.name,
        email: friend.email,
        avatar: friend.avatar,
        isVirtual: friend.isVirtual,
      })),
      ...groupPayload.flatMap(group => group.members),
    ].filter((value, index, array) => array.findIndex(item => item.id === value.id) === index),
    friends: friendPayload,
    groups: groupPayload,
    expenses: visibleExpenses,
    activities: visibleActivities,
  };
};
