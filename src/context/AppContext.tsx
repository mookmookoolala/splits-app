/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Group, Friend, Activity, Expense, GroupType } from '../types';

interface AppState {
  currentUser: User | null;
  users: User[];
  friends: Friend[];
  groups: Group[];
  expenses: Expense[];
  activities: Activity[];
}

interface AppContextType extends AppState {
  isLoading: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => Promise<void>;
  addFriend: (name: string, email?: string) => Promise<void>;
  deleteFriend: (friendId: string) => Promise<string | null>;
  createGroup: (name: string, type: GroupType, memberIds: string[]) => Promise<void>;
  addMembersToGroup: (groupId: string, memberIds: string[]) => Promise<void>;
  addVirtualMemberToGroup: (groupId: string, name: string) => Promise<void>;
  joinGroup: (identifier: string, claimMemberId?: string) => Promise<boolean>;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (name: string, email: string | undefined, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  settleUp: (fromUserId: string, toUserId: string, amount: number, groupId?: string) => Promise<void>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<string | null>;
  makeGroupAdmin: (groupId: string, memberId: string) => Promise<void>;
  removeGroupAdmin: (groupId: string, memberId: string) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  confirmSettlement: (settlementId: string) => Promise<void>;
  rejectSettlement: (settlementId: string) => Promise<void>;
}

const emptyState: AppState = {
  currentUser: null,
  users: [],
  friends: [],
  groups: [],
  expenses: [],
  activities: [],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const apiRequest = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAppState = async (userId: string) => {
    const nextState = await apiRequest<AppState>(`/api/app/${userId}`);
    setState(nextState);
    return nextState;
  };

  useEffect(() => {
    const bootstrap = async () => {
      const userId = localStorage.getItem('userId');

      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        await refreshAppState(userId);
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('userId');
        setState(emptyState);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const requireUserId = () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('Not authenticated');
    }
    return userId;
  };

  const login = async (identifier: string, password: string): Promise<boolean> => {
    const normalizedIdentifier = identifier.trim();
    const normalizedPassword = password.trim();

    if (!normalizedIdentifier || !normalizedPassword) {
      return false;
    }

    try {
      const payload = await apiRequest<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: normalizedIdentifier, password: normalizedPassword }),
      });

      localStorage.setItem('userId', payload.user.id);
      await refreshAppState(payload.user.id);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (name: string, email: string | undefined, password: string): Promise<boolean> => {
    const normalizedName = name.trim();
    const normalizedPassword = password.trim();

    if (!normalizedName || !normalizedPassword) {
      return false;
    }

    try {
      const payload = await apiRequest<{ user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: normalizedName, email, password: normalizedPassword }),
      });

      localStorage.setItem('userId', payload.user.id);
      await refreshAppState(payload.user.id);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = async () => {
    localStorage.removeItem('userId');
    setState(emptyState);
  };

  const addFriend = async (name: string, email?: string) => {
    const userId = requireUserId();

    await apiRequest('/api/friends', {
      method: 'POST',
      body: JSON.stringify({ userId, name, email }),
    });

    await refreshAppState(userId);
  };

  const deleteFriend = async (friendId: string): Promise<string | null> => {
    const userId = requireUserId();

    try {
      await apiRequest(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
        },
      });
      await refreshAppState(userId);
      return null;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return 'Failed to delete friend.';
    }
  };

  const createGroup = async (name: string, type: GroupType, memberIds: string[]) => {
    const userId = requireUserId();

    await apiRequest('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ userId, name, type, memberIds }),
    });

    await refreshAppState(userId);
  };

  const addMembersToGroup = async (groupId: string, memberIds: string[]) => {
    const userId = requireUserId();

    await apiRequest(`/api/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    });

    await refreshAppState(userId);
  };

  const addVirtualMemberToGroup = async (groupId: string, name: string) => {
    const userId = requireUserId();

    await apiRequest(`/api/groups/${groupId}/virtual-members`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    await refreshAppState(userId);
  };

  const joinGroup = async (identifier: string, claimMemberId?: string): Promise<boolean> => {
    const userId = requireUserId();

    try {
      await apiRequest('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({ userId, identifier, claimMemberId }),
      });

      await refreshAppState(userId);
      return true;
    } catch (error) {
      console.error('Join group failed:', error);
      return false;
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'date'>) => {
    const userId = requireUserId();

    await apiRequest('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ userId, ...expense }),
    });

    await refreshAppState(userId);
  };

  const updateExpense = async (expense: Expense) => {
    const userId = requireUserId();

    await apiRequest(`/api/expenses/${expense.id}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, expense }),
    });

    await refreshAppState(userId);
  };

  const deleteExpense = async (id: string) => {
    const userId = requireUserId();

    await apiRequest(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': userId,
      },
    });

    await refreshAppState(userId);
  };

  const settleUp = async (fromUserId: string, toUserId: string, amount: number, groupId?: string) => {
    const userId = requireUserId();

    await apiRequest('/api/settlements', {
      method: 'POST',
      body: JSON.stringify({ userId, fromUserId, toUserId, amount, groupId }),
    });

    await refreshAppState(userId);
  };

  const removeMemberFromGroup = async (groupId: string, memberId: string): Promise<string | null> => {
    const userId = requireUserId();

    try {
      await apiRequest(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
      });
      await refreshAppState(userId);
      return null;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return 'Failed to remove member.';
    }
  };

  const makeGroupAdmin = async (groupId: string, memberId: string) => {
    const userId = requireUserId();

    await apiRequest(`/api/groups/${groupId}/admins`, {
      method: 'POST',
      body: JSON.stringify({ userId, targetMemberId: memberId }),
    });

    await refreshAppState(userId);
  };

  const removeGroupAdmin = async (groupId: string, memberId: string) => {
    const userId = requireUserId();

    await apiRequest(`/api/groups/${groupId}/admins/${memberId}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': userId,
      },
    });

    await refreshAppState(userId);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!state.currentUser) return;
    try {
      await apiRequest(`/api/users/${state.currentUser.id}/profile`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await refreshAppState(state.currentUser.id);
    } catch (error) {
      console.error('Failed to update profile:', error);
      const updatedUser = { ...state.currentUser, ...data };
      setState(prev => ({
        ...prev,
        currentUser: updatedUser,
        users: prev.users.map(u => (u.id === updatedUser.id ? updatedUser : u)),
      }));
    }
  };

  const confirmSettlement = async (settlementId: string) => {
    if (!state.currentUser) return;
    await apiRequest(`/api/settlement/${settlementId}/confirm`, { method: 'POST' });
    await refreshAppState(state.currentUser.id);
  };

  const rejectSettlement = async (settlementId: string) => {
    if (!state.currentUser) return;
    await apiRequest(`/api/settlement/${settlementId}/reject`, { method: 'POST' });
    await refreshAppState(state.currentUser.id);
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        isLoading,
        addExpense,
        addFriend,
        deleteFriend,
        createGroup,
        addMembersToGroup,
        addVirtualMemberToGroup,
        joinGroup,
        login,
        register,
        logout,
        settleUp,
        removeMemberFromGroup,
        makeGroupAdmin,
        removeGroupAdmin,
        updateExpense,
        deleteExpense,
        updateProfile,
        confirmSettlement,
        rejectSettlement,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
};
