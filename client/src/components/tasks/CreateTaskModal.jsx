import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Button from "../common/Button";
import Input from "../common/Input";
import Modal from "../common/Modal";

export default function CreateTaskModal({
  defaultStatus = "todo",
  isOpen,
  members = [],
  onClose,
  onCreate,
  projectId,
  taskStore,
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    assigneeId: "",
    dueDate: "",
    status: defaultStatus,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm((current) => ({ ...current, status: defaultStatus }));
      return;
    }

    setForm({
      title: "",
      description: "",
      priority: "medium",
      assigneeId: "",
      dueDate: "",
      status: defaultStatus,
    });
    setErrors({});
    setSubmitting(false);
  }, [defaultStatus, isOpen]);

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Task title is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const createAction = onCreate || taskStore?.createTask;

    if (!createAction || !projectId) {
      toast.error("Task creation is not configured.");
      return;
    }

    try {
      setSubmitting(true);
      await createAction(projectId, {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate || null,
        status: form.status,
      });
      toast.success("Task created.");
      onClose?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Unable to create task."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create task"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-task-form" loading={submitting}>
            Create task
          </Button>
        </div>
      }
    >
      <form id="create-task-form" onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Title"
          value={form.title}
          onChange={updateField("title")}
          error={errors.title}
          placeholder="Prepare sprint kickoff"
        />

        <Input
          label="Description"
          type="textarea"
          rows={5}
          value={form.description}
          onChange={updateField("description")}
          placeholder="Add any notes, context, or implementation details."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Priority</label>
            <select
              value={form.priority}
              onChange={updateField("priority")}
              className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Status</label>
            <select
              value={form.status}
              onChange={updateField("status")}
              className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
            >
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Assignee</label>
            <select
              value={form.assigneeId}
              onChange={updateField("assigneeId")}
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
            onChange={updateField("dueDate")}
          />
        </div>
      </form>
    </Modal>
  );
}
