'use client';

import { useState } from 'react';

interface FeedbackButtonProps {
  page?: string;
}

export function FeedbackButton({ page }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'bug' | 'feature'>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          description,
          page,
          url: typeof window !== 'undefined' ? window.location.href : ''
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setTitle('');
          setDescription('');
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit');
      }
    } catch (e) {
      setError('Failed to submit');
    } finally {
      setLoading(false);
    }
  };
  
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg z-50"
        title="Feedback"
      >
        💬
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-80 bg-slate-800 rounded-lg shadow-xl z-50 border border-slate-700">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold">Send Feedback</h3>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">✕</button>
        </div>
        
        {success ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-green-400">Feedback submitted!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex-1 py-1 px-2 rounded text-sm ${type === 'bug' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                🐛 Bug
              </button>
              <button
                type="button"
                onClick={() => setType('feature')}
                className={`flex-1 py-1 px-2 rounded text-sm ${type === 'feature' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                ✨ Feature
              </button>
            </div>
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short title"
              className="w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2"
              required
            />
            
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'bug' ? 'Describe the bug and steps to reproduce...' : 'Describe the feature request...'}
              className="w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2"
              rows={4}
              required
            />
            
            {page && (
              <div className="text-xs text-slate-400">
                Reporting from: <span className="text-slate-300">{page}</span>
              </div>
            )}
            
            {error && <div className="text-red-400 text-sm">{error}</div>}
            
            <button
              type="submit"
              disabled={loading || !title.trim() || !description.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white py-2 rounded font-semibold"
            >
              {loading ? 'Sending...' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}