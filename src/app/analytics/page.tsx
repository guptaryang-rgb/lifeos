'use client';

import { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';

interface AnalyticsData {
  focusHours: string;
  taskCompletionRate: number;
  habitCompliance: number;
  burnoutScore: number;
  recommendations: string[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = async () => {
    const res = await fetch('/api/analytics');
    if (res.ok) {
      setData(await res.json());
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (!data) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 p-8 text-center">Loading Analytics...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Burnout Score Widget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg text-center flex flex-col justify-center items-center">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Burnout Risk Score</h2>
            <div
              id="burnout-score"
              className={`text-6xl font-black ${
                data.burnoutScore > 50 
                  ? 'text-red-500' 
                  : data.burnoutScore > 30 
                  ? 'text-amber-500' 
                  : 'text-green-500'
              }`}
            >
              {data.burnoutScore}
            </div>
            <span className="text-xs text-slate-500 mt-2 block">(Scale of 0-100 based on workload density)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg md:col-span-2 space-y-3">
            <h2 className="text-lg font-bold text-teal-400">🤖 AI Recovery Recommendations</h2>
            <ul id="burnout-recommendations" className="list-disc list-inside text-sm text-slate-300 space-y-2">
              {data.recommendations.map((rec, idx) => (
                <li key={idx} className="leading-relaxed">{rec}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Focus hours chart */}
          <div id="focus-hours-chart" className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-4">
            <h3 className="text-sm font-bold text-blue-400 uppercase">Focus Hours Logged</h3>
            <div className="h-48 bg-slate-950 rounded border border-slate-850 flex items-end justify-around p-3">
              {/* Mock Bar chart */}
              <div className="w-8 bg-blue-600 rounded-t h-[60%]" />
              <div className="w-8 bg-blue-600 rounded-t h-[40%]" />
              <div className="w-8 bg-blue-600 rounded-t h-[80%]" />
            </div>
            <div className="text-center font-bold text-sm text-slate-300">
              Total Hours: <span className="text-blue-400">{data.focusHours}</span>
            </div>
          </div>

          {/* Task completion rate chart */}
          <div id="task-completion-chart" className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-4">
            <h3 className="text-sm font-bold text-teal-400 uppercase">Task Completion Rate</h3>
            <div className="h-48 bg-slate-950 rounded border border-slate-850 flex items-center justify-center p-3">
              {/* Circle graph representation */}
              <div className="w-32 h-32 rounded-full border-8 border-slate-800 border-t-teal-500 flex items-center justify-center">
                <span id="task-rate-text" className="text-xl font-bold">{data.taskCompletionRate}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">Adherence rate over active task scope.</p>
          </div>

          {/* Habit compliance rate chart */}
          <div id="habit-compliance-chart" className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-4">
            <h3 className="text-sm font-bold text-purple-400 uppercase">Habit Compliance Rate</h3>
            <div className="h-48 bg-slate-950 rounded border border-slate-850 flex items-center justify-center p-3">
              {/* Circle graph representation */}
              <div className="w-32 h-32 rounded-full border-8 border-slate-800 border-t-purple-500 flex items-center justify-center">
                <span id="habit-rate-text" className="text-xl font-bold">{data.habitCompliance}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">Adherence rate over 30-day frequency log.</p>
          </div>

        </div>

      </main>
    </div>
  );
}
