import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import Button from "../common/Button";
import Input from "../common/Input";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatActivityDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TaskDetail({
  activities = [],
  isOpen,
  members = [],
  onAssignTask,
  onClose,
  onDelete,
  onSave,
  onStatusChange,
  projectId,
  task,
  taskStore,
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigneeId: "",
    dueDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!task) {
      return;
    }

    setForm({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      assigneeId: task.assignee?.id || task.assignee?._id || "",
      dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : "",
    });
  }, [task]);

  const taskActivities = useMemo(() => {
    const taskId = task?.id || task?._id;
    return activities.filter((activity) => {
      const activityTaskId = activity?.task?.id || activity?.task?._id || activity?.task;
      return String(activityTaskId) === String(taskId);
    });
  }, [activities, task]);

  if (!isOpen || !task) {
    return null;
  }

  const saveAction = onSave || taskStore?.updateTask;
  const deleteAction = onDelete || taskStore?.deleteTask;
  const assignAction = onAssignTask || taskStore?.assignTask;
  const statusAction = onStatusChange || taskStore?.updateTaskStatus;

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!projectId) {
      toast.error("Task update action is not configured.");
      return;
    }

    try {
      setSaving(true);
      const taskId = task.id || task._id;
      const updates = [];

      if (saveAction) {
        updates.push(
          saveAction(projectId, taskId, {
            title: form.title.trim(),
            description: form.description.trim(),
            priority: form.priority,
            dueDate: form.dueDate || null,
          })
        );
      }

      const currentStatus = task.status || "todo";
      const currentAssigneeId = task.assignee?.id || task.assignee?._id || "";

      if (form.status !== currentStatus && statusAction) {
        updates.push(statusAction(projectId, taskId, { status: form.status }));
      }

      if (form.assigneeId !== currentAssigneeId && assignAction) {
        updates.push(assignAction(projectId, taskId, form.assigneeId || null));
      }

      if (!updates.length) {
        toast.success("No changes to save.");
        onClose?.();
        return;
      }

      await Promise.all(updates);
      toast.success("Task updated.");
      onClose?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Unable to update task."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAction || !projectId) {
      toast.error("Task delete action is not configured.");
      return;
    }

    if (!window.confirm("Delete this task? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      await deleteAction(projectId, task.id || task._id);
      toast.success("Task deleted.");
      onClose?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Unable to delete task."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={onClose} />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Task detail</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{task.title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close task detail"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <Input
              label="Title"
              value={form.title}
              onChange={handleChange("title")}
            />

            <Input
              label="Description"
              type="textarea"
              rows={6}
              value={form.description}
              onChange={handleChange("description")}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={form.status}
                  onChange={handleChange("status")}
                  className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={form.priority}
                  onChange={handleChange("priority")}
                  className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Assignee</label>
                <select
                  value={form.assigneeId}
                  onChange={handleChange("assigneeId")}
                  className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => {
                    const user = member.user || member;
                    const userId = user.id || user._id;

                    return (
                      <option key={userId} value={userId}>
                        {user.name || user.email}
                      </option>
                    );
                  })}
                </select>
              </div>

              <Input
                label="Due date"
                type="date"
                value={form.dueDate}
                onChange={handleChange("dueDate")}
              />
            </div>

            {taskActivities.length ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Recent activity</h3>
                <div className="mt-4 space-y-3">
                  {taskActivities.map((activity) => (
                    <div key={activity.id || activity._id} className="rounded-2xl bg-white p-3 shadow-sm">
                      <p className="text-sm font-medium text-slate-700">
                        {activity.user?.name || "Unknown user"} {activity.action?.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {activity.details?.field ? `${activity.details.field} changed` : "Task updated"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatActivityDate(activity.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete task
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
