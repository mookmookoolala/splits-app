try {
  process.loadEnvFile();
} catch {
  // .env file not found or already loaded
}

import cors from 'cors';
import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from './lib/prisma.js';
import { hashPassword, verifyPassword } from './lib/password.js';
import {
  buildAppState,
  createAvatar,
  createId,
  normalizeEmail,
  normalizeName,
  parseStringArray,
} from './lib/domain.js';

import client from 'prom-client';

const app = express();
const port = Number(process.env.PORT || 3001);
const corsOrigin = process.env.CORS_ORIGIN?.split(',').map(value => value.trim()).filter(Boolean) || true;
const toJsonArray = (value: string[]) => value as Prisma.InputJsonValue;

// Prometheus / Grafana metrics setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDuration);

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Metrics tracking & Loki JSON logger middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const durationInSeconds = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const statusCode = res.statusCode.toString();

    httpRequestCounter.inc({ method: req.method, route, status_code: statusCode });
    httpRequestDuration.observe({ method: req.method, route, status_code: statusCode }, durationInSeconds);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Math.round(durationInSeconds * 1000),
    }));
  });

  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/metrics', (_req, res) => {
  register.metrics().then(metrics => {
    res.set('Content-Type', register.contentType);
    res.send(metrics);
  }).catch(err => {
    res.status(500).send(String(err));
  });
});

app.get('/api/metrics', (_req, res) => {
  register.metrics().then(metrics => {
    res.set('Content-Type', register.contentType);
    res.send(metrics);
  }).catch(err => {
    res.status(500).send(String(err));
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const rawName = String(req.body?.name || '').trim();
    const name = normalizeName(rawName);
    const rawEmail = req.body?.email ? String(req.body.email).trim() : '';
    const email = rawEmail ? normalizeEmail(rawEmail) : undefined;
    const password = String(req.body?.password || '');

    if (!name || password.length < 8) {
      return res.status(400).json({ error: 'Name and a password of at least 8 characters are required.' });
    }

    const allUsers = await prisma.user.findMany();
    const existingByName = allUsers.find(u => u.name.toLowerCase() === name.toLowerCase());
    const existingByEmail = email ? allUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase()) : null;

    if (existingByName || existingByEmail) {
      return res.status(409).json({ error: 'User already exists.' });
    }

    const user = await prisma.user.create({
      data: {
        id: createId('u'),
        name,
        email: email || null,
        password: await hashPassword(password),
        avatar: createAvatar(name),
      },
    });

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email || undefined,
        avatar: user.avatar || undefined,
        paynowHandle: (user as unknown as { paynowHandle?: string | null }).paynowHandle || undefined,
        preferredCurrency: (user as unknown as { preferredCurrency?: string | null }).preferredCurrency || 'S$',
        notificationEmail: (user as unknown as { notificationEmail?: boolean | null }).notificationEmail ?? true,
        notificationPush: (user as unknown as { notificationPush?: boolean | null }).notificationPush ?? true,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: `Registration error: ${message}` });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required.' });
    }

    const allUsers = await prisma.user.findMany();
    const matchedUser = allUsers.find(u => 
      u.name.toLowerCase() === identifier || 
      (u.email && u.email.toLowerCase() === identifier)
    );

    if (!matchedUser || !(await verifyPassword(password, matchedUser.password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    return res.json({
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email || undefined,
        avatar: matchedUser.avatar || undefined,
        paynowHandle: matchedUser.paynowHandle || undefined,
        preferredCurrency: matchedUser.preferredCurrency || 'S$',
        notificationEmail: matchedUser.notificationEmail ?? true,
        notificationPush: matchedUser.notificationPush ?? true,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

app.get('/api/app/:userId', async (req, res) => {
  const state = await buildAppState(prisma, req.params.userId);

  if (!state) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json(state);
});

app.put('/api/users/:id/profile', async (req, res) => {
  const userId = req.params.id;
  const { name, avatar, paynowHandle, preferredCurrency, notificationEmail, notificationPush } = req.body || {};

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const newName = name ? normalizeName(String(name)) : user.name;
  const newAvatar = avatar !== undefined ? String(avatar) : user.avatar;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: newName,
      avatar: newAvatar,
      paynowHandle: paynowHandle !== undefined ? (paynowHandle ? String(paynowHandle).trim() : null) : user.paynowHandle,
      preferredCurrency: preferredCurrency !== undefined ? String(preferredCurrency) : user.preferredCurrency,
      notificationEmail: notificationEmail !== undefined ? Boolean(notificationEmail) : user.notificationEmail,
      notificationPush: notificationPush !== undefined ? Boolean(notificationPush) : user.notificationPush,
    },
  });

  // Sync updated name and avatar to all linked friend placeholders
  await prisma.friend.updateMany({
    where: { linkedUserId: userId },
    data: {
      name: newName,
      ...(avatar !== undefined ? { avatar: newAvatar } : {}),
    },
  }).catch(() => {});

  return res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email || undefined,
    avatar: updated.avatar || undefined,
    paynowHandle: updated.paynowHandle || undefined,
    preferredCurrency: updated.preferredCurrency || 'S$',
    notificationEmail: updated.notificationEmail ?? true,
    notificationPush: updated.notificationPush ?? true,
  });
});

