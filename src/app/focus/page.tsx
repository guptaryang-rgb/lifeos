'use client';

import { useEffect, useState, useRef } from 'react';
import Navbar from '../../components/shared/Navbar';

export default function FocusPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const timerStartRef = useRef<number | null>(null);
  const durationRef = useRef<number>(25 * 60);
  const accumSecondsRef = useRef<number>(0);

  const [distractionBlocked, setDistractionBlocked] = useState(false);

  // Manual Log State
  const [manualDuration, setManualDuration] = useState('25');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if there is a running session in localStorage to recover (F6-T8)
    const storedStart = localStorage.getItem('focus_start');
    const storedDuration = localStorage.getItem('focus_duration');
    const storedAccum = localStorage.getItem('focus_accum');
    const storedIsPaused = localStorage.getItem('focus_is_paused');

    if (storedStart && storedDuration) {
      const duration = parseInt(storedDuration);
      const startMs = parseInt(storedStart);
      const accum = parseInt(storedAccum || '0');

      if (storedIsPaused === 'true') {
        setIsRunning(true);
        setIsPaused(true);
        setTimeLeft(duration - accum);
        durationRef.current = duration;
        accumSecondsRef.current = accum;
      } else {
        const elapsed = Math.floor((Date.now() - startMs) / 1000);
        const totalElapsed = accum + elapsed;
        if (totalElapsed < duration) {
          setIsRunning(true);
          setIsPaused(false);
          setTimeLeft(duration - totalElapsed);
          durationRef.current = duration;
          accumSecondsRef.current = accum;
          timerStartRef.current = startMs;
        } else {
          // Completed while away
          localStorage.removeItem('focus_start');
          localStorage.removeItem('focus_duration');
          localStorage.removeItem('focus_accum');
          localStorage.removeItem('focus_is_paused');
        }
      }
    }
  }, []);

  // Update timer display based on start timestamp to be active-tab-inactivity safe (F6-T6)
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      if (timerStartRef.current !== null) {
        const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000);
        const totalElapsed = accumSecondsRef.current + elapsed;
        const remaining = durationRef.current - totalElapsed;

        if (remaining <= 0) {
          clearInterval(interval);
          handleTimerComplete();
        } else {
          setTimeLeft(remaining);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  const handleTimerComplete = async () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
    localStorage.removeItem('focus_start');
    localStorage.removeItem('focus_duration');
    localStorage.removeItem('focus_accum');
    localStorage.removeItem('focus_is_paused');
    
    // Log Pomodoro to database
    await fetch('/api/focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: 25 })
    });

    alert('Focus Session Completed!');
  };

  const startTimer = () => {
    setIsRunning(true);
    setIsPaused(false);
    const now = Date.now();
    timerStartRef.current = now;
    
    localStorage.setItem('focus_start', String(now));
    localStorage.setItem('focus_duration', String(durationRef.current));
    localStorage.setItem('focus_accum', String(accumSecondsRef.current));
    localStorage.setItem('focus_is_paused', 'false');
  };

  const pauseTimer = () => {
    setIsPaused(true);
    if (timerStartRef.current !== null) {
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000);
      accumSecondsRef.current += elapsed;
    }
    timerStartRef.current = null;
    localStorage.setItem('focus_accum', String(accumSecondsRef.current));
    localStorage.setItem('focus_is_paused', 'true');
  };

  const stopTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(25 * 60);
    durationRef.current = 25 * 60;
    accumSecondsRef.current = 0;
    timerStartRef.current = null;
    
    localStorage.removeItem('focus_start');
    localStorage.removeItem('focus_duration');
    localStorage.removeItem('focus_accum');
    localStorage.removeItem('focus_is_paused');
  };

  const fastForward = () => {
    // Triggers 5s remaining in the session
    durationRef.current = 5;
    accumSecondsRef.current = 0;
    setTimeLeft(5);
    if (isRunning && !isPaused) {
      const now = Date.now();
      timerStartRef.current = now;
      localStorage.setItem('focus_start', String(now));
      localStorage.setItem('focus_duration', '5');
      localStorage.setItem('focus_accum', '0');
    }
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const mins = parseInt(manualDuration);

    const res = await fetch('/api/focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: mins })
    });

    if (res.ok) {
      setManualDuration('25');
      alert('Focus session logged successfully!');
    } else {
      const data = await res.json();
      setError(data.error || 'Zero/Negative Focus Session Duration');
    }
  };

  const handleBlockerToggle = (checked: boolean) => {
    setDistractionBlocked(checked);
    if (checked) {
      document.body.classList.add('distraction-blocked');
    } else {
      document.body.classList.remove('distraction-blocked');
    }
  };

  const formatDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left: Pomodoro Timer Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center space-y-6">
          <h2 className="text-xl font-bold text-teal-400">Pomodoro Timer</h2>

          <div
            id="timer-display"
            className="text-6xl font-black font-mono tracking-wider bg-slate-950 px-8 py-4 border border-slate-850 rounded-lg text-teal-400"
          >
            {formatDisplay(timeLeft)}
          </div>

          <div className="flex items-center space-x-3">
            {!isRunning ? (
              <button
                id="btn-timer-start"
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded transition-colors"
                onClick={startTimer}
              >
                Start Focus
              </button>
            ) : (
              <>
                {!isPaused ? (
                  <button
                    id="btn-timer-pause"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2.5 rounded transition-colors"
                    onClick={pauseTimer}
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    id="btn-timer-start"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded transition-colors"
                    onClick={startTimer}
                  >
                    Resume
                  </button>
                )}
                <button
                  id="btn-timer-stop"
                  className="bg-red-650 hover:bg-red-750 text-white font-bold px-6 py-2.5 rounded transition-colors"
                  onClick={stopTimer}
                >
                  Stop
                </button>
              </>
            )}

            <button
              id="btn-timer-fastforward"
              className="bg-purple-650 hover:bg-purple-750 text-white font-bold px-4 py-2.5 rounded transition-colors"
              onClick={fastForward}
            >
              ⏩ Fast Forward
            </button>
          </div>

          {/* Distraction Blocker Toggle */}
          <div className="flex items-center space-x-3 border-t border-slate-800 pt-6 w-full max-w-sm justify-between">
            <span className="text-sm font-semibold text-slate-300">Distraction Blocker</span>
            <input
              id="blocker-toggle"
              type="checkbox"
              checked={distractionBlocked}
              onChange={(e) => handleBlockerToggle(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 bg-slate-700 border-slate-600 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Right: Manual Logging Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col justify-center">
          <form onSubmit={handleManualLog} className="space-y-4 max-w-sm mx-auto w-full">
            <h2 className="text-xl font-bold text-teal-400">Manual Focus Logging</h2>

            {error && (
              <div id="focus-error" className="bg-red-900 border border-red-700 text-red-100 p-3 rounded text-sm font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm mb-1 text-slate-300">Duration (minutes)</label>
              <input
                id="manual-duration"
                type="number"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                required
              />
            </div>

            <button
              id="btn-manual-log"
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 font-bold p-2.5 rounded transition-colors text-white"
            >
              Log Session
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}
