const {
  assignTask,
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
  updateTaskStatus,
} = require("../services/task.service");
const { emitProjectEvent } = require("../sockets");
const catchAsync = require("../utils/catchAsync");

// ---------------------------------------------------------------------------
// POST /api/projects/:projectId/tasks
// ---------------------------------------------------------------------------
const createTaskHandler = catchAsync(async (req, res) => {
  const { projectId } = req.params;

  // Route validates "assigneeId" but the service reads "assignee"
  const payload = { ...req.body };
  if (payload.assigneeId !== undefined) {
    payload.assignee = payload.assigneeId;
    delete payload.assigneeId;
  }

  const task = await createTask(projectId, payload, req.user);

  emitProjectEvent(projectId, "task:created", { task });

  res.status(201).json({
    success: true,
    message: "Task created successfully.",
    data: task,
  });
});

// ---------------------------------------------------------------------------
// GET /api/projects/:projectId/tasks
// ---------------------------------------------------------------------------
const getProjectTasks = catchAsync(async (req, res) => {
  const { projectId } = req.params;

  // Map query "assigneeId" → "assignee" for the service filter
  const filters = { ...req.query };
  if (filters.assigneeId !== undefined) {
    filters.assignee = filters.assigneeId;
    delete filters.assigneeId;
  }

  const tasks = await listTasks(projectId, req.user, filters);

  res.status(200).json({
    success: true,
    data: tasks,
  });
});

// ---------------------------------------------------------------------------
// GET /api/projects/:projectId/tasks/:taskId
// ---------------------------------------------------------------------------
const getTaskByIdHandler = catchAsync(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await getTaskById(projectId, taskId, req.user);

  res.status(200).json({
    success: true,
    data: task,
  });
});

// ---------------------------------------------------------------------------
// PUT /api/projects/:projectId/tasks/:taskId
// ---------------------------------------------------------------------------
const updateTaskHandler = catchAsync(async (req, res) => {
  const { projectId, taskId } = req.params;

  const task = await updateTask(projectId, taskId, req.body, req.user);

  emitProjectEvent(projectId, "task:updated", { task });

  res.status(200).json({
    success: true,
    message: "Task updated successfully.",
    data: task,
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:projectId/tasks/:taskId
// ---------------------------------------------------------------------------
const deleteTaskHandler = catchAsync(async (req, res) => {
  const { projectId, taskId } = req.params;

  await deleteTask(projectId, taskId, req.user);

  emitProjectEvent(projectId, "task:deleted", { taskId });

  res.status(200).json({
    success: true,
    message: "Task deleted successfully.",
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/projects/:projectId/tasks/:taskId/status
// ---------------------------------------------------------------------------
const updateTaskStatusHandler = catchAsync(async (req, res) => {
  const { projectId, taskId } = req.params;

  const result = await updateTaskStatus(projectId, taskId, req.body, req.user);

  emitProjectEvent(projectId, "task:status_changed", {
    taskId,
    oldStatus: result.oldStatus,
    newStatus: result.newStatus,
    updatedBy: result.updatedBy,
  });

  res.status(200).json({
    success: true,
    message: "Task status updated successfully.",
    data: result.task,
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/projects/:projectId/tasks/:taskId/assign
// ---------------------------------------------------------------------------
const assignTaskHandler = catchAsync(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { assigneeId } = req.body;

  const task = await assignTask(projectId, taskId, assigneeId, req.user);

  emitProjectEvent(projectId, "task:assigned", {
    taskId,
    assignee: task.assignee,
  });

  res.status(200).json({
    success: true,
    message: "Task assigned successfully.",
    data: task,
  });
});

// ---------------------------------------------------------------------------
// Exports — names must match what the route files reference
// ---------------------------------------------------------------------------
module.exports = {
  assignTask: assignTaskHandler,
  createTask: createTaskHandler,
  deleteTask: deleteTaskHandler,
  getProjectTasks,
  getTaskById: getTaskByIdHandler,
  updateTask: updateTaskHandler,
  updateTaskStatus: updateTaskStatusHandler,
};