app.get('/api/groups/:id/public', async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });

  if (!group) {
    return res.status(404).json({ error: 'Group not found.' });
  }

  const memberIds = parseStringArray(group.memberIds);
  const virtualMembers = await prisma.friend.findMany({
    where: { ownerId: null, isVirtual: true, id: { in: memberIds } },
    orderBy: { createdAt: 'asc' },
  });

  return res.json({
    group: {
      id: group.id,
      name: group.name,
      type: group.type,
      memberIds,
    },
    virtualMembers: virtualMembers.map(member => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      isVirtual: member.isVirtual,
    })),
  });
});

async function resolveMemberIds(rawMemberIds: string[]): Promise<string[]> {
  const allUsers = await prisma.user.findMany();
  const allFriends = await prisma.friend.findMany({ where: { id: { in: rawMemberIds } } });
  const resolved: string[] = [];

  for (const id of rawMemberIds) {
    if (id.startsWith('u_')) {
      resolved.push(id);
      continue;
    }

    const friend = allFriends.find(f => f.id === id);
    if (friend) {
      let matchedUser = friend.linkedUserId ? allUsers.find(u => u.id === friend.linkedUserId) : null;
      if (!matchedUser && friend.email) {
        matchedUser = allUsers.find(u => u.email && u.email.toLowerCase() === friend.email!.toLowerCase());
      }
      if (!matchedUser) {
        matchedUser = allUsers.find(u => u.name.toLowerCase() === friend.name.toLowerCase());
      }

      if (matchedUser) {
        resolved.push(matchedUser.id);
        continue;
      }
    }

    resolved.push(id);
  }

  return [...new Set(resolved)];
}

app.post('/api/friends', async (req, res) => {
  const userId = String(req.body?.userId || '');
  const rawInput = String(req.body?.name || '').trim();
  const name = normalizeName(rawInput);
  const email = normalizeEmail(req.body?.email);

  if (!userId || !rawInput) {
    return res.status(400).json({ error: 'userId and name or User ID are required.' });
  }

  const allUsers = await prisma.user.findMany();
  const matchedUser = allUsers.find(u =>
    u.id === rawInput ||
    u.name.toLowerCase() === name.toLowerCase() ||
    (email && u.email && u.email.toLowerCase() === email)
  );

  const friendName = matchedUser ? matchedUser.name : name;

  const friend = await prisma.friend.create({
    data: {
      id: createId('f'),
      ownerId: userId,
      linkedUserId: matchedUser ? matchedUser.id : null,
      name: friendName,
      email: email || (matchedUser?.email || null),
      avatar: matchedUser?.avatar || createAvatar(friendName),
      isVirtual: false,
    },
  });

  return res.status(201).json(friend);
});

