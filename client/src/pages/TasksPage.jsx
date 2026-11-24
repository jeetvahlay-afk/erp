import { useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  GripVertical,
  ListTodo,
  Plus,
  Sparkles,
} from 'lucide-react';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  ErrorState,
  formatDate,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';

const VIEW_CONFIG = {
  my: ['My Tasks', ''],
  assigned: ['Assigned Tasks', 'scope=assigned'],
  completed: ['Completed Tasks', 'status=completed'],
  pending: ['Pending Tasks', 'status=pending'],
  today: ['Due Today', 'due=today'],
  calendar: ['Task Calendar', ''],
  kanban: ['Kanban Board', ''],
};

const localDateValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isOverdue = (task) =>
  task.status !== 'completed' &&
  task.dueDate &&
  new Date(task.dueDate).setHours(23, 59, 59, 999) < Date.now();

const priorityBadges = {
  high: 'bg-rose-50 text-rose-700 border-rose-200/80',
  medium: 'bg-amber-50 text-amber-700 border-amber-200/80',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
};

const TasksPage = ({ view = 'my' }) => {
  const [title, query] = VIEW_CONFIG[view] || ['Workspace Tasks', ''];
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  });
  const [draggingId, setDraggingId] = useState(null);

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await api.get(`/api/tasks${query ? `?${query}` : ''}`);
      setState({ loading: false, error: '', items: asArray(data) });
    } catch (error) {
      setState({
        loading: false,
        error: getApiError(error, 'Unable to load tasks'),
        items: [],
      });
    }
  };

  useEffect(() => {
    load();
  }, [view]);

  const create = async () => {
    try {
      await api.post('/api/tasks', form);
      setModalOpen(false);
      setForm({ title: '', description: '', priority: 'medium', dueDate: '' });
      feedback.success('Task created.');
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to create task'));
    }
  };

  const setStatus = async (task, status) => {
    try {
      await api.patch(`/api/tasks/${task._id}`, { status });
      feedback.success(`Task status updated to ${status}`);
      load();
    } catch (error) {
      feedback.error(getApiError(error, 'Unable to update task'));
    }
  };

  if (state.loading) return <LoadingState label="Loading tasks…" />;
  if (state.error) return <ErrorState message={state.error} retry={load} />;

  const pendingCount = state.items.filter((i) => i.status === 'pending').length;
  const progressCount = state.items.filter((i) => i.status === 'in progress').length;
  const completedCount = state.items.filter((i) => i.status === 'completed').length;

  const taskCard = (task) => {
    const overdue = isOverdue(task);
    return (
      <article
        key={task._id}
        draggable
        onDragStart={(event) => {
          setDraggingId(task._id);
          event.dataTransfer.setData('text/plain', task._id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setDraggingId(null)}
        className={`p-4 rounded-xl border bg-white shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing select-none ${
          overdue ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-200/80 hover:border-slate-300'
        } ${draggingId === task._id ? 'opacity-40 scale-95' : ''}`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              priorityBadges[task.priority] || priorityBadges.medium
            }`}
          >
            {task.priority}
          </span>
          <GripVertical size={14} className="text-slate-300 hover:text-slate-500" />
        </div>

        <h4 className="text-xs font-bold text-slate-900 leading-snug mb-1">{task.title}</h4>

        {task.description && (
          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3 font-normal">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px]">
          <div
            className={`flex items-center gap-1.5 font-medium ${
              overdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
            }`}
          >
            <CalendarClock size={13} />
            <span>{task.dueDate ? formatDate(task.dueDate) : 'No due date'}</span>
          </div>

          <div className="flex items-center gap-1">
            {task.status !== 'completed' && (
              <button
                type="button"
                onClick={() => setStatus(task, 'completed')}
                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Mark as completed"
              >
                <CheckCircle2 size={14} />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      {/* 1. Header */}
      <PageHeader
        title={title}
        breadcrumbs={['Workspace', title]}
        actions={
          <ToolbarButton primary icon={Plus} onClick={() => setModalOpen(true)}>
            New Task
          </ToolbarButton>
        }
      />

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <MetricCard
          label="Total Tasks"
          value={state.items.length}
          helper="Across all workspace boards"
          icon={ListTodo}
          tone="blue"
        />
        <MetricCard
          label="To Do / Pending"
          value={pendingCount}
          helper="Waiting for execution"
          icon={Clock}
          tone="amber"
        />
        <MetricCard
          label="In Progress"
          value={progressCount}
          helper="Currently being worked on"
          icon={Sparkles}
          tone="purple"
        />
        <MetricCard
          label="Completed"
          value={completedCount}
          helper="Successfully delivered"
          icon={CheckCircle2}
          tone="green"
        />
      </div>

      {/* 3. Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {[
          { key: 'pending', label: 'To Do', color: 'border-t-amber-500' },
          { key: 'in progress', label: 'In Progress', color: 'border-t-blue-500' },
          { key: 'completed', label: 'Done', color: 'border-t-emerald-500' },
        ].map(({ key, label, color }) => {
          const statusItems = state.items.filter((item) => item.status === key);
          return (
            <div
              key={key}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData('text/plain');
                setDraggingId(null);
                const task = state.items.find((item) => item._id === taskId);
                if (task && task.status !== key) setStatus(task, key);
              }}
              className={`bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col min-h-[420px] ${color} border-t-4`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3.5 px-1">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {label}
                </span>
                <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shadow-2xs">
                  {statusItems.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-3 flex-1">
                {statusItems.map(taskCard)}
                {!statusItems.length && (
                  <div className="h-32 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400 font-medium">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Create Task Modal */}
      <Modal
        open={modalOpen}
        title="Create New Task"
        subtitle="Add a task item to your workspace Kanban board."
        onClose={() => setModalOpen(false)}
        size="sm"
        footer={
          <>
            <ToolbarButton onClick={() => setModalOpen(false)}>Cancel</ToolbarButton>
            <ToolbarButton
              primary
              icon={CheckCircle2}
              disabled={!form.title.trim()}
              onClick={create}
            >
              Create Task
            </ToolbarButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              placeholder="Enter task title"
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Enter task description or key deliverables..."
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-normal"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority</label>
              <select
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 capitalize cursor-pointer"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due Date</label>
              <input
                type="date"
                min={localDateValue()}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TasksPage;
