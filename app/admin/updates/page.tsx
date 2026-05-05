'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function UpdatesPage() {
  const { data: version } = useSWR('/api/version', fetcher);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Software Updates</h1>

        <div className="text-lg font-semibold">
          v{version?.version ?? '0.0.0'} • build {version?.build ?? 'unknown'}
        </div>

        <p className="text-gray-300">Branch: {version?.branch ?? 'main'}</p>
        <p className="text-gray-300">Portainer: {version?.portainerDetected ? 'Yes' : 'No'}</p>
        <p className="text-gray-300">Build: {version?.buildHash}</p>
      </div>
    </div>
  );
}