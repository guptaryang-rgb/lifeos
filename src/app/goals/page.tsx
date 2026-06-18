'use client';

import { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  effort: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  subtasks: { id: string; title: string; completed: boolean }[];
  linkedMilestone?: string;
}

interface Milestone {
  id: string;
  title: string;
  due: string;
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  due: string;
  milestones: Milestone[];
}

export default function GoalsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Task Form State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [taskEffort, setTaskEffort] = useState('0');
  const [taskSubtasksInput, setTaskSubtasksInput] = useState('');
  const [taskLinkedMilestone, setTaskLinkedMilestone] = useState('');

  // Goal Form State
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalFrequency, setGoalFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [goalDue, setGoalDue] = useState('');
  
  const [mTitle1, setMTitle1] = useState('');
  const [mDue1, setMDue1] = useState('');
  const [mTitle2, setMTitle2] = useState('');
  const [mDue2, setMDue2] = useState('');

  const [goalError, setGoalError] = useState('');

  // Filters & Search
  const [searchInput, setSearchInput] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('dueDate');

  const fetchAll = async () => {
    const resTasks = await fetch('/api/tasks');
    const resGoals = await fetch('/api/goals');
    if (resTasks.ok) setTasks(await resTasks.json());
    if (resGoals.ok) setGoals(await resGoals.json());
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleAddTaskClick = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDue('2026-06-17');
    setTaskPriority('MEDIUM');
    setTaskEffort('0');
    setTaskSubtasksInput('');
    setTaskLinkedMilestone('');
    setTaskModalOpen(true);
  };

  const handleEditTaskClick = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDue(task.dueDate);
    setTaskPriority(task.priority);
    setTaskEffort(String(task.effort));
    setTaskSubtasksInput(task.subtasks.map(s => s.title).join(', '));
    setTaskLinkedMilestone(task.linkedMilestone || '');
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDue) return;

    // Build subtasks array
    const subtasks = taskSubtasksInput
      ? taskSubtasksInput.split(',').map((s, idx) => ({
          id: `sub-${idx}-${Date.now()}`,
          title: s.trim(),
          completed: false
        }))
      : [];

    const payload: Partial<Task> = {
      title: taskTitle,
      dueDate: taskDue,
      priority: taskPriority,
      effort: parseInt(taskEffort) || 0,
      subtasks,
      linkedMilestone: taskLinkedMilestone || undefined
    };

    if (editingTaskId) {
      payload.id = editingTaskId;
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setTaskModalOpen(false);
      fetchAll();
    }
  };

  const handleDeleteTask = async (id: string) => {
    const res = await fetch(`/api/tasks?id=${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      fetchAll();
    }
  };

  const handleToggleTaskChecked = async (task: Task, checked: boolean) => {
    // Cascade to milestones if linked
    if (task.linkedMilestone) {
      const milestoneId = task.linkedMilestone;
      // Find parent goal
      const parentGoal = goals.find(g => g.milestones.some(m => m.id === milestoneId));
      if (parentGoal) {
        const updatedMilestones = parentGoal.milestones.map(m => m.id === milestoneId ? { ...m, completed: checked } : m);
        await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: parentGoal.id, milestones: updatedMilestones })
        });
      }
    }

    // Toggle subtasks completion if completed
    const updatedSubtasks = task.subtasks.map(s => ({ ...s, completed: checked }));

    const res = await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: task.id,
        status: checked ? 'COMPLETED' : 'NOT_STARTED',
        subtasks: updatedSubtasks
      })
    });
    if (res.ok) {
      fetchAll();
    }
  };

  const handleToggleSubtask = async (task: Task, subtaskId: string, checked: boolean) => {
    const updatedSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: checked } : s);
    
    // Calculate new status
    const allChecked = updatedSubtasks.every(s => s.completed);
    const someChecked = updatedSubtasks.some(s => s.completed);
    let newStatus = task.status;
    if (allChecked) {
      newStatus = 'COMPLETED';
    } else if (someChecked) {
      newStatus = 'IN_PROGRESS';
    } else {
      newStatus = 'NOT_STARTED';
    }

    // Cascade milestones if completed
    if (task.linkedMilestone && newStatus === 'COMPLETED') {
      const milestoneId = task.linkedMilestone;
      const parentGoal = goals.find(g => g.milestones.some(m => m.id === milestoneId));
      if (parentGoal) {
        const updatedMilestones = parentGoal.milestones.map(m => m.id === milestoneId ? { ...m, completed: true } : m);
        await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: parentGoal.id, milestones: updatedMilestones })
        });
      }
    }

    const res = await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: task.id,
        status: newStatus,
        subtasks: updatedSubtasks
      })
    });
    if (res.ok) {
      fetchAll();
    }
  };

  const handleAddGoalClick = () => {
    setGoalTitle('');
    setGoalFrequency('WEEKLY');
    setGoalDue('2026-07-31');
    setMTitle1('');
    setMDue1('');
    setMTitle2('');
    setMDue2('');
    setGoalError('');
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalError('');

    if (!goalTitle || !goalDue) return;

    // Validate milestone due dates do not exceed parent goal due date (F4-T10)
    const goalDueDate = new Date(goalDue).getTime();
    if (mDue1 && new Date(mDue1).getTime() > goalDueDate) {
      setGoalError('Milestone target date cannot exceed parent goal target date');
      return;
    }
    if (mDue2 && new Date(mDue2).getTime() > goalDueDate) {
      setGoalError('Milestone target date cannot exceed parent goal target date');
      return;
    }

    const milestones: Milestone[] = [];
    if (mTitle1) {
      milestones.push({ id: `m1-${Date.now()}`, title: mTitle1, due: mDue1 || goalDue, completed: false });
    }
    if (mTitle2) {
      milestones.push({ id: `m2-${Date.now()}`, title: mTitle2, due: mDue2 || goalDue, completed: false });
    }

    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: goalTitle,
        frequency: goalFrequency,
        due: goalDue,
        milestones
      })
    });

    if (res.ok) {
      setGoalModalOpen(false);
      fetchAll();
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const res = await fetch(`/api/goals?id=${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      fetchAll();
    }
  };

  // Safe regex matching for search (F4-T9)
  const getFilteredTasks = () => {
    let result = [...tasks];

    // Search term filtering
    if (searchInput) {
      // Escape special characters to prevent regex crash
      const escaped = searchInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      result = result.filter(t => regex.test(t.title));
    }

    // Priority filter
    if (filterPriority !== 'ALL') {
      result = result.filter(t => t.priority === filterPriority);
    }

    // Status filter
    if (filterStatus !== 'ALL') {
      result = result.filter(t => t.status === filterStatus);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'priority') {
        const pWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return pWeight[b.priority] - pWeight[a.priority];
      }
      if (sortBy === 'effort') {
        return b.effort - a.effort;
      }
      return 0;
    });

    return result;
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Goal System */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-teal-400">Goals & Milestones</h2>
              <button
                id="btn-add-goal"
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                onClick={handleAddGoalClick}
              >
                + Goal
              </button>
            </div>

            <div className="space-y-4">
              {goals.length === 0 ? (
                <p className="text-slate-500 text-sm">No goals created yet.</p>
              ) : (
                goals.map(goal => {
                  const completedM = goal.milestones.filter(m => m.completed).length;
                  const totalM = goal.milestones.length;
                  const progressPct = totalM ? Math.round((completedM / totalM) * 100) : 0;

                  return (
                    <div key={goal.id} className="goal-item bg-slate-850 border border-slate-800 p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-200">{goal.title}</strong>
                        <button
                          className="btn-delete-goal text-red-500 hover:text-red-400 text-xs font-bold"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          Delete
                        </button>
                      </div>

                      {/* Goal progress bar */}
                      <div className="h-2 w-full bg-slate-800 rounded overflow-hidden">
                        <div
                          className="goal-progress h-full bg-teal-500 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* Milestone listing */}
                      <div className="space-y-2">
                        {goal.milestones.map(m => (
                          <div key={m.id} className="milestone-item text-xs flex items-center justify-between bg-slate-900 p-2 rounded">
                            <span className="text-slate-300">{m.title}</span>
                            <span className={`font-semibold ${m.completed ? 'text-green-400' : 'text-slate-500'}`}>
                              {m.completed ? 'COMPLETED' : 'IN_PROGRESS'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Assignment / Task Tracker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            
            {/* Header and Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-blue-400">Assignment Tracker</h2>
              <button
                id="btn-add-task"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                onClick={handleAddTaskClick}
              >
                + Add Task
              </button>
            </div>

            {/* Filter and sorting widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
              <input
                id="search-input"
                type="text"
                placeholder="Search tasks..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
              <select
                id="filter-priority"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="OVERDUE">Overdue</option>
              </select>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none"
              >
                <option value="dueDate">Sort: Due Date</option>
                <option value="priority">Sort: Priority</option>
                <option value="effort">Sort: Effort</option>
              </select>
            </div>

            {/* Task list container */}
            <div id="tasks-list" className="space-y-4">
              {filteredTasks.length === 0 ? (
                <p className="text-slate-500 text-sm">No tasks matched your query.</p>
              ) : (
                filteredTasks.map(task => {
                  const completedSub = task.subtasks.filter(s => s.completed).length;
                  const totalSub = task.subtasks.length;
                  const subPct = totalSub ? Math.round((completedSub / totalSub) * 100) : 0;

                  return (
                    <div key={task.id} className="task-item bg-slate-850 border border-slate-800 p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={task.status === 'COMPLETED'}
                            onChange={(e) => handleToggleTaskChecked(task, e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-700 border-slate-600"
                          />
                          <span className={`font-bold ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-400">Due: {task.dueDate}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${task.status === 'COMPLETED' ? 'bg-slate-700 text-slate-400' : task.status === 'OVERDUE' ? 'bg-red-900 text-red-300' : 'bg-blue-900/40 text-blue-300'}`}>
                            {task.status}
                          </span>
                          <button
                            className="btn-edit-task text-blue-400 hover:text-blue-300 text-xs font-semibold px-2"
                            onClick={() => handleEditTaskClick(task)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-delete-task text-red-500 hover:text-red-400 text-xs font-semibold px-2"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Subtask progress bar */}
                      {totalSub > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Subtask Progress</span>
                            <span>{subPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded overflow-hidden">
                            <div
                              className="task-progress h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${subPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Subtasks listing */}
                      {totalSub > 0 && (
                        <div className="pl-6 space-y-1">
                          {task.subtasks.map(sub => (
                            <div key={sub.id} className="subtask-item flex items-center space-x-2 text-xs">
                              <input
                                type="checkbox"
                                checked={sub.completed}
                                onChange={(e) => handleToggleSubtask(task, sub.id, e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-blue-600 bg-slate-700 border-slate-600"
                              />
                              <span className={sub.completed ? 'line-through text-slate-500' : 'text-slate-300'}>
                                {sub.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Task Creation Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveTask} className="bg-slate-900 border border-slate-800 p-6 rounded-lg max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-blue-400">{editingTaskId ? 'Edit Task' : 'Create Task'}</h3>
            
            <div>
              <label className="block text-sm mb-1 text-slate-300 font-semibold">Title</label>
              <input
                id="task-title"
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onBlur={() => {
                  const query = taskTitle.trim().toLowerCase();
                  if (!query) return;
                  // Dynamic duration estimation: check existing tasks for matching title
                  let matched = tasks.find(t => t.title.trim().toLowerCase() === query);
                  if (!matched) {
                    matched = tasks.find(t => t.title.toLowerCase().includes(query) || query.includes(t.title.toLowerCase()));
                  }
                  if (matched) {
                    setTaskEffort(String(matched.effort));
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-slate-300 font-semibold">Due Date</label>
                <input
                  id="task-due"
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-300 font-semibold">Priority</label>
                <select
                  id="task-priority"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-slate-300 font-semibold">Effort (mins)</label>
                <input
                  id="task-effort"
                  type="number"
                  value={taskEffort}
                  onChange={(e) => setTaskEffort(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-300 font-semibold">Linked Milestone</label>
                <select
                  id="task-linked-milestone"
                  value={taskLinkedMilestone}
                  onChange={(e) => setTaskLinkedMilestone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                >
                  <option value="">None</option>
                  {goals.map(goal => 
                    goal.milestones.map(m => (
                      <option key={m.id} value={m.id}>
                        {goal.title} - {m.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-slate-300 font-semibold">Subtasks (comma separated)</label>
              <input
                id="task-subtasks-input"
                type="text"
                placeholder="e.g. Subtask 1, Subtask 2"
                value={taskSubtasksInput}
                onChange={(e) => setTaskSubtasksInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                className="bg-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs font-bold"
                onClick={() => setTaskModalOpen(false)}
              >
                Cancel
              </button>
              <button
                id="task-save"
                type="submit"
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goal Creation Modal */}
      {goalModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveGoal} className="bg-slate-900 border border-slate-800 p-6 rounded-lg max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-teal-400">Create Goal</h3>
            
            {goalError && (
              <div id="goal-error" className="bg-red-900 border border-red-700 text-red-100 p-2 rounded text-xs">
                {goalError}
              </div>
            )}

            <div>
              <label className="block text-sm mb-1 text-slate-300 font-semibold">Title</label>
              <input
                id="goal-title"
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-slate-300 font-semibold">Frequency</label>
                <select
                  id="goal-frequency"
                  value={goalFrequency}
                  onChange={(e) => setGoalFrequency(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-300 font-semibold">Target Date</label>
                <input
                  id="goal-due"
                  type="date"
                  value={goalDue}
                  onChange={(e) => setGoalDue(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                  required
                />
              </div>
            </div>

            {/* Milestones config */}
            <div className="space-y-3 border-t border-slate-800 pt-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Milestones</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="milestone-title-1"
                  type="text"
                  placeholder="Milestone 1 Title"
                  value={mTitle1}
                  onChange={(e) => setMTitle1(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
                <input
                  id="milestone-due-1"
                  type="date"
                  value={mDue1}
                  onChange={(e) => setMDue1(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  id="milestone-title-2"
                  type="text"
                  placeholder="Milestone 2 Title"
                  value={mTitle2}
                  onChange={(e) => setMTitle2(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
                <input
                  id="milestone-due-2"
                  type="date"
                  value={mDue2}
                  onChange={(e) => setMDue2(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                className="bg-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs font-bold"
                onClick={() => setGoalModalOpen(false)}
              >
                Cancel
              </button>
              <button
                id="goal-save"
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
