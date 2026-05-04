'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  role: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, campaignsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/campaigns'),
      ]);

      const userData = await userRes.json();
      const campaignsData = await campaignsRes.json();

      if (userData.user) {
        setUser(userData.user);
        setCampaigns(campaignsData.campaigns || []);
      } else {
        router.push('/');
      }
    } catch (e) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns(campaigns.filter(c => c.id !== id));
        setShowDelete(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">⚔️ AI D&D Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome back!</h2>
          <p className="text-slate-400">Manage your campaigns or start a new adventure.</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Create Campaign */}
          <button
            onClick={() => router.push('/campaign/new')}
            className="p-6 bg-purple-600 hover:bg-purple-700 rounded-lg text-left transition"
          >
            <div className="text-3xl mb-2">⚔️</div>
            <div className="text-white font-semibold">Create Campaign</div>
            <div className="text-purple-200 text-sm">Start a new adventure</div>
          </button>

          {/* Browse Campaigns */}
          <button
            onClick={() => router.push('/campaigns')}
            className="p-6 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition"
          >
            <div className="text-3xl mb-2">📜</div>
            <div className="text-white font-semibold">My Campaigns</div>
            <div className="text-slate-400 text-sm">View & manage campaigns</div>
          </button>
          
          {/* Character Manager */}
          <button
            onClick={() => router.push('/characters')}
            className="p-6 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition"
          >
            <div className="text-3xl mb-2">🛡️</div>
            <div className="text-white font-semibold">Characters</div>
            <div className="text-slate-400 text-sm">Create & manage characters</div>
          </button>

          {/* Admin (only for admin) */}
          {user?.role === 'admin' && (
            <button
              onClick={() => router.push('/admin')}
              className="p-6 bg-amber-600 hover:bg-amber-700 rounded-lg text-left transition"
            >
              <div className="text-3xl mb-2">⚙️</div>
              <div className="text-white font-semibold">Admin</div>
              <div className="text-amber-200 text-sm">AI & user settings</div>
            </button>
          )}
        </div>

        {/* Recent Campaigns */}
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">Your Campaigns</h3>
          </div>
          
          {campaigns.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              No campaigns yet. Create your first campaign to get started!
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="px-6 py-4 flex justify-between items-center hover:bg-slate-700/50"
                >
                  <div className="flex-1">
                    <div className="text-white font-medium">{campaign.name}</div>
                    <div className="text-slate-400 text-sm">
                      Code: <span className="font-mono">{campaign.code}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/storyteller/${campaign.code}`)}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => setShowDelete(campaign.id)}
                      className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Delete Campaign?</h3>
            <p className="text-slate-400 mb-4">
              This will permanently delete the campaign and all its data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDelete(null)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDelete)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}