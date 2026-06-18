'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/shared/Navbar';

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  effort: number;
  status: string;
}

interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  category: string;
}

interface Habit {
  id: string;
  title: string;
  streak: number;
  logs: string[];
}

export default function Dashboard() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [lifeScore, setLifeScore] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const resTasks = await fetch('/api/tasks');
      const resEvents = await fetch('/api/events');
      const resHabits = await fetch('/api/habits');

      if (resTasks.status === 401 || resEvents.status === 401 || resHabits.status === 401) {
        // Handled by Navbar redirect, but stop loading
        return;
      }

      const tasksData = await resTasks.json();
      const eventsData = await resEvents.json();
      const habitsData = await resHabits.json();

      setTasks(tasksData);
      setEvents(eventsData);
      setHabits(habitsData);

      // Compute stats
      const completed = tasksData.filter((t: Task) => t.status === 'COMPLETED').length;
      setTasksCompleted(completed);
      setLifeScore(completed * 10);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle) return;

    const today = new Date().toISOString().split('T')[0];
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: quickTitle,
        dueDate: today,
        priority: 'HIGH',
        effort: 30,
        status: 'NOT_STARTED'
      })
    });

    if (res.ok) {
      setQuickTitle('');
      setModalOpen(false);
      fetchData();
    }
  };

  const handleCheckTask = async (task: Task, checked: boolean) => {
    const res = await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: task.id,
        status: checked ? 'COMPLETED' : 'NOT_STARTED'
      })
    });
    if (res.ok) {
      // Optimistic update of local states to prevent stats lag
      const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, status: checked ? 'COMPLETED' : 'NOT_STARTED' } : t);
      setTasks(updatedTasks);
      const completed = updatedTasks.filter(t => t.status === 'COMPLETED').length;
      setTasksCompleted(completed);
      setLifeScore(completed * 10);
    }
  };

  // Debounce helper for habit check-in
  const [loggingHabitId, setLoggingHabitId] = useState<string | null>(null);
  const handleHabitCheckIn = async (habit: Habit) => {
    if (loggingHabitId === habit.id) return; // Ignore rapid clicks (F2-T8)
    setLoggingHabitId(habit.id);

    const todayStr = new Date().toISOString().split('T')[0];
    if (habit.logs.includes(todayStr)) {
      setLoggingHabitId(null);
      return;
    }

    const updatedLogs = [...habit.logs, todayStr];
    const updatedStreak = habit.streak + 1;

    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: habit.id,
        streak: updatedStreak,
        logs: updatedLogs
      })
    });

    if (res.ok) {
      fetchData();
    }
    setLoggingHabitId(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 p-8 text-center">Loading Dashboard...</div>;
  }

  const sortedEvents = [...events].sort((a, b) => a.start.localeCompare(b.start));
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });

  const isEmpty = tasks.length === 0 && events.length === 0 && habits.length === 0;

  // AI Briefing Text Heuristic (F2-T5, F2-T9)
  let aiBriefing = 'Your schedule is clear! Use this time to set goals.';
  if (tasks.length > 0 || events.length > 0) {
    aiBriefing = `You have ${tasks.filter(t => t.status !== 'COMPLETED').length} active tasks and ${events.length} events on your schedule today. Stay focused!`;
  }

  // Procrastination warning (F6-T4)
  const todayStr = new Date().toISOString().split('T')[0];
  const procrastinatedTask = tasks.find(t => t.priority === 'HIGH' && t.status !== 'COMPLETED' && t.dueDate === todayStr);

  // Format time utility helper
  const formatTime = (isoString: string) => {
    try {
      const parts = isoString.split('T')[1].split(':');
      let hour = parseInt(parts[0]);
      const min = parts[1];
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${String(hour).padStart(2, '0')}:${min} ${ampm}`;
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Schedule and Priority Tasks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Procrastination Alert Banner */}
          {procrastinatedTask && (
            <div id="procrastination-warning" className="bg-amber-900 border border-amber-700 text-amber-100 p-4 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold">Procrastination Alert:</span> You have a high priority task <strong className="underline">"{procrastinatedTask.title}"</strong> due today!
              </div>
              <button
                id="btn-warning-focus"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors"
                onClick={() => router.push(`/focus?taskId=${procrastinatedTask.id}`)}
              >
                Focus Now
              </button>
            </div>
          )}

          {/* Onboarding Welcome State */}
          {isEmpty && (
            <div id="empty-state" className="bg-slate-900 border border-slate-800 p-12 rounded-lg text-center">
              <h2 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
                Welcome to LifeOS
              </h2>
              <p className="text-slate-400">Your personalized productivity assistant starts here. Create a goal, schedule an event, or log a habit to begin!</p>
            </div>
          )}

          {/* Daily Schedule Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center text-blue-400">
              📅 Today's Schedule
            </h2>
            <div id="schedule-list" className="space-y-3">
              {sortedEvents.length === 0 ? (
                <p className="text-slate-500 text-sm">No scheduled events for today.</p>
              ) : (
                sortedEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-3 rounded">
                    <span className="font-semibold text-sm text-slate-300">{formatTime(event.start)}</span>
                    <span className="font-bold text-slate-100">{event.title}</span>
                    <span className="text-xs bg-blue-900 text-blue-300 px-2.5 py-0.5 rounded font-bold uppercase">{event.category}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Priority Tasks list */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-teal-400">
                ✔️ Priority Tasks
              </h2>
              <button
                id="btn-add-task-quick"
                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                onClick={() => setModalOpen(true)}
              >
                + Quick Add
              </button>
            </div>

            <div id="priority-tasks-list" className="space-y-3">
              {sortedTasks.length === 0 ? (
                <p className="text-slate-500 text-sm">No tasks created yet.</p>
              ) : (
                sortedTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-3 rounded">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'COMPLETED'}
                        onChange={(e) => handleCheckTask(task, e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-700 border-slate-600"
                      />
                      <span className={`text-sm ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.title}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${task.priority === 'HIGH' ? 'bg-red-900 text-red-300' : task.priority === 'MEDIUM' ? 'bg-amber-900 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Statistics, AI Briefing, and Habits */}
        <div className="space-y-6">
          
          {/* Quick Stats Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 grid grid-cols-2 gap-4">
            <div className="bg-slate-850 p-4 border border-slate-800 rounded text-center">
              <span className="block text-slate-400 text-xs font-semibold uppercase">Completed</span>
              <span id="tasks-completed" className="text-3xl font-extrabold text-teal-400 mt-1 block">{tasksCompleted}</span>
            </div>
            <div className="bg-slate-850 p-4 border border-slate-800 rounded text-center">
              <span className="block text-slate-400 text-xs font-semibold uppercase">Life Score</span>
              <span id="life-score" className="text-3xl font-extrabold text-blue-400 mt-1 block">{lifeScore}</span>
            </div>
          </div>

          {/* AI Daily Narrative Briefing */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-3 text-purple-400">🤖 AI Assistant Narrative</h2>
            <div id="ai-briefing-text" className="text-slate-300 text-sm leading-relaxed italic bg-slate-950 p-3 border border-slate-850 rounded">
              {aiBriefing}
            </div>
          </div>

          {/* Habits Widgets */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-3 text-emerald-400">🔥 Today's Habits</h2>
            <div id="dashboard-habits-list" className="space-y-3">
              {habits.length === 0 ? (
                <p className="text-slate-500 text-sm">No habits configured.</p>
              ) : (
                habits.map(habit => (
                  <div key={habit.id} className="flex items-center justify-between bg-slate-800/30 p-2.5 rounded border border-slate-850">
                    <div>
                      <span className="text-sm font-semibold text-slate-200">{habit.title}</span>
                      <span className="block text-xs text-emerald-400 mt-0.5">🔥 {habit.streak}d</span>
                    </div>
                    <button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded transition-colors disabled:opacity-50"
                      disabled={habit.logs.includes(todayStr)}
                      onClick={() => handleHabitCheckIn(habit)}
                    >
                      {habit.logs.includes(todayStr) ? 'Checked-in' : 'Check-in'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Quick Add Modal */}
      {modalOpen && (
        <div id="quick-task-modal" className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateQuickTask} className="bg-slate-900 border border-slate-800 p-6 rounded-lg max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-teal-400">Quick Task Creation</h3>
            <div>
              <label className="block text-sm mb-1 text-slate-300">Task Title</label>
              <input
                id="quick-task-title"
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-teal-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                className="bg-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-650"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                id="quick-task-save"
                type="submit"
                className="bg-teal-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-teal-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
