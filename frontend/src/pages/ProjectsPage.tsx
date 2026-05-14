import { useState, useEffect, type FormEvent, type DragEvent } from 'react';
import { apiService, type TaskData } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const columns = [
  { id: 'Open', label: 'To Do', color: 'border-slate-300', bg: 'bg-slate-50' },
  { id: 'In Progress', label: 'In Progress', color: 'border-blue-300', bg: 'bg-blue-50' },
  { id: 'Completed', label: 'Done', color: 'border-emerald-300', bg: 'bg-emerald-50' },
];

const prioColors: Record<string, string> = { 
  Low: 'bg-slate-100 text-slate-600', 
  Medium: 'bg-amber-100 text-amber-700', 
  High: 'bg-orange-100 text-orange-700',
  Urgent: 'bg-red-100 text-red-700'
};

export default function ProjectsPage() {
  const user = useAuthStore(s => s.user);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [prio, setPrio] = useState<'Low'|'Medium'|'High'|'Urgent'>('Medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = async () => { 
    try { 
      const r = await apiService.getTasks(); 
      // Ensure data maps back to our column states if they return old lowercase values
      const formattedTasks = (r.data || []).map(t => ({
        ...t,
        status: t.status === 'todo' ? 'Open' : t.status === 'in_progress' ? 'In Progress' : t.status === 'done' ? 'Completed' : t.status,
        priority: t.priority.charAt(0).toUpperCase() + t.priority.slice(1)
      })) as TaskData[];
      setTasks(formattedTasks); 
    } catch {} 
    finally { setLoading(false); } 
  };

  const loadOrg = async () => {
    try {
      const res = await apiService.getOrganizations();
      if (res.data && res.data.length > 0) {
        setMembers(res.data[0].members.map(m => ({ id: m.userId._id, name: m.userId.name, email: m.userId.email })));
      }
    } catch {}
  };

  useEffect(() => { load(); loadOrg(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title required'); return; }
    setCreating(true); setError('');
    try { 
      await apiService.createTask({ 
        title: title.trim(), 
        description: desc.trim() || undefined, 
        priority: prio,
        assignee: assigneeId || user?.id 
      }); 
      setShowCreate(false); 
      setTitle(''); 
      setDesc(''); 
      setPrio('Medium');
      setAssigneeId('');
      load(); 
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setCreating(false); }
  };

  const handleDragStart = (e: DragEvent, task: TaskData) => {
    if (user?.role !== 'Admin' && task.assignee?._id !== user?.id) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('taskId', task._id);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault(); // necessary to allow dropping
  };

  const handleDrop = async (e: DragEvent, targetStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    
    const task = tasks.find(t => t._id === taskId);
    if (!task || task.status === targetStatus) return;
    
    // Check permission
    if (user?.role !== 'Admin' && task.assignee?._id !== user?.id) {
      return;
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: targetStatus as any } : t));
    
    try {
      await apiService.updateTask(taskId, { status: targetStatus });
    } catch {
      load(); // revert if failed
    }
  };

  const del = async (id: string) => { 
    if (!confirm('Delete task?')) return;
    try { await apiService.deleteTask(id); load(); } catch {} 
  };
  
  const byStatus = (s: string) => tasks.filter(t => t.status === s);

  if (loading) return <div className="flex justify-center py-12"><svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Projects</h1><p className="text-slate-500 text-sm mt-1">Kanban board for task management</p></div>
        {user?.role === 'Admin' && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>Add Task
          </button>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Create Task</h2>
            {error && <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring" autoFocus/></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring resize-none"/></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select value={prio} onChange={e => setPrio(e.target.value as any)} className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                  <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring">
                    <option value="">{user?.name} (Me)</option>
                    {members.filter(m => m.id !== user?.id).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

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
          <div 
            key={col.id} 
            className={`rounded-2xl border-2 ${col.color} ${col.bg} p-4 flex flex-col`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">{col.label}</h3>
              <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm">{byStatus(col.id).length}</span>
            </div>
            
            <div className="flex-1 space-y-3 min-h-[150px]">
              {byStatus(col.id).map(task => {
                const canDrag = user?.role === 'Admin' || task.assignee?._id === user?.id;
                
                return (
                  <div 
                    key={task._id} 
                    draggable={canDrag}
                    onDragStart={(e) => handleDragStart(e, task)}
                    className={`bg-white rounded-xl p-3.5 shadow-sm border border-slate-100 transition-all ${canDrag ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'opacity-80 cursor-not-allowed'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-900 flex-1 pr-2">{task.title}</h4>
                      {user?.role === 'Admin' && (
                        <button onClick={() => del(task._id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                    {task.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>}
                    
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        {task.assignee && (
                          <div className="flex items-center gap-1.5" title={`Assigned to ${task.assignee.name}`}>
                            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                              {task.assignee.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[80px]">
                              {task.assignee.name.split(' ')[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prioColors[task.priority] || prioColors.Medium}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                );
              })}
              {byStatus(col.id).length === 0 && (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl opacity-50">
                  <span className="text-xs text-slate-400 font-medium py-8">Drop tasks here</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
