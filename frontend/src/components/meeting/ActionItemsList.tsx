import { useTaskStore, type Task } from '../../stores/taskStore';

/**
 * ActionItemsList - Displays action items/tasks from meeting
 * Shows assignee, priority, status, and due date
 */
export function ActionItemsList() {
  const { tasks } = useTaskStore();
  const updateTask = useTaskStore((state) => state.updateTask);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'Low':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return '✓';
      case 'In Progress':
        return '●';
      case 'Open':
        return '○';
      default:
        return '×';
    }
  };

  const handleToggleStatus = (task: Task) => {
    const nextStatus = task.status === 'Completed' ? 'Open' : 'Completed';
    updateTask(task.id, {
      status: nextStatus,
      completedAt: nextStatus === 'Completed' ? new Date() : undefined,
    });
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No action items yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`p-4 rounded-lg border-2 transition ${
            task.status === 'Completed'
              ? 'bg-slate-50 border-slate-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={() => handleToggleStatus(task)}
              className={`hrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                task.status === 'Completed'
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'border-slate-300 hover:border-emerald-500'
              }`}
            >
              {task.status === 'Completed' && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4
                  className={`font-medium ${
                    task.status === 'Completed'
                      ? 'text-slate-500 line-through'
                      : 'text-slate-900'
                  }`}
                >
                  {task.title}
                </h4>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>

              {task.description && (
                <p className="text-sm text-slate-600 mb-2">{task.description}</p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                {/* Assignee */}
                {task.assignee && (
                  <div className="flex items-center gap-2">
                    {task.assignee.avatar ? (
                      <img
                        src={task.assignee.avatar}
                        alt={task.assignee.name}
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs font-bold">
                        {task.assignee.name[0]}
                      </div>
                    )}
                    <span>{task.assignee.name}</span>
                  </div>
                )}

                {/* Due Date */}
                {task.dueDate && (
                  <span>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}

                {/* Status */}
                <span className="inline-flex items-center gap-1">
                  <span className={`${getStatusIcon(task.status) === '✓' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {getStatusIcon(task.status)}
                  </span>
                  {task.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActionItemsList;
