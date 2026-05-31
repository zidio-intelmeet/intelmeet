import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import { useAuthStore } from '../../stores/authStore'
import { apiService, type OrganizationData, type TaskData } from '../../services/api'
import WorkspaceFrame from '../components/WorkspaceFrame'
import {
  scheduleColumns,
  type ScheduleColumnId,
  type ScheduleSortOrder,
  type ScheduleTask,
} from '../shared'

// Map between frontend column IDs and backend task statuses
const columnToStatus: Record<ScheduleColumnId, string> = {
  todo: 'Open',
  progress: 'In Progress',
  scheduled: 'Completed',
}
const statusToColumn: Record<string, ScheduleColumnId> = {
  'Open': 'todo',
  'In Progress': 'progress',
  'Completed': 'scheduled',
  'todo': 'todo',
  'in_progress': 'progress',
  'done': 'scheduled',
}

type TeamBucket = {
  id: string
  name: string
  memberIds: string[]
}

const LOCAL_TEAMS_KEY = 'intellmeet-local-teams'
export default function SchedulePage() {
  const { user } = useAuth()
  const isLoading = useAuthStore((state) => state.isLoading)
  // ✅ FIX: Tasks now loaded from backend API, not localStorage
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [members, setMembers] = useState<{ id: string; name: string; email: string }[]>([])
  const [teams, setTeams] = useState<TeamBucket[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNote, setTaskNote] = useState('')
  const [taskDueAt, setTaskDueAt] = useState('')
  const [targetColumn, setTargetColumn] = useState<ScheduleColumnId>('todo')
  const [assigneeId, setAssigneeId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [sortOrders, setSortOrders] = useState<Record<ScheduleColumnId, ScheduleSortOrder>>({
    todo: 'newest',
    progress: 'newest',
    scheduled: 'newest',
  })
  const [sortMenuColumn, setSortMenuColumn] = useState<ScheduleColumnId | null>(null)
  const [formMenu, setFormMenu] = useState<'team' | 'assignee' | 'list' | null>(null)
  const [taskError, setTaskError] = useState('')

  const currentUser = user!
  const isAdmin = currentUser.role === 'Admin'

  // Convert backend TaskData to frontend ScheduleTask
  function taskDataToScheduleTask(task: TaskData): ScheduleTask {
    return {
      id: task._id,
      title: task.title,
      note: task.description || '',
      dueAt: task.dueDate || '',
      columnId: statusToColumn[task.status] || 'todo',
      createdAt: new Date(task.createdAt).getTime(),
      assigneeId: task.assignee?._id || '',
      assigneeName: task.assignee?.name || 'Unassigned',
      assigneeEmail: task.assignee?.email || '',
      teamId: '',
      teamName: '',
    }
  }

  // ✅ FIX: Load tasks from backend API
  async function loadTasks() {
    try {
      const response = await apiService.getTasks();
      const backendTasks = (response.data || []).map(taskDataToScheduleTask);
      setTasks(backendTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await apiService.getOrganizations()
        const organization = response.data?.[0]

        if (!organization) {
          setMembers([])
          setTeams([])
          return
        }

        setMembers(organization.members.map((member: OrganizationData['members'][number]) => ({
          id: member.userId._id,
          name: member.userId.name,
          email: member.userId.email,
        })))

        try {
          const raw = localStorage.getItem(LOCAL_TEAMS_KEY)
          const parsed = raw ? JSON.parse(raw) as Record<string, TeamBucket[]> : {}
          const workspaceTeams = Array.isArray(parsed[organization._id]) ? parsed[organization._id] : []
          setTeams(workspaceTeams)
        } catch {
          setTeams([])
        }
      } catch {
        setMembers([])
        setTeams([])
      }
    }
    loadMembers()
  }, [currentUser.email, currentUser.id, isAdmin])


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fbf8]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ✅ FIX: Create task via backend API instead of only localStorage
  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTaskError('')

    if (!isAdmin) return
    if (!taskTitle.trim()) {
      setTaskError('Task title is required')
      return
    }

    const selectedMember = members.find((member) => member.id === assigneeId)

    try {
      await apiService.createTask({
        title: taskTitle.trim(),
        description: taskNote.trim() || undefined,
        assignee: selectedMember?.id || currentUser.id,
        priority: 'Medium',
        dueDate: taskDueAt || undefined,
      })
      
      // Reload from server
      await loadTasks()

      setTaskTitle('')
      setTaskNote('')
      setTaskDueAt('')
      setTargetColumn('todo')
      setAssigneeId('')
      setTeamId('')
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }

  function handleDragStart(event: DragEvent<HTMLElement>, taskId: string) {
    const task = tasks.find((currentTask) => currentTask.id === taskId)
    if (!task || (!isAdmin && task.assigneeEmail !== currentUser.email)) {
      event.preventDefault()
      return
    }
    event.dataTransfer.setData('text/plain', taskId)
    event.dataTransfer.effectAllowed = 'move'
  }

  // ✅ FIX: Update task status via backend API on drag-drop
  async function handleDrop(event: DragEvent<HTMLDivElement>, columnId: ScheduleColumnId) {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain')
    const task = tasks.find((currentTask) => currentTask.id === taskId)

    if (!task || (!isAdmin && task.assigneeEmail !== currentUser.email)) return
    if (task.columnId === columnId) return

    // Optimistic update
    setTasks((currentTasks) =>
      currentTasks.map((t) => (t.id === taskId ? { ...t, columnId } : t)),
    )

    try {
      await apiService.updateTask(taskId, { status: columnToStatus[columnId] })
    } catch {
      // Revert on failure
      await loadTasks()
    }
  }

  // ✅ FIX: Delete task via backend API
  async function handleDeleteDoneTask(taskId: string) {
    if (!isAdmin) return

    try {
      await apiService.deleteTask(taskId)
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId))
    } catch {
      await loadTasks()
    }
  }

  function getColumnTasks(columnId: ScheduleColumnId) {
    return tasks
      .filter((task) => task.columnId === columnId)
      .filter((task) => {
        if (isAdmin) {
          return true
        }

        return task.assigneeEmail === currentUser.email || task.assigneeId === currentUser.id
      })
      .toSorted((firstTask, secondTask) => {
        if (sortOrders[columnId] === 'az') {
          return firstTask.title.localeCompare(secondTask.title, undefined, { sensitivity: 'base' })
        }

        return sortOrders[columnId] === 'newest'
          ? secondTask.createdAt - firstTask.createdAt
          : firstTask.createdAt - secondTask.createdAt
      })
  }

  function updateSortOrder(columnId: ScheduleColumnId, order: ScheduleSortOrder) {
    setSortOrders((currentOrders) => ({ ...currentOrders, [columnId]: order }))
    setSortMenuColumn(null)
  }

  function getSortLabel(order: ScheduleSortOrder) {
    if (order === 'az') {
      return 'A-Z'
    }

    return order === 'newest' ? 'Newest' : 'Earliest'
  }

  const selectedAssignee = members.find((member) => member.id === assigneeId)
  const selectedColumn = scheduleColumns.find((column) => column.id === targetColumn)
  const selectedTeam = teams.find((team) => team.id === teamId)
  const assignableMembers = teamId
    ? members.filter((member) => teams.find((team) => team.id === teamId)?.memberIds.includes(member.id))
    : []




  return (
    <WorkspaceFrame>
      <>
        <header className="border-b border-emerald-100 bg-white px-5 py-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Schedule</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Kanban Board</h1>
        </header>

        <section className="px-5 py-6 sm:px-8 lg:px-10">
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">

          {isAdmin ? (
          <form onSubmit={handleAddTask} className="mt-6 grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 xl:grid-cols-[1fr_1fr_1fr_1.1fr_1fr_auto_auto]">
            {taskError && <div className="col-span-full text-sm font-semibold text-rose-500 bg-rose-50 p-2 rounded-lg">{taskError}</div>}
            <label className="block">
              <span className="text-xs font-bold uppercase text-emerald-700">Task</span>
              <input
                type="text"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Write a task or meeting title"
                className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <div className="relative block">
              <span className="text-xs font-bold uppercase text-emerald-700">Team</span>
              <button
                type="button"
                onClick={() => setFormMenu((currentMenu) => currentMenu === 'team' ? null : 'team')}
                className="mt-1.5 flex w-full min-w-36 items-center justify-between rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <span>{selectedTeam?.name || 'Select team'}</span>
                <span className="text-slate-400">?</span>
              </button>
              {formMenu === 'team' && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl shadow-emerald-950/10">
                  <div className="flex items-center justify-between border-b border-emerald-50 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">Team</h3>
                    <button
                      type="button"
                      onClick={() => setFormMenu(null)}
                      className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Close team menu"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => {
                          setTeamId(team.id)
                          setAssigneeId('')
                          setFormMenu(null)
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-emerald-50"
                      >
                        <span>{team.name}</span>
                        <span className={[
                          'flex h-5 w-5 items-center justify-center rounded-full border',
                          teamId === team.id ? 'border-emerald-600' : 'border-slate-300',
                        ].join(' ')}>
                          {teamId === team.id && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative block">
              <span className="text-xs font-bold uppercase text-emerald-700">Assign to</span>
              <button
                type="button"
                onClick={() => setFormMenu((currentMenu) => currentMenu === 'assignee' ? null : 'assignee')}
                className="mt-1.5 flex w-full min-w-36 items-center justify-between rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <span>{selectedAssignee?.name || 'Select member'}</span>
                <span className="text-slate-400">?</span>
              </button>
              {formMenu === 'assignee' && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl shadow-emerald-950/10">
                  <div className="flex items-center justify-between border-b border-emerald-50 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">Assign to</h3>
                    <button
                      type="button"
                      onClick={() => setFormMenu(null)}
                      className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Close assign menu"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {assignableMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setAssigneeId(member.id)
                          setFormMenu(null)
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-emerald-50"
                      >
                        <span>{member.name}</span>
                        <span className={[
                          'flex h-5 w-5 items-center justify-center rounded-full border',
                          assigneeId === member.id ? 'border-emerald-600' : 'border-slate-300',
                        ].join(' ')}>
                          {assigneeId === member.id && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <label className="block">
              <span className="text-xs font-bold uppercase text-emerald-700">Date and time</span>
              <input
                type="datetime-local"
                value={taskDueAt}
                onChange={(event) => setTaskDueAt(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-emerald-700">Note / detail</span>
              <input
                type="text"
                value={taskNote}
                onChange={(event) => setTaskNote(event.target.value)}
                placeholder="Add notes or details"
                className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <div className="relative block">
              <span className="text-xs font-bold uppercase text-emerald-700">List</span>
              <button
                type="button"
                onClick={() => setFormMenu((currentMenu) => currentMenu === 'list' ? null : 'list')}
                className="mt-1.5 flex w-full min-w-36 items-center justify-between rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <span>{selectedColumn?.title || 'To Do'}</span>
                <span className="text-slate-400">?</span>
              </button>
              {formMenu === 'list' && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl shadow-emerald-950/10">
                  <div className="flex items-center justify-between border-b border-emerald-50 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">List</h3>
                    <button
                      type="button"
                      onClick={() => setFormMenu(null)}
                      className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Close list menu"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {scheduleColumns.map((column) => (
                      <button
                        key={column.id}
                        type="button"
                        onClick={() => {
                          setTargetColumn(column.id)
                          setFormMenu(null)
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-emerald-50"
                      >
                        <span>{column.title}</span>
                        <span className={[
                          'flex h-5 w-5 items-center justify-center rounded-full border',
                          targetColumn === column.id ? 'border-emerald-600' : 'border-slate-300',
                        ].join(' ')}>
                          {targetColumn === column.id && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                Add
              </button>
            </div>
          </form>
          ) : null}

          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {scheduleColumns.map((column) => (
              <div key={column.id} className="relative min-h-96 rounded-2xl border border-emerald-100 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${column.accent}`} />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">{column.title}</h2>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                    {getColumnTasks(column.id).length}
                  </span>
                </div>

                <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-3 py-2">
                  <p className="text-xs font-semibold text-slate-500">
                    Sort by <span className="font-bold text-slate-800">{getSortLabel(sortOrders[column.id])}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setSortMenuColumn(column.id)}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                    aria-label={`Sort ${column.title} tasks`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10m0 0 3-3m-3 3-3-3M16 17V7m0 0 3 3m-3-3-3 3" />
                    </svg>
                  </button>
                </div>

                {sortMenuColumn === column.id && (
                  <div className="absolute left-4 right-4 top-30 z-20 rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl shadow-emerald-950/10">
                    <div className="flex items-center justify-between border-b border-emerald-50 pb-2">
                      <h3 className="text-sm font-bold text-slate-900">Sort {column.title}</h3>
                      <button
                        type="button"
                        onClick={() => setSortMenuColumn(null)}
                        className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                        aria-label="Close sort menu"
                      >
                        Ãƒâ€”
                      </button>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {[
                        { value: 'newest' as const, label: 'Date created: Newest' },
                        { value: 'earliest' as const, label: 'Date created: Earliest' },
                        { value: 'az' as const, label: 'Title: A-Z' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateSortOrder(column.id, option.value)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-emerald-50"
                        >
                          <span>{option.label}</span>
                          <span
                            className={[
                              'flex h-5 w-5 items-center justify-center rounded-full border',
                              sortOrders[column.id] === option.value ? 'border-emerald-600' : 'border-slate-300',
                            ].join(' ')}
                          >
                            {sortOrders[column.id] === option.value && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, column.id)}
                  className="max-h-112 min-h-72 space-y-3 overflow-y-auto rounded-xl border border-dashed border-emerald-100 p-2 pr-3"
                >
                  {getColumnTasks(column.id).filter((task) => isAdmin || task.assigneeEmail === currentUser.email).length === 0 && (
                    <div className="flex min-h-32 items-center justify-center rounded-xl bg-white px-4 text-center text-sm font-medium text-slate-400">
                      Drop tasks here
                    </div>
                  )}

                  {getColumnTasks(column.id)
                    .filter((task) => isAdmin || task.assigneeEmail === currentUser.email)
                    .map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, task.id)}
                      className="cursor-grab rounded-2xl border border-emerald-50 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Task
                        </span>
                        {column.id === 'scheduled' && isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteDoneTask(task.id)}
                            className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">Drag me</span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-950">{task.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                        <span>Assigned to {task.assigneeName}</span>
                        {task.teamName && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px]">{task.teamName}</span>}
                      </div>
                      {task.dueAt && (
                        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                          {new Date(task.dueAt).toLocaleString([], {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                      {task.note && <p className="mt-2 text-sm leading-6 text-slate-500">{task.note}</p>}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>
      </>
    </WorkspaceFrame>
  )
}







