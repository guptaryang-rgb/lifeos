'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (res.ok) {
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 1000);
    } else {
      const data = await res.json();
      setError(data.error || 'Registration failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
      <form onSubmit={handleRegister} className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-4">
        <h2 className="text-2xl font-bold text-center">Sign Up</h2>
        
        {error && (
          <div id="register-error" className="bg-red-900 border border-red-700 text-red-100 p-2 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div id="register-success" className="bg-green-900 border border-green-700 text-green-100 p-2 rounded text-sm">
            {success}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1">Full Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-teal-500"
            required
          />
        </div>

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
          id="btn-register"
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 font-bold p-2 rounded transition-colors text-white"
        >
          Sign Up
        </button>

        <p className="text-sm text-center text-slate-400 mt-2">
          Already have an account?{' '}
          <span className="text-teal-400 hover:underline cursor-pointer" onClick={() => router.push('/auth/login')}>
            Login
          </span>
        </p>
      </form>
    </div>
  );
}
