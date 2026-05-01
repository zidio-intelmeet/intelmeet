import { useState, useEffect, type FormEvent } from 'react';
import { apiService, type TaskData } from '../services/api';

const columns = [
  { id: 'todo' as const, label: 'To Do', color: 'border-slate-300', bg: 'bg-slate-50' },
  { id: 'in_progress' as const, label: 'In Progress', color: 'border-blue-300', bg: 'bg-blue-50' },
  { id: 'done' as const, label: 'Done', color: 'border-emerald-300', bg: 'bg-emerald-50' },
];

const prioColors: Record<string, string> = { low: 'bg-slate-100 text-slate-600', medium: 'bg-amber-100 text-amber-700', high: 'bg-red-100 text-red-700' };

export default function ProjectsPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [prio, setPrio] = useState<'low'|'medium'|'high'>('medium');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = async () => { try { const r = await apiService.getTasks(); setTasks(r.data || []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title required'); return; }
    setCreating(true); setError('');
    try { await apiService.createTask({ title: title.trim(), description: desc.trim() || undefined, priority: prio }); setShowCreate(false); setTitle(''); setDesc(''); load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setCreating(false); }
  };

  const move = async (id: string, status: string) => { try { await apiService.updateTask(id, { status }); load(); } catch {} };
  const del = async (id: string) => { try { await apiService.deleteTask(id); load(); } catch {} };
  const byStatus = (s: string) => tasks.filter(t => t.status === s);

  if (loading) return <div className="flex justify-center py-12"><svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Projects</h1><p className="text-slate-500 text-sm mt-1">Kanban board for task management</p></div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>Add Task
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Create Task</h2>
            {error && <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring" autoFocus/></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring resize-none"/></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Priority</label><select value={prio} onChange={e => setPrio(e.target.value as 'low'|'medium'|'high')} className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border text-slate-700 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => (
          <div key={col.id} className={`rounded-2xl border-2 ${col.color} ${col.bg} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">{col.label}</h3>
              <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full">{byStatus(col.id).length}</span>
            </div>
            <div className="space-y-3 min-h-[100px]">
              {byStatus(col.id).map(task => (
                <div key={task._id} className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-900 flex-1">{task.title}</h4>
                    <button onClick={() => del(task._id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 ml-2"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                  </div>
                  {task.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{task.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${prioColors[task.priority]}`}>{task.priority}</span>
                    <select value={task.status} onChange={e => move(task._id, e.target.value)} className="text-xs border rounded-lg px-2 py-1 text-slate-600 bg-transparent cursor-pointer">
                      <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
