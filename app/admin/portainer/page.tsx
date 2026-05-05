'use client';

import { useState, useEffect } from 'react';

interface PortainerStatus {
  ok: boolean;
  reachable: boolean;
  apiUrl: string | null;
  error: string | null;
  missingEnv: string[] | null;
}

interface StackInfo {
  ok: boolean;
  id?: number;
  name?: string;
  repoUrl?: string;
  branch?: string;
  webhooks?: string[];
  error?: string;
  missingEnv?: string[];
}

export default function PortainerPage() {
  const [status, setStatus] = useState<PortainerStatus | null>(null);
  const [stack, setStack] = useState<StackInfo | null>(null);
  const [branch, setBranch] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canUpdate = status?.ok && stack?.ok && stack.name && branch.trim() && !updating;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load status
      const statusRes = await fetch('/api/portainer/status');
      const statusData = await statusRes.json();
      setStatus(statusData);

      // Load stack info if reachable
      if (statusData.reachable) {
        const stackRes = await fetch('/api/portainer/stack');
        const stackData = await stackRes.json();
        setStack(stackData);
      } else {
        setStack(null);
      }
    } catch (err) {
      console.error('Failed to load Portainer data:', err);
    }
  };

  const handleUpdate = async () => {
    if (!canUpdate) return;

    setUpdating(true);
    setMessage(null);

    try {
      const res = await fetch('/api/portainer/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: branch.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || 'Update failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Request failed' });
    } finally {
      setUpdating(false);
    }
  };

  // Determine error states
  const tokenMissing = status?.missingEnv?.includes('PORTAINER_API_TOKEN') ?? false;
  const apiUrlMissing = !status?.reachable && status?.error?.includes('Unable to detect');
  const stackNotFound = status?.reachable && stack && !stack.ok && stack.error?.includes('not found');
  const stackMultiple = status?.reachable && stack && !stack.ok && stack.error?.includes('Multiple');

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Portainer Integration</h1>

        {/* Error Messages */}
        {tokenMissing && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
            <p className="text-red-400 font-semibold">Missing Portainer API token</p>
            <p className="text-red-300 text-sm mt-1">Set environment variable: PORTAINER_API_TOKEN</p>
          </div>
        )}

        {apiUrlMissing && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
            <p className="text-red-400 font-semibold">Unable to detect Portainer API URL</p>
            <p className="text-red-300 text-sm mt-1">Set PORTAINER_API_URL or fix network connectivity.</p>
          </div>
        )}

        {stackNotFound && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
            <p className="text-red-400 font-semibold">Unable to auto-detect stack</p>
            <p className="text-red-300 text-sm mt-1">Set PORTAINER_STACK_ID or PORTAINER_STACK_NAME.</p>
          </div>
        )}

        {stackMultiple && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
            <p className="text-red-400 font-semibold">Multiple stacks match this repo</p>
            <p className="text-red-300 text-sm mt-1">Set PORTAINER_STACK_ID or PORTAINER_STACK_NAME to disambiguate.</p>
          </div>
        )}

        {/* Status Section */}
        <div className="mb-6 p-4 bg-slate-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Portainer Status</h2>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Status:</span>
              <span className={status?.reachable ? 'text-green-400' : 'text-red-400'}>
                {status ? (status.reachable ? 'Reachable' : 'Not reachable') : 'Loading...'}
              </span>
            </div>

            {status?.apiUrl && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">API URL:</span>
                <code className="text-sm">{status.apiUrl}</code>
              </div>
            )}

            {status?.error && (
              <div className="text-red-400 text-sm">{status.error}</div>
            )}
          </div>
        </div>

        {/* Stack Section */}
        <div className="mb-6 p-4 bg-slate-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Target Stack</h2>
          
          {!status?.reachable ? (
            <div className="text-slate-400">Portainer not reachable</div>
          ) : stack?.ok && stack.name ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Name:</span>
                <span>{stack.name}</span>
              </div>
              
              {stack.id !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">ID:</span>
                  <code className="text-sm">{stack.id}</code>
                </div>
              )}
              
              {stack.repoUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Repo URL:</span>
                  <code className="text-sm">{stack.repoUrl}</code>
                </div>
              )}
              
              {stack.branch && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Current Branch:</span>
                  <code className="text-sm">{stack.branch}</code>
                </div>
              )}
              
              {stack.webhooks && stack.webhooks.length > 0 && (
                <div className="mt-2">
                  <span className="text-slate-400 text-sm">Webhooks:</span>
                  {stack.webhooks.map((url, i) => (
                    <code key={i} className="block text-xs text-slate-500 mt-1">{url}</code>
                  ))}
                </div>
              )}
            </div>
          ) : stack?.error ? (
            <div className="text-red-400 text-sm">{stack.error}</div>
          ) : (
            <div className="text-slate-400">Loading stack info...</div>
          )}
        </div>

        {/* Update Section */}
        <div className="mb-6 p-4 bg-slate-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Update Stack</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Branch name</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g., main, stable, dev"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500"
                disabled={!status?.reachable}
              />
            </div>

            <button
              onClick={handleUpdate}
              disabled={!canUpdate}
              className={`px-4 py-2 rounded ${
                canUpdate
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-slate-600 cursor-not-allowed'
              }`}
            >
              {updating ? 'Updating...' : 'Update Stack'}
            </button>

            {message && (
              <div className={`p-3 rounded ${
                message.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
              }`}>
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}