app.delete('/api/friends/:id', async (req, res) => {
  const { id } = req.params;
  const userId = String(req.headers['x-user-id'] || req.body?.userId || req.query?.userId || '');

  const friend = await prisma.friend.findUnique({ where: { id } });

  if (!friend) {
    // If not found as friend ID, check if id is a user ID
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Friend not found.' });
    }
  }

  // Check if involved in active expenses with userId
  if (userId) {
    const userExpenses = await prisma.expense.findMany({
      where: {
        OR: [
          { paidBy: userId },
          { paidBy: id },
        ],
      },
    });

    let netBal = 0;
    for (const exp of userExpenses) {
      if (exp.kind === 'payment') continue;
      const splitWith = parseStringArray(exp.splitWith);
      const participants = [...new Set([exp.paidBy, ...splitWith])];
      if (!participants.includes(userId) || !participants.includes(id)) continue;
      const share = exp.amount / participants.length;

      if (exp.paidBy === userId) {
        netBal += share;
      } else if (exp.paidBy === id) {
        netBal -= share;
      }
    }

    if (Math.abs(netBal) > 0.01) {
      return res.status(409).json({
        error: `Cannot delete friend with an unsettled balance ($${Math.abs(netBal).toFixed(2)}). Settle up first!`,
      });
    }
  }

  // Delete friend record(s) matching id owned by userId or with matching ID
  await prisma.friend.deleteMany({
    where: {
      OR: [
        { id },
        { ownerId: userId, linkedUserId: id },
      ],
    },
  }).catch(() => {});

  return res.json({ ok: true });
});

app.post('/api/groups', async (req, res) => {
  const userId = String(req.body?.userId || '');
  const name = normalizeName(req.body?.name || '');
  const type = String(req.body?.type || 'other');
  const memberIds = parseStringArray(req.body?.memberIds);

  if (!userId || !name) {
    return res.status(400).json({ error: 'userId and name are required.' });
  }

  const resolvedMembers = await resolveMemberIds([userId, ...memberIds]);

  const group = await prisma.group.create({
    data: {
      id: createId('g'),
      name,
      type,
      currency: '$',
      createdById: userId,
      memberIds: toJsonArray(resolvedMembers),
      adminIds: toJsonArray([userId]),
    },
  });

  await prisma.activity.create({
    data: {
      id: createId('a'),
      type: 'group_created',
      description: `You created group "${name}"`,
      date: 'Just now',
      userId,
      groupId: group.id,
    },
  });

  return res.status(201).json(group);
});

app.post('/api/groups/join', async (req, res) => {
  const userId = String(req.body?.userId || '');
  const identifier = String(req.body?.identifier || '').trim();
  const claimMemberId = req.body?.claimMemberId ? String(req.body.claimMemberId) : '';

  if (!userId || !identifier) {
    return res.status(400).json({ error: 'userId and identifier are required.' });
  }

  const group =
    (await prisma.group.findUnique({ where: { id: identifier } })) ||
    (await prisma.group.findFirst({ where: { name: identifier } }));

  if (!group) {
    return res.status(404).json({ error: 'Group not found.' });
  }

  const memberIds = parseStringArray(group.memberIds);
  let matchId = claimMemberId || '';

  if (!matchId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const placeholders = await prisma.friend.findMany({
      where: { ownerId: null, isVirtual: true, id: { in: memberIds } },
    });
    const potentialMatch = placeholders.find(friend => friend.name.toLowerCase() === (user?.name || '').toLowerCase());
    matchId = potentialMatch?.id || '';
  }

  if (matchId) {
    await prisma.group.update({
      where: { id: group.id },
      data: {
        memberIds: toJsonArray([...new Set(memberIds.map(id => (id === matchId ? userId : id)).concat(userId))]),
      },
    });

    await prisma.expense.updateMany({
      where: { paidBy: matchId },
      data: { paidBy: userId },
    });

    const expensesToPatch = await prisma.expense.findMany();
    await Promise.all(
      expensesToPatch
        .filter(expense => parseStringArray(expense.splitWith).includes(matchId))
        .map(expense =>
          prisma.expense.update({
            where: { id: expense.id },
            data: {
              splitWith: toJsonArray(parseStringArray(expense.splitWith).map(id => (id === matchId ? userId : id))),
            },
          })
        )
    );

    await prisma.friend.delete({ where: { id: matchId } }).catch(() => {});
  } else if (!memberIds.includes(userId)) {
    await prisma.group.update({
      where: { id: group.id },
      data: {
        memberIds: toJsonArray([...memberIds, userId]),
      },
    });
  } else {
    return res.status(409).json({ error: 'Already a member.' });
  }

  await prisma.activity.create({
    data: {
      id: createId('a'),
      type: 'group_created',
      description: `You joined group "${group.name}"`,
      date: 'Just now',
      userId,
      groupId: group.id,
    },
  });

  return res.json({ ok: true });
});

