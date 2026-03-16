import { useState } from "react";

import Button from "../common/Button";
import TaskCard from "./TaskCard";

export default function TaskColumn({
  onAddTask,
  onOpenTask,
  onStatusChange,
  status,
  tasks = [],
  title,
}) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);

    const rawPayload = event.dataTransfer.getData("application/json");

    if (!rawPayload) {
      return;
    }

    try {
      const task = JSON.parse(rawPayload);
      onStatusChange?.(task, status);
    } catch (_error) {
      // ignore malformed drag payloads
    }
  };

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      className={[
        "min-h-[22rem] rounded-3xl border bg-slate-50/70 p-4 transition-all",
        isDragActive ? "border-slate-400 shadow-inner" : "border-slate-200",
      ].join(" ")}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-400">{tasks.length} task{tasks.length === 1 ? "" : "s"}</p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => onAddTask?.(status)}>
          Add
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.length ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id || task._id}
              task={task}
              onClick={onOpenTask}
              onStatusChange={onStatusChange}
              onDragStart={(event, draggedTask) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("application/json", JSON.stringify(draggedTask));
              }}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-4 text-center text-sm text-slate-400">
            Drop tasks here or add a new one.
          </div>
        )}
      </div>
    </section>
  );
}
