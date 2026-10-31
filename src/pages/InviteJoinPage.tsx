import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { motion } from 'framer-motion';
import type { User } from '../types';

type InviteGroup = {
  id: string;
  name: string;
  type: string;
  memberIds: string[];
};

type InvitePayload = {
  group: InviteGroup;
  virtualMembers: User[];
};

export default function InviteJoinPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, joinGroup } = useApp();
  const [isJoining, setIsJoining] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<InvitePayload | null | undefined>(undefined);

  useEffect(() => {
    const loadInvite = async () => {
      const cleanId = groupId ? groupId.trim().split('?')[0].split('#')[0] : '';
      if (!cleanId) {
        setInviteData(null);
        return;
      }

      try {
        const response = await fetch(`/api/groups/${encodeURIComponent(cleanId)}/public`);
        if (!response.ok) {
          setInviteData(null);
          return;
        }

        const payload = await response.json() as InvitePayload;
        setInviteData(payload);
      } catch (fetchError) {
        console.error('Failed to load invite:', fetchError);
        setInviteData(null);
      }
    };

    void loadInvite();
  }, [groupId]);

  const group = inviteData?.group;
  const virtualMembers = inviteData?.virtualMembers || [];

  const handleJoin = async (claimId?: string) => {
    if (!groupId || !currentUser) return;
    setIsJoining(true);
    setError('');
    try {
      const success = await joinGroup(groupId, claimId || undefined);
      if (success) {
        navigate(`/groups/${groupId}`);
      } else {
        setError('Failed to join group. Please try again.');
      }
    } catch (joinError) {
      console.error('Join error:', joinError);
      setError('An error occurred while joining.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login', { state: { from: location } });
  };

  const handleRegisterRedirect = () => {
    navigate('/register', { state: { from: location } });
  };

  if (inviteData === undefined) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Group Not Found</h2>
        <p className="text-gray-500 mb-6">The invite link might be invalid or expired.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-white px-6 py-2 rounded-lg font-medium"
        >
          Go Home
        </button>
      </div>
    );
  }

  const isMember = currentUser && group.memberIds.includes(currentUser.id);

  if (isMember) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 text-2xl">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You are already a member!</h2>
        <p className="text-gray-500 mb-6">You are already part of <strong>{group.name}</strong>.</p>
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="bg-primary text-white px-6 py-2 rounded-lg font-medium"
        >
          Go to Group
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
          👥
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Group</h1>
        <p className="text-gray-500 mb-8">
          You've been invited to join <strong>{group.name}</strong>.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {currentUser ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Joining as <strong>{currentUser.name}</strong> ({currentUser.email || 'No email'})
            </p>

            {virtualMembers.length > 0 && (
              <div className="text-left mb-6">
                <p className="text-sm font-bold text-gray-700 mb-2">Are you one of these members?</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {virtualMembers.map(member => (
                    <div
                      key={member.id}
                      onClick={() => setSelectedClaimId(selectedClaimId === member.id ? null : member.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                        selectedClaimId === member.id
                          ? 'bg-primary/5 border-primary ring-1 ring-primary'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <img
                        src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                        alt={member.name}
                        className="w-8 h-8 rounded-full bg-gray-200"
                      />
                      <span className="flex-1 text-sm font-medium">{member.name}</span>
                      {selectedClaimId === member.id && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {selectedClaimId && (
                  <p className="text-xs text-primary mt-2">
                    By selecting this profile, you will merge it with your account and inherit its expenses.
                  </p>
                )}
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleJoin(selectedClaimId || undefined)}
              disabled={isJoining}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {isJoining ? 'Joining...' : (selectedClaimId ? 'Claim & Join' : 'Join Group')}
            </motion.button>
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 font-medium text-sm hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Please login or create an account to join this group.
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLoginRedirect}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold"
            >
              Login to Join
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRegisterRedirect}
              className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50"
            >
              Create Account
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