app.post('/api/groups/:id/members', async (req, res) => {
  const newMemberIds = parseStringArray(req.body?.memberIds);
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });

  if (!group) {
    return res.status(404).json({ error: 'Group not found.' });
  }

  const existingMemberIds = parseStringArray(group.memberIds);
  const resolvedExisting = await resolveMemberIds(existingMemberIds);
  const resolvedNew = await resolveMemberIds(newMemberIds);

  const nextMemberIds = [...new Set([...resolvedExisting, ...resolvedNew])];
  const updated = await prisma.group.update({
    where: { id: group.id },
    data: { memberIds: toJsonArray(nextMemberIds) },
  });

  return res.json(updated);
});

app.post('/api/groups/:id/virtual-members', async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  const name = normalizeName(req.body?.name || '');

  if (!group) {
    return res.status(404).json({ error: 'Group not found.' });
  }

  if (!name) {
    return res.status(400).json({ error: 'name is required.' });
  }

  // Prevent duplicate member by name
  const existingMemberIds = parseStringArray(group.memberIds);
  const allUsers = await prisma.user.findMany();
  const allFriends = await prisma.friend.findMany();

  const existingNames = existingMemberIds.map(id => {
    const u = allUsers.find(user => user.id === id);
    if (u) return u.name.toLowerCase();
    const f = allFriends.find(friend => friend.id === id);
    if (f) return f.name.toLowerCase();
    return '';
  });

  if (existingNames.includes(name.toLowerCase())) {
    return res.status(409).json({ error: `A member named "${name}" is already in this group.` });
  }

  const placeholder = await prisma.friend.create({
    data: {
      id: createId('v'),
      ownerId: null,
      name,
      avatar: createAvatar(name),
      isVirtual: true,
    },
  });

  const updated = await prisma.group.update({
    where: { id: group.id },
    data: {
      memberIds: toJsonArray([...new Set([...existingMemberIds, placeholder.id])]),
    },
  });

  return res.status(201).json({ placeholder, group: updated });
});

app.delete('/api/groups/:id/members/:memberId', async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });

  if (!group) {
    return res.status(404).json({ error: 'Group not found.' });
  }

  const groupExpenses = await prisma.expense.findMany({
    where: { groupId: group.id },
  });

  const involvedInExpenses = groupExpenses.some(
    expense =>
      expense.paidBy === req.params.memberId ||
      parseStringArray(expense.splitWith).includes(req.params.memberId)
  );

  if (involvedInExpenses) {
    return res.status(409).json({
      error: 'Cannot remove member who has logged expenses in this group. Settle or delete their expenses first.',
    });
  }

  const nextMemberIds = parseStringArray(group.memberIds).filter(memberId => memberId !== req.params.memberId);
  const updated = await prisma.group.update({
    where: { id: group.id },
    data: { memberIds: toJsonArray(nextMemberIds) },
  });

  return res.json(updated);
});

