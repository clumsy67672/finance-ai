'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    const payload = {
      username: formData.get('username'),
      password: formData.get('password')
    };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Authentication failed');
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-900">Username</label>
        <input
          name="username"
          className="mt-1 w-full input"
          placeholder="yourname"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-900">Password</label>
        <input
          type="password"
          name="password"
          className="mt-1 w-full input"
          placeholder="••••••••"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
        />
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        className="btn btn-primary w-full py-2"
        disabled={loading}
      >
        {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>
    </form>
  );
}