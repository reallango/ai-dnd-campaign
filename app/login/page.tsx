'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkFirstTime();
  }, []);

  const checkFirstTime = async () => {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      setIsFirstTime(data.needsSetup);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isFirstTime) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (password.length < 4) {
        setError('Password must be at least 4 characters');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, isFirstTime }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save auth token
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-md">
        <div className="loading-spinner" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-md">
      <div className="container" style={{ maxWidth: '400px' }}>
        <div className="text-center mb-lg animate-slide-up">
          <h1 className="text-gold mb-sm">{isFirstTime ? '⚙️ Setup Admin' : '🔐 Login'}</h1>
          <p className="text-secondary">
            {isFirstTime ? 'Create your admin account' : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card animate-slide-up">
          <div className="flex flex-col gap-md">
            <div>
              <label className="block text-secondary mb-sm">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-secondary mb-sm">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
                required
              />
            </div>

            {isFirstTime && (
              <div>
                <label className="block text-secondary mb-sm">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full"
                  required
                />
              </div>
            )}

            {error && <div className="text-crimson text-center">{error}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Please wait...' : isFirstTime ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </form>

        <footer className="footer">
          <p className="text-muted">
            <a href="/" className="text-gold">← Back to Home</a>
          </p>
        </footer>
      </div>
    </main>
  );
}