import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, X, Check, LogIn, UserPlus, Users, UserCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/utils';
import { useApp } from '../context/AppContext';
import type { GroupType, Friend } from '../types';
import { formatAmount, formatBalance, round2 } from '../utils/currency';

import { NotificationButton } from '../components/NotificationModal';
import { useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';

const groupTypes: GroupType[] = ['apartment', 'trip', 'food', 'entertainment', 'other'];

export default function Groups() {
  const navigate = useNavigate();
  const { createGroup, joinGroup, friends, groups, addFriend, deleteFriend, addMembersToGroup } = useApp();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'groups' | 'friends'>('groups');
  const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null);
  const [isDeletingFriend, setIsDeletingFriend] = useState(false);

  // Group modals state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<GroupType>('other');
  const [joinIdentifier, setJoinIdentifier] = useState('');
  const [selectedFriendsForNewGroup, setSelectedFriendsForNewGroup] = useState<string[]>([]);

  // Friend modals state
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [inviteFriendTarget, setInviteFriendTarget] = useState<Friend | null>(null);
  const [selectedGroupsForFriend, setSelectedGroupsForFriend] = useState<string[]>([]);
  const [isAddingToGroup, setIsAddingToGroup] = useState(false);
  const [friendFilter, setFriendFilter] = useState<'unsettled' | 'all'>('unsettled');

  const totalOwedToYou = round2(groups.reduce((acc, group) => group.balance > 0.005 ? acc + group.balance : acc, 0));
  const totalYouOwe = round2(groups.reduce((acc, group) => group.balance < -0.005 ? acc + Math.abs(group.balance) : acc, 0));

  const getGroupIcon = (type: GroupType) => {
    switch (type) {
      case 'apartment': return '🏠';
      case 'trip': return '✈️';
      case 'food': return '🍱';
      case 'entertainment': return '🎬';
      default: return '👥';
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    if (selectedFriendsForNewGroup.includes(friendId)) {
      setSelectedFriendsForNewGroup(selectedFriendsForNewGroup.filter(id => id !== friendId));
    } else {
      setSelectedFriendsForNewGroup([...selectedFriendsForNewGroup, friendId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      await createGroup(newGroupName.trim(), newGroupType, selectedFriendsForNewGroup);
      setNewGroupName('');
      setNewGroupType('other');
      setSelectedFriendsForNewGroup([]);
      setShowCreateGroup(false);
      toast.success('Group created successfully!');
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group. Please try again.');
    }
  };

  const extractGroupId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/join\/([^/?\s]+)/);
    return match && match[1] ? match[1] : trimmed;
  };

  const handleJoinGroup = async () => {
    const cleanId = extractGroupId(joinIdentifier);
    if (!cleanId) return;

    try {
      const success = await joinGroup(cleanId);
      if (success) {
        setJoinIdentifier('');
        setShowJoinGroup(false);
        toast.success('Joined group successfully!');
        navigate(`/groups/${cleanId}`);
      } else {
        toast.error('Group not found, already joined, or invite invalid.');
      }
    } catch (error) {
      console.error('Failed to join group:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleAddFriend = async () => {
    if (!newFriendName.trim()) return;
    try {
      await addFriend(newFriendName.trim());
      setNewFriendName('');
      setShowAddFriend(false);
      toast.success('Friend added successfully!');
    } catch (error) {
      console.error('Failed to add friend:', error);
      toast.error('Failed to add friend.');
    }
  };

  const handleDeleteFriend = (friend: Friend) => {
    setFriendToDelete(friend);
  };

  const handleConfirmDeleteFriend = async () => {
    if (!friendToDelete) return;
    setIsDeletingFriend(true);
    try {
      const error = await deleteFriend(friendToDelete.id);
      if (error) {
        toast.error(error);
      } else {
        toast.success(`${friendToDelete.name} removed from friends`);
      }
    } catch {
      toast.error('Failed to remove friend.');
    } finally {
      setIsDeletingFriend(false);
      setFriendToDelete(null);
    }
  };

  const openInviteModal = (friend: Friend) => {
    setInviteFriendTarget(friend);
    // Pre-select groups the friend is NOT already in
    const availableGroups = groups.filter(g => !g.members.some(m => m.id === friend.id));
    setSelectedGroupsForFriend(availableGroups.length > 0 ? [availableGroups[0].id] : []);
  };

  const handleAddFriendToGroups = async () => {
    if (!inviteFriendTarget || selectedGroupsForFriend.length === 0) return;
    setIsAddingToGroup(true);
    try {
      for (const groupId of selectedGroupsForFriend) {
        await addMembersToGroup(groupId, [inviteFriendTarget.id]);
      }
      toast.success(`Added ${inviteFriendTarget.name} to selected group(s)!`);
      setInviteFriendTarget(null);
      setSelectedGroupsForFriend([]);
    } catch (error) {
      console.error('Failed to add friend to group:', error);
      toast.error('Failed to add friend to group.');
    } finally {
      setIsAddingToGroup(false);
    }
  };

  const toggleGroupForFriend = (groupId: string) => {
    if (selectedGroupsForFriend.includes(groupId)) {
      setSelectedGroupsForFriend(selectedGroupsForFriend.filter(id => id !== groupId));
    } else {
      setSelectedGroupsForFriend([...selectedGroupsForFriend, groupId]);
    }
  };

  return (
    <div className="p-6 pb-24 space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <header className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Groups & Friends</h1>
          <p className="text-gray-500 text-sm font-medium">Manage your shared expenses and contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationButton />
          {activeTab === 'groups' ? (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowJoinGroup(true)}
                className="px-3.5 h-10 bg-white border border-gray-200 text-gray-700 rounded-xl flex items-center gap-1.5 font-bold shadow-sm hover:bg-gray-50 transition-colors"
              >
                <LogIn size={18} />
                <span className="text-xs font-bold">Join</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateGroup(true)}
                className="px-3.5 h-10 bg-primary hover:bg-emerald-600 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md shadow-primary/20 transition-all"
              >
                <Plus size={18} />
                <span>Create Group</span>
              </motion.button>
            </>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddFriend(true)}
              className="px-3.5 h-10 bg-primary hover:bg-emerald-600 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md shadow-primary/20 transition-all"
            >
              <UserPlus size={18} />
              <span>Add Friend</span>
            </motion.button>
          )}
        </div>
      </header>

      {/* Segmented Sub-Tabs */}
      <div className="flex bg-gray-200/70 p-1 rounded-2xl max-w-xs">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'groups'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users size={16} />
          Groups ({groups.length})
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'friends'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserCheck size={16} />
          Friends ({friends.length})
        </button>
      </div>

      {/* Summary Cards */}
      <div className="flex gap-4">
        <Card className="flex-1 bg-emerald-50/70 border border-emerald-100 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">You're owed</p>
          <p className="text-xl font-bold text-emerald-600">{formatAmount(totalOwedToYou)}</p>
        </Card>
        <Card className="flex-1 bg-red-50/70 border border-red-100 p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">You owe</p>
          <p className="text-xl font-bold text-red-500">{formatAmount(totalYouOwe)}</p>
        </Card>
      </div>

      {/* TAB 1: GROUPS */}
      {activeTab === 'groups' && (
        <div className="space-y-3">
          {groups.length === 0 ? (
            <Card className="p-8 text-center text-gray-400 bg-gray-50 border-dashed border-2 border-gray-200 shadow-none">
              <Users size={36} className="mx-auto mb-2 opacity-40 text-primary" />
              <p className="font-bold text-gray-700 mb-1">No groups yet</p>
              <p className="text-xs mb-4">Create or join a group to start splitting expenses</p>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20"
              >
                Create your first group
              </button>
            </Card>
          ) : (
            groups.map((group) => {
              const groupBalInfo = formatBalance(group.balance, group.currency || '$');
              return (
                <Link to={`/groups/${group.id}`} key={group.id} className="block">
                  <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                      {getGroupIcon(group.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{group.name}</h3>
                      <div className="flex -space-x-2 mt-1">
                        {group.members.slice(0, 4).map((member) => (
                          <img
                            key={member.id}
                            src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=2563eb&color=ffffff&bold=true`}
                            alt={member.name}
                            className="w-6 h-6 rounded-full border-2 border-white object-cover bg-gray-200"
                          />
                        ))}
                        {group.members.length > 4 && (
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-bold">
                            +{group.members.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold ${groupBalInfo.isPositive ? 'text-emerald-600' : groupBalInfo.isNegative ? 'text-red-500' : 'text-gray-500'}`}>
                        {groupBalInfo.signedFormatted}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {groupBalInfo.text}
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: FRIENDS */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {/* Friend Filter Chips */}
          <div className="flex gap-2">
            <button
              onClick={() => setFriendFilter('unsettled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                friendFilter === 'unsettled'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Active Debts ($)
            </button>
            <button
              onClick={() => setFriendFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                friendFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Friends ({friends.length})
            </button>
          </div>

          {(() => {
            const filteredFriends = friendFilter === 'unsettled'
              ? friends.filter(f => Math.abs(f.balance) > 0.005)
              : friends;

            if (friends.length === 0) {
              return (
                <Card className="p-8 text-center text-gray-400 bg-gray-50 border-dashed border-2 border-gray-200 shadow-none">
                  <UserPlus size={36} className="mx-auto mb-2 opacity-40 text-primary" />
                  <p className="font-bold text-gray-700 mb-1">No friends added yet</p>
                  <p className="text-xs mb-4">Add friends to split bills and invite them to groups</p>
                  <button
                    onClick={() => setShowAddFriend(true)}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20"
                  >
                    Add a Friend
                  </button>
                </Card>
              );
            }

            if (filteredFriends.length === 0 && friendFilter === 'unsettled') {
              return (
                <Card className="p-6 text-center bg-emerald-50/60 border border-emerald-100 rounded-2xl shadow-sm flex items-center justify-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 font-bold">
                    ✓
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-emerald-950">All settled up!</p>
                    <p className="text-xs text-emerald-700">No active debts with any friends. Switch to "All Friends" to view your full friend list.</p>
                  </div>
                </Card>
              );
            }

            return filteredFriends.map((friend) => {
              const friendBalInfo = formatBalance(friend.balance);
              const inGroupCount = groups.filter(g => g.members.some(m => m.id === friend.id)).length;

              return (
                <Card key={friend.id} className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <img
                    src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=2563eb&color=ffffff&bold=true`}
                    alt={friend.name}
                    className="w-12 h-12 rounded-full object-cover bg-gray-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{friend.name}</h3>
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold shrink-0">
                        #{friend.id.slice(-5)}
                      </span>
                    </div>
                    <p className={`text-xs font-bold ${friendBalInfo.isPositive ? 'text-emerald-600' : friendBalInfo.isNegative ? 'text-red-500' : 'text-gray-500'}`}>
                      {friendBalInfo.text}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {inGroupCount > 0 ? `In ${inGroupCount} group(s)` : 'Not in any group yet'} • <span className="font-mono text-[9px]">{friend.id}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openInviteModal(friend)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-blue-200/60 transition-colors"
                    >
                      <UserPlus size={14} />
                      <span>Invite</span>
                    </button>
                    <button
                      onClick={() => handleDeleteFriend(friend)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-colors"
                      title={`Remove ${friend.name} from friends`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Card>
              );
            });
          })()}
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {/* Create Group Modal */}
        {showCreateGroup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40"
              onClick={() => setShowCreateGroup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] max-w-sm mx-auto bg-white rounded-2xl p-6 shadow-2xl z-50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Create Group</h3>
                <button onClick={() => setShowCreateGroup(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full rounded-xl border-gray-200 focus:border-primary focus:ring-primary px-3.5 py-2.5 border text-sm outline-none"
                    placeholder="e.g. Summer Trip"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {groupTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewGroupType(type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                          newGroupType === type
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add Friends</label>
                  <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-100 p-2 rounded-xl">
                    {friends.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No friends added yet</p>
                    ) : (
                      friends.map((friend) => (
                        <div
                          key={friend.id}
                          onClick={() => toggleFriendSelection(friend.id)}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedFriendsForNewGroup.includes(friend.id) ? 'bg-primary/10' : 'hover:bg-gray-50'
                          }`}
                        >
                          <img
                            src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=2563eb&color=ffffff&bold=true`}
                            alt={friend.name}
                            className="w-8 h-8 rounded-full bg-gray-200 object-cover"
                          />
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{friend.name}</span>
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
                              #{friend.id.slice(-5)}
                            </span>
                          </div>
                          {selectedFriendsForNewGroup.includes(friend.id) && (
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white">
                              <Check size={12} />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  className="w-full bg-primary hover:bg-emerald-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary/20 transition-all"
                >
                  Create Group
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* Join Group Modal */}
        {showJoinGroup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40"
              onClick={() => setShowJoinGroup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[20%] max-w-sm mx-auto bg-white rounded-2xl p-6 shadow-2xl z-50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Join Group</h3>
                <button onClick={() => setShowJoinGroup(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group ID or Invite Link</label>
                  <input
                    type="text"
                    value={joinIdentifier}
                    onChange={(e) => setJoinIdentifier(e.target.value)}
                    className="w-full rounded-xl border-gray-200 focus:border-primary focus:ring-primary px-3.5 py-2.5 border text-sm outline-none"
                    placeholder="Paste invite ID or link"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleJoinGroup}
                  disabled={!joinIdentifier.trim()}
                  className="w-full bg-primary hover:bg-emerald-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-primary/20 transition-all"
                >
                  Join Group
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* Add Friend Modal */}
        {showAddFriend && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40"
              onClick={() => setShowAddFriend(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[20%] max-w-sm mx-auto bg-white rounded-2xl p-6 shadow-2xl z-50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add Friend</h3>
                <button onClick={() => setShowAddFriend(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Friend Name or User ID (UID)</label>
                  <input
                    type="text"
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    placeholder="Enter friend name or User ID (e.g. u_12345678)"
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/40 outline-none text-sm font-mono"
                    autoFocus
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed bg-amber-50/80 p-2.5 rounded-xl border border-amber-100/80">
                    💡 <strong>Tip for users with duplicate names:</strong> Ask your friend to check their <strong>User ID (UID)</strong> under <em>Account ➔ Profile</em> and paste their exact <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200 text-amber-900">u_...</code> ID above!
                  </p>
                </div>
                <button
                  onClick={handleAddFriend}
                  disabled={!newFriendName.trim()}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none"
                >
                  Add Friend
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* Invite Friend to Group Modal */}
        {inviteFriendTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40"
              onClick={() => setInviteFriendTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[15%] max-w-sm mx-auto bg-white rounded-2xl p-6 shadow-2xl z-50"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add to Group</h3>
                  <p className="text-xs text-gray-500">Invite {inviteFriendTarget.name} to your groups</p>
                </div>
                <button onClick={() => setInviteFriendTarget(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {groups.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-xs mb-3">You don't have any groups yet.</p>
                    <button
                      onClick={() => {
                        setInviteFriendTarget(null);
                        setShowCreateGroup(true);
                      }}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
                    >
                      Create a Group First
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="block text-xs font-bold text-gray-600 uppercase">Select Groups:</label>
                    <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-100 p-2 rounded-xl">
                      {groups.map((group) => {
                        const isAlreadyMember = group.members.some(m => m.id === inviteFriendTarget.id);
                        const isSelected = selectedGroupsForFriend.includes(group.id);

                        return (
                          <div
                            key={group.id}
                            onClick={() => !isAlreadyMember && toggleGroupForFriend(group.id)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                              isAlreadyMember
                                ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                : isSelected
                                ? 'bg-blue-50/80 border border-blue-200/60 cursor-pointer'
                                : 'hover:bg-gray-50 cursor-pointer border border-transparent'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
                              {getGroupIcon(group.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-gray-900 block truncate">{group.name}</span>
                              <span className="text-[10px] text-gray-400">
                                {isAlreadyMember ? 'Already a member' : `${group.members.length} members`}
                              </span>
                            </div>
                            {isAlreadyMember ? (
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Joined</span>
                            ) : isSelected ? (
                              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                <Check size={12} />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleAddFriendToGroups}
                      disabled={selectedGroupsForFriend.length === 0 || isAddingToGroup}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all"
                    >
                      {isAddingToGroup ? 'Adding...' : `Add ${inviteFriendTarget.name} to Selected Group(s)`}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={Boolean(friendToDelete)}
        onClose={() => setFriendToDelete(null)}
        onConfirm={handleConfirmDeleteFriend}
        title="Remove Friend?"
        message={`Are you sure you want to remove ${friendToDelete?.name || 'this friend'} from your friends list?`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeletingFriend}
      />
    </div>
  );
}
