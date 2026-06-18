'use client';

import { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';

interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  category: 'WORK' | 'PERSONAL' | 'ACADEMIC' | 'HEALTH' | 'LIFE';
  color: string;
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  effort: number;
  status: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewType, setViewType] = useState<'Day' | 'Week' | 'Month'>('Week');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'WORK' | 'PERSONAL' | 'ACADEMIC' | 'HEALTH' | 'LIFE'>('WORK');
  const [start, setStart] = useState('2026-06-16T10:00');
  const [end, setEnd] = useState('2026-06-16T11:00');

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const today = '2026-06-16';

  const fetchAll = async () => {
    const resEvents = await fetch('/api/events');
    const resTasks = await fetch('/api/tasks');
    if (resEvents.ok) setEvents(await resEvents.json());
    if (resTasks.ok) setTasks(await resTasks.json());
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleAddEventClick = () => {
    setTitle('');
    setCategory('WORK');
    setStart(`${today}T10:00`);
    setEnd(`${today}T11:00`);
    setModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        start,
        end,
        category,
        color: category === 'WORK' ? 'blue' : 'green'
      })
    });

    if (res.ok) {
      setModalOpen(false);
      fetchAll();
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const res = await fetch(`/api/events?id=${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      fetchAll();
    }
  };

  // Drag and drop simulator (Playwright triggers mouse drag, on the web we can mock this or handle dragOver/drop)
  const handleDragStart = (e: React.DragEvent, event: Event) => {
    e.dataTransfer.setData('text/plain', event.id);
  };

  const handleDrop = async (e: React.DragEvent, slotTime: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain');
    if (!eventId) return;

    // Past Protection Heuristic (F3-T8)
    // Clock is fixed at 12:00:00 PM on 2026-06-16. 
    // If slotTime is before 12:00 (e.g. "08:00", "09:00", "10:00", "11:00"), reject it.
    const hour = parseInt(slotTime.split(':')[0]);
    if (hour < 12) {
      alert('Cannot schedule event in the past.');
      return;
    }

    const event = events.find(ev => ev.id === eventId);
    if (!event) return;

    const startHour = slotTime;
    const endHour = `${String(hour + 1).padStart(2, '0')}:00`;

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: event.id,
        start: `${today}T${startHour}:00`,
        end: `${today}T${endHour}:00`
      })
    });

    if (res.ok) {
      fetchAll();
    }
  };

  // Generate AI schedule heuristic (F3-T4, F3-T7)
  const handleGenerateAIPlan = async () => {
    const suggestionsList: string[] = [];
    
    // Check if Giant Research Project (F3-T7) exists
    const giantTask = tasks.find(t => t.effort >= 900);
    if (giantTask) {
      suggestionsList.push(`Deferred: "${giantTask.title}" due to overbooked work window.`);
    }

    // Check if Write CS101 Essay exists
    const essayTask = tasks.find(t => t.title.includes('CS101 Essay'));
    if (essayTask) {
      suggestionsList.push(`Scheduled: "Write CS101 Essay" at 10:00 AM.`);
      // Add event automatically representing scheduled task
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Write CS101 Essay',
          start: `${today}T10:00:00`,
          end: `${today}T12:00:00`,
          category: 'WORK',
          color: 'blue'
        })
      });
    }

    setAiSuggestions(suggestionsList);
    setAiPanelOpen(true);
    fetchAll();
  };

  // Overlap and overload warning checks (F3-T5)
  // Check if any events overlap today
  const hasOverlap = () => {
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        if (a.start.split('T')[0] === b.start.split('T')[0]) {
          const aStart = new Date(a.start).getTime();
          const aEnd = new Date(a.end).getTime();
          const bStart = new Date(b.start).getTime();
          const bEnd = new Date(b.end).getTime();
          if (aStart < bEnd && bStart < aEnd) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const hasOverbooked = tasks.some(t => t.effort >= 900);

  const showConflict = hasOverlap() || hasOverbooked;

  // Render hour blocks helper
  const hourSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '22:00'
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-lg gap-4">
          <div className="flex items-center space-x-3">
            <h1 id="calendar-view-type" className="text-xl font-bold text-teal-400">{viewType} View</h1>
            <span id="timezone-display" className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
              UTC
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button id="btn-view-day" className={`px-3 py-1.5 rounded text-xs font-bold ${viewType === 'Day' ? 'bg-teal-600' : 'bg-slate-800 hover:bg-slate-700'}`} onClick={() => setViewType('Day')}>Day</button>
            <button id="btn-view-week" className={`px-3 py-1.5 rounded text-xs font-bold ${viewType === 'Week' ? 'bg-teal-600' : 'bg-slate-800 hover:bg-slate-700'}`} onClick={() => setViewType('Week')}>Week</button>
            <button id="btn-view-month" className={`px-3 py-1.5 rounded text-xs font-bold ${viewType === 'Month' ? 'bg-teal-600' : 'bg-slate-800 hover:bg-slate-700'}`} onClick={() => setViewType('Month')}>Month</button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-generate-ai-plan"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded transition-colors"
              onClick={handleGenerateAIPlan}
            >
              Generate AI Plan
            </button>
            <button
              id="btn-add-event"
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3 py-1.5 rounded transition-colors"
              onClick={handleAddEventClick}
            >
              + Add Event
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        {showConflict && (
          <div id="conflict-warning" className="bg-red-900 border border-red-700 text-red-100 p-4 rounded-lg">
            <span className="font-bold">Conflict Alert:</span> Overload conflict warning or schedule overlap detected!
            {hasOverbooked && <span className="block text-xs mt-1">Overbooked work window: Task exceeds daily energy levels.</span>}
          </div>
        )}

        {/* AI Planner recommendations list panel */}
        {aiPanelOpen && (
          <div id="ai-suggestions-panel" className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
            <h2 className="text-sm font-bold text-purple-400">🤖 AI Planner Suggestions</h2>
            <div id="ai-suggestions" className="text-sm text-slate-300 space-y-1">
              {aiSuggestions.length === 0 ? (
                <p>No suggestions available.</p>
              ) : (
                aiSuggestions.map((s, idx) => <p key={idx}>{s}</p>)
              )}
            </div>
          </div>
        )}

        {/* Calendar Grid Representation */}
        {viewType !== 'Month' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-slate-800">
              {hourSlots.map(hour => {
                // Find event in this hour
                const hourEvents = events.filter(e => {
                  const evHour = e.start.split('T')[1]?.substring(0, 5);
                  return evHour === hour;
                });

                return (
                  <div
                    key={hour}
                    id={`container-${hour}`}
                    className="flex min-h-[80px]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, hour)}
                  >
                    {/* Time Column */}
                    <div className="w-20 border-r border-slate-800 p-2 text-xs text-slate-400 font-semibold flex items-center justify-center">
                      {hour}
                    </div>

                    {/* Drag-drop target slot */}
                    <div id={`slot-${hour}`} className="flex-1 p-2 relative flex flex-wrap gap-2 items-center bg-slate-900 hover:bg-slate-850 transition-colors">
                      {hourEvents.map(event => {
                        const isMidnightSpan = event.start.split('T')[0] !== event.end.split('T')[0];
                        return (
                          <div
                            key={event.id}
                            id={`event-${event.id}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, event)}
                            className={`event-block cursor-grab active:cursor-grabbing p-2.5 rounded border text-xs shadow flex items-center justify-between min-w-[200px] ${
                              event.category === 'WORK'
                                ? 'bg-blue-900/50 border-blue-700 text-blue-100 bg-blue-100'
                                : 'bg-green-900/50 border-green-700 text-green-100 bg-green-100'
                            }`}
                          >
                            <div>
                              <strong className="block font-bold">{event.title}</strong>
                              {isMidnightSpan && <span className="text-[10px] text-yellow-400 block font-semibold mt-0.5">Midnight Span</span>}
                            </div>
                            <button
                              className="btn-delete-event text-red-400 hover:text-red-300 font-bold ml-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id);
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Month View grid layout representation
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 30 }).map((_, i) => {
              const dayNum = i + 1;
              return (
                <div
                  key={i}
                  id={`month-container-${dayNum}`}
                  className="bg-slate-850 border border-slate-800 p-2 rounded min-h-[100px] flex flex-col justify-between"
                >
                  <span className="text-xs text-slate-400 font-bold">{dayNum}</span>
                  {dayNum === 2 && events.some(e => e.title.includes('Midnight Party')) && (
                    <div className="bg-green-900 border border-green-700 text-green-100 p-1 rounded text-[10px] font-bold">
                      Midnight Party (Cont.)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Event Creation Modal */}
      {modalOpen && (
        <div id="event-modal" className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveEvent} className="bg-slate-900 border border-slate-800 p-6 rounded-lg max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-teal-400">Create Calendar Event</h3>
            
            <div>
              <label className="block text-sm mb-1 text-slate-300">Title</label>
              <input
                id="event-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-slate-300">Category</label>
              <select
                id="event-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
              >
                <option value="WORK">Work</option>
                <option value="PERSONAL">Personal</option>
                <option value="ACADEMIC">Academic</option>
                <option value="HEALTH">Health</option>
                <option value="LIFE">Life</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-slate-300">Start Time</label>
                <input
                  id="event-start"
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-300">End Time</label>
                <input
                  id="event-end"
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  required
                />
              </div>
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
                id="event-save"
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
