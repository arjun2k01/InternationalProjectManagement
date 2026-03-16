const priorityStyles = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

const statusOptions = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

function formatDueDate(value) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function TaskCard({
  onClick,
  onDragStart,
  onStatusChange,
  task,
}) {
  const assignee = task?.assignee;
  const priority = task?.priority || "medium";

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart?.(event, task)}
      onClick={() => onClick?.(task)}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">{task?.title}</h4>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
            priorityStyles[priority] || priorityStyles.medium,
          ].join(" ")}
        >
          {priority}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
          {getInitials(assignee?.name || assignee?.email || "U")}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-700">
            {assignee?.name || "Unassigned"}
          </p>
          <p className="text-xs text-slate-500">{formatDueDate(task?.dueDate)}</p>
        </div>
      </div>

      <div className="mt-4">
        <label
          className="block text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400"
          onClick={(event) => event.stopPropagation()}
        >
          Move to
        </label>
        <select
          value={task?.status || "todo"}
          onChange={(event) => onStatusChange?.(task, event.target.value)}
          onClick={(event) => event.stopPropagation()}
          className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
