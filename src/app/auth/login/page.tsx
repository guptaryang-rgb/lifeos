'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res && !res.error) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError(res?.error || 'Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleLogin} className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-4">
      <h2 className="text-2xl font-bold text-center">Login</h2>
      
      {error && (
        <div id="login-error" className="bg-red-900 border border-red-700 text-red-100 p-2 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-teal-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-teal-500"
          required
        />
      </div>

      <button
        id="btn-login"
        type="submit"
        className="w-full bg-teal-600 hover:bg-teal-700 font-bold p-2 rounded transition-colors text-white"
      >
        Login
      </button>

      <p className="text-sm text-center text-slate-400 mt-2">
        Don't have an account?{' '}
        <span className="text-teal-400 hover:underline cursor-pointer" onClick={() => router.push('/auth/register')}>
          Sign Up
        </span>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
      <Suspense fallback={<div className="text-slate-400">Loading Form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
