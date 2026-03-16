import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import CreateTaskModal from "./CreateTaskModal";
import OnlineUsers from "./OnlineUsers";
import TaskColumn from "./TaskColumn";
import TaskDetail from "./TaskDetail";

const columns = [
  { key: "todo", title: "Todo" },
  { key: "in_progress", title: "In Progress" },
  { key: "in_review", title: "In Review" },
  { key: "done", title: "Done" },
];

export default function TaskBoard({
  activities = [],
  members = [],
  onAssignTask,
  onCreateTask,
  onDeleteTask,
  onStatusChange,
  onUpdateTask,
  onlineUsers,
  projectId,
  taskStore,
  tasks,
}) {
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [createStatus, setCreateStatus] = useState(null);

  const boardTasks = tasks ?? taskStore?.tasks ?? [];
  const boardOnlineUsers = onlineUsers ?? taskStore?.onlineUsers ?? [];
  const selectedTask = boardTasks.find(
    (task) => String(task.id || task._id) === String(selectedTaskId)
  );

  const tasksByStatus = useMemo(() => {
    return columns.reduce((accumulator, column) => {
      accumulator[column.key] = boardTasks.filter(
        (task) => (task.status || "todo") === column.key
      );
      return accumulator;
    }, {});
  }, [boardTasks]);

  const createAction = onCreateTask || taskStore?.createTask;
  const updateAction = onUpdateTask || taskStore?.updateTask;
  const deleteAction = onDeleteTask || taskStore?.deleteTask;
  const statusAction = onStatusChange || taskStore?.updateTaskStatus;
  const assignAction = onAssignTask || taskStore?.assignTask;

  const handleStatusChange = async (task, status) => {
    const currentStatus = task?.status || "todo";
    const taskId = task?.id || task?._id;

    if (!taskId || currentStatus === status) {
      return;
    }

    if (!statusAction || !projectId) {
      toast.error("Task status update is not configured.");
      return;
    }

    try {
      await statusAction(projectId, taskId, { status });
      toast.success("Task moved.");
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Unable to move task."
      );
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Board</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Real-time task board</h2>
          </div>

          <OnlineUsers users={boardOnlineUsers} />
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((column) => (
            <TaskColumn
              key={column.key}
              title={column.title}
              status={column.key}
              tasks={tasksByStatus[column.key] || []}
              onAddTask={setCreateStatus}
              onOpenTask={(task) => setSelectedTaskId(task.id || task._id)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      </div>

      <CreateTaskModal
        isOpen={Boolean(createStatus)}
        onClose={() => setCreateStatus(null)}
        onCreate={createAction}
        projectId={projectId}
        members={members}
        defaultStatus={createStatus || "todo"}
      />

      <TaskDetail
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId("")}
        task={selectedTask}
        members={members}
        activities={activities}
        onSave={updateAction}
        onDelete={deleteAction}
        onStatusChange={statusAction}
        onAssignTask={assignAction}
        projectId={projectId}
      />
    </>
  );
}
