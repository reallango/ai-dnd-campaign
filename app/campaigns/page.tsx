'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (e) {
      console.error(e);
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-slate-400 hover:text-white"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-white">My Campaigns</h1>
          </div>
          <button
            onClick={() => router.push('/campaign/new')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
          >
            + New Campaign
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📜</div>
            <h2 className="text-xl text-white mb-2">No campaigns yet</h2>
            <p className="text-slate-500 mb-4">Create your first campaign to get started!</p>
            <button
              onClick={() => router.push('/campaign/new')}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700/50 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                  <button
                    onClick={() => setShowDelete(campaign.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  DM: {campaign.dm_name}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/storyteller/${campaign.code}`)}
                    className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => router.push(`/player/${campaign.code}`)}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
                  >
                    Player View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Delete Campaign?</h3>
            <p className="text-slate-400 mb-4">
              This will permanently delete the campaign. This cannot be undone.
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