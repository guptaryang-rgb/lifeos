'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserName(data.user.name);
        } else {
          const path = window.location.pathname;
          if (path !== '/auth/login' && path !== '/auth/register') {
            router.push(`/auth/login?callbackUrl=${encodeURIComponent(path)}`);
          }
        }
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  return (
    <header className="flex flex-col md:flex-row bg-slate-900 text-slate-100 p-4 border-b border-slate-800">
      <div className="flex items-center justify-between w-full md:w-auto">
        <span className="text-xl font-bold cursor-pointer" onClick={() => router.push('/dashboard')}>LifeOS</span>
        
        <button
          id="btn-menu"
          className="md:hidden p-2 text-slate-400 hover:text-white focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      <nav
        id="sidebar-nav"
        className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row md:items-center md:ml-6 space-y-2 md:space-y-0 md:space-x-4 mt-4 md:mt-0 w-full md:w-auto`}
      >
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/dashboard')}>Dashboard</button>
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/calendar')}>Calendar</button>
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/goals')}>Tasks & Goals</button>
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/habits')}>Habits</button>
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/focus')}>Focus Session</button>
        <button className="text-left text-slate-300 hover:text-white" onClick={() => router.push('/analytics')}>Analytics</button>
        
        <div className="flex items-center space-x-2 md:ml-auto pt-2 md:pt-0">
          <span id="user-name" className="text-sm text-teal-400 font-semibold">{userName || 'Loading...'}</span>
          <button
            id="btn-logout"
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}