app.post('/api/groups/:id/admins', async (req, res) => {
  const { id } = req.params;
  const requesterId = String(req.body?.userId || req.headers['x-user-id'] || '');
  const targetMemberId = String(req.body?.targetMemberId || '');

  if (!requesterId || !targetMemberId) {
    return res.status(400).json({ error: 'userId and targetMemberId are required.' });
  }

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) {
    return res.status(404).json({ error: 'Group not found.' });
  }

  const memberIds = parseStringArray(group.memberIds);
  if (!memberIds.includes(targetMemberId)) {
    return res.status(400).json({ error: 'Target user is not a member of this group.' });
  }

  const rawAdmins = parseStringArray((group as unknown as { adminIds?: unknown }).adminIds);
  const currentAdmins = rawAdmins.length > 0 ? rawAdmins : (group.createdById ? [group.createdById] : []);

  if (!currentAdmins.includes(requesterId) && group.createdById !== requesterId) {
    return res.status(403).json({ error: 'Only group admins can make people admin.' });
  }

  if (!currentAdmins.includes(targetMemberId)) {
    currentAdmins.push(targetMemberId);
  }

  const updated = await prisma.group.update({
    where: { id },
    data: { adminIds: toJsonArray(currentAdmins) },
  });

  return res.json(updated);
});

app.delete('/api/groups/:id/admins/:memberId', async (req, res) => {
  const { id, memberId } = req.params;
  const requesterId = String(req.headers['x-user-id'] || req.body?.userId || req.query?.userId || '');

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) {
    return res.status(404).json({ error: 'Group not found.' });
  }

  const rawAdmins = parseStringArray((group as unknown as { adminIds?: unknown }).adminIds);
  const currentAdmins = rawAdmins.length > 0 ? rawAdmins : (group.createdById ? [group.createdById] : []);

  if (requesterId && !currentAdmins.includes(requesterId) && group.createdById !== requesterId) {
    return res.status(403).json({ error: 'Only group admins can remove admin permissions.' });
  }

  if (currentAdmins.length <= 1) {
    return res.status(400).json({ error: 'Cannot remove the last remaining admin of the group.' });
  }

  const nextAdmins = currentAdmins.filter(a => a !== memberId);
  const updated = await prisma.group.update({
    where: { id },
    data: { adminIds: toJsonArray(nextAdmins) },
  });

  return res.json(updated);
});

app.post('/api/expenses', async (req, res) => {
  const userId = String(req.body?.userId || '');
  const description = String(req.body?.description || '').trim();
  const amount = Number(req.body?.amount || 0);
  const category = String(req.body?.category || 'other');
  const paidBy = String(req.body?.paidBy || userId);
  const splitWith = parseStringArray(req.body?.splitWith);
  const groupId = req.body?.groupId ? String(req.body.groupId) : null;

  if (!userId || !description || !amount) {
    return res.status(400).json({ error: 'Missing expense fields.' });
  }

  const expense = await prisma.expense.create({
    data: {
      id: createId('e'),
      description,
      amount,
      paidBy,
      date: new Date().toISOString().split('T')[0],
      category,
      kind: 'expense',
      splitWith: toJsonArray(splitWith),
      groupId,
    },
  });

  await prisma.activity.create({
    data: {
      id: createId('a'),
      type: 'expense_added',
      description: `Expense "${description}" added`,
      amount,
      date: 'Just now',
      userId,
      groupId,
    },
  });

  return res.status(201).json(expense);
});

