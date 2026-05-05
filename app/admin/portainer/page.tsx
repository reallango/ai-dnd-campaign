'use client';

import { useState, useEffect } from 'react';

interface PortainerStatus {
  ok: boolean;
  reachable: boolean;
  apiUrl: string | null;
  error: string | null;
  missingEnv: string[] | null;
  tried: string[] | null;
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; missingEnv?: string[] } | null>(null);

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
        setMessage({ type: 'error', text: data.error || 'Update failed', missingEnv: data.missingEnv });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Request failed' });
    } finally {
      setUpdating(false);
    }
  };

  // Determine error states  
  const stackNotFound = status?.reachable && stack && !stack.ok && stack.error?.includes('No Git-based');
  const stackMultiple = status?.reachable && stack && !stack.ok && stack.error?.includes('Multiple Git-based');

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Portainer Integration</h1>

        {/* Status Section */}
        <div className="mb-6 p-4 bg-slate-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Portainer Status</h2>
          
          {/* Status error block with missingEnv */}
          {status && !status.ok && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 p-4 rounded mb-3">
              <div className="font-semibold mb-1">
                {status.error || "Portainer status error"}
              </div>

              {/* Show missing environment variables */}
              {status.missingEnv && status.missingEnv.length > 0 && (
                <div className="text-sm text-red-400">
                  Missing environment variables: {status.missingEnv.join(", ")}
                </div>
              )}

              {/* Show attempted URLs if provided */}
              {status.tried && status.tried.length > 0 && (
                <div className="text-sm text-red-400 mt-1">
                  Tried URLs:
                  <ul className="list-disc ml-5">
                    {status.tried.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            {/* New reachable display */}
            <div className="mt-2 text-sm">
              {status?.ok && status.reachable && (
                <span className="text-green-400">Portainer reachable</span>
              )}

              {!status?.ok && status?.missingEnv && status.missingEnv.length > 0 && (
                <span className="text-yellow-400">
                  Configuration incomplete — missing environment variables.
                </span>
              )}

              {!status?.ok && !status?.missingEnv && (
                <span className="text-red-400">
                  Portainer unreachable.
                </span>
              )}
            </div>

            {status?.apiUrl && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">API URL:</span>
                <code className="text-sm">{status.apiUrl}</code>
              </div>
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
                disabled={!status?.ok}
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
                <div>{message.text}</div>
                {message.missingEnv && message.missingEnv.length > 0 && (
                  <div className="mt-2 text-sm">
                    Missing environment variables: {message.missingEnv.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}