app.put('/api/expenses/:id', async (req, res) => {
  const userId = String(req.body?.userId || req.headers['x-user-id'] || '');
  const expense = req.body?.expense;

  if (!userId || !expense) {
    return res.status(400).json({ error: 'userId and expense are required.' });
  }

  const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Expense or payment not found.' });
  }

  // Permission Check: Must be creator/payer of expense OR group admin (createdById)
  let isGroupAdmin = false;
  if (existing.groupId) {
    const group = await prisma.group.findUnique({ where: { id: existing.groupId } });
    if (group && (group.createdById === userId || (group as unknown as { createdBy?: string }).createdBy === userId)) {
      isGroupAdmin = true;
    }
  }

  if (existing.paidBy !== userId && !isGroupAdmin) {
    return res.status(403).json({ error: 'Permission denied. Only the expense creator or group admin can edit this.' });
  }

  const updated = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      description: String(expense.description || ''),
      amount: Number(expense.amount || 0),
      paidBy: String(expense.paidBy || ''),
      date: String(expense.date || ''),
      category: String(expense.category || 'other'),
      kind: String(expense.kind || 'expense'),
      splitWith: toJsonArray(parseStringArray(expense.splitWith)),
      groupId: expense.groupId ? String(expense.groupId) : null,
    },
  });

  await prisma.activity.create({
    data: {
      id: createId('a'),
      type: 'expense_added',
      description: `Expense "${updated.description}" updated`,
      amount: updated.amount,
      date: 'Just now',
      userId,
      groupId: updated.groupId,
    },
  });

  return res.json(updated);
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const userId = String(req.headers['x-user-id'] || req.query.userId || req.body?.userId || '');

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Expense or payment not found.' });
  }

  // Permission Check: Allow payer, participant in splitWith, group member, or group admin
  let canDelete = false;
  if (!userId) {
    canDelete = true;
  } else if (existing.paidBy === userId) {
    canDelete = true;
  } else {
    const splitWith = parseStringArray(existing.splitWith);
    if (splitWith.includes(userId)) {
      canDelete = true;
    } else if (existing.groupId) {
      const group = await prisma.group.findUnique({ where: { id: existing.groupId } });
      if (group) {
        const members = parseStringArray(group.memberIds);
        if (members.includes(userId) || group.createdById === userId) {
          canDelete = true;
        }
      }
    }
  }

  if (!canDelete) {
    return res.status(403).json({ error: 'Permission denied. Only participants or group members can delete this.' });
  }

  await prisma.expense.delete({ where: { id } });

  if (userId) {
    await prisma.activity.create({
      data: {
        id: createId('a'),
        type: 'expense_added',
        description: `Deleted ${existing.kind === 'payment' ? 'payment' : 'expense'} "${existing.description}"`,
        amount: existing.amount,
        date: 'Just now',
        userId,
        groupId: existing.groupId,
      },
    });
  }

  return res.json({ ok: true });
});

app.post('/api/settlements', async (req, res) => {
  const userId = String(req.body?.userId || '');
  const fromUserId = String(req.body?.fromUserId || '');
  const toUserId = String(req.body?.toUserId || '');
  const amount = Number(req.body?.amount || 0);
  const groupId = req.body?.groupId ? String(req.body.groupId) : null;

  if (!userId || !fromUserId || !toUserId || !amount) {
    return res.status(400).json({ error: 'Missing settlement fields.' });
  }

  const payment = await prisma.expense.create({
    data: {
      id: createId('p'),
      description: 'Payment (Pending Confirmation)',
      amount,
      paidBy: fromUserId,
      date: new Date().toISOString().split('T')[0],
      category: 'other',
      kind: 'payment',
      status: 'pending',
      splitWith: toJsonArray([toUserId]),
      groupId,
    },
  });

  const resolveName = async (id: string) => {
    if (id === userId) return 'You';
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) return user.name;
    const friend = await prisma.friend.findUnique({ where: { id } });
    if (friend) return friend.name;
    return 'Someone';
  };

  const fromName = await resolveName(fromUserId);
  const toName = await resolveName(toUserId);

  await prisma.activity.create({
    data: {
      id: createId('a'),
      type: 'payment',
      description: `${fromName} recorded payment to ${toName} (Pending Confirmation)`,
      amount,
      date: 'Just now',
      userId,
      groupId,
      status: 'pending',
    },
  });

  return res.status(201).json(payment);
});

app.post('/api/settlement/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.kind !== 'payment') {
    return res.status(404).json({ error: 'Settlement payment not found.' });
  }

  await prisma.expense.update({
    where: { id },
    data: {
      description: 'Payment',
      status: 'confirmed',
    },
  });

  return res.json({ ok: true });
});

app.post('/api/settlement/:id/reject', async (req, res) => {
  const { id } = req.params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.kind !== 'payment') {
    return res.status(404).json({ error: 'Settlement payment not found.' });
  }

  await prisma.expense.update({
    where: { id },
    data: {
      description: 'Payment (Rejected)',
      status: 'rejected',
    },
  });

  return res.json({ ok: true });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  void _next;
  console.error(error);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
