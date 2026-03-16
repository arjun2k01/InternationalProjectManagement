const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { recordActivity } = require("./activity.service");

// ---------------------------------------------------------------------------
// Helpers – population & authorisation
// ---------------------------------------------------------------------------

/**
 * Populate assignee and createdBy on a task query.
 */
const populateTask = (query) =>
  query
    .populate("assignee", "name email role")
    .populate("createdBy", "name email role");

/**
 * Check if a userId matches the project owner.
 */
const isOwner = (project, userId) =>
  String(project.owner) === String(userId);

/**
 * Check if a user has any access to the project.
 */
const hasProjectAccess = (project, user) =>
  user.role === "admin" ||
  isOwner(project, user.id) ||
  project.members.some(
    (member) => String(member.user) === String(user.id)
  );

/**
 * Check if a user can manage the project (owner, admin, or "manager" member).
 */
const canManageProject = (project, user) =>
  user.role === "admin" ||
  isOwner(project, user.id) ||
  project.members.some(
    (member) =>
      String(member.user) === String(user.id) && member.role === "manager"
  );

/**
 * Fetch project and verify the user is at least a member. Throws 404 / 403.
 */
const ensureProjectAccess = async (projectId, user) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw ApiError.notFound("Project not found.");
  }

  if (!hasProjectAccess(project, user)) {
    throw ApiError.forbidden("You do not have access to this project.");
  }

  return project;
};

/**
 * Fetch project and verify the user can manage it. Throws 404 / 403.
 */
const ensureProjectManagement = async (projectId, user) => {
  const project = await ensureProjectAccess(projectId, user);

  if (!canManageProject(project, user)) {
    throw ApiError.forbidden("You do not have permission to manage this project.");
  }

  return project;
};

/**
 * Fetch a task that belongs to a specific project. Throws 404.
 */
const ensureTaskInProject = async (projectId, taskId) => {
  const task = await Task.findOne({ _id: taskId, project: projectId });

  if (!task) {
    throw ApiError.notFound("Task not found.");
  }

  return task;
};

/**
 * Verify that the given assigneeId is either the project owner or a member.
 * Returns null when no assigneeId is provided.
 */
const ensureAssignableUser = async (project, assigneeId) => {
  if (!assigneeId) {
    return null;
  }

  const user = await User.findById(assigneeId);

  if (!user) {
    throw ApiError.notFound("Assignee not found.");
  }

  const isProjectOwner = String(project.owner) === String(assigneeId);
  const isProjectMember = project.members.some(
    (member) => String(member.user) === String(assigneeId)
  );

  if (!isProjectOwner && !isProjectMember) {
    throw ApiError.badRequest("Assignee must belong to the project.");
  }

  return user;
};

/**
 * Determine the next sequential order for a task in a given status column.
 */
const getNextOrder = async (projectId, status) => {
  const lastTask = await Task.findOne({ project: projectId, status })
    .sort({ order: -1 })
    .select("order");

  return lastTask ? lastTask.order + 1 : 1;
};

/**
 * Serialise a value for safe comparison & storage in activity log details.
 */
const serializeValue = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * a) Create a new task inside a project.
 *
 * - Verify user is a member of the project → 403
 * - Determine the next order number for the target status column
 * - Create the task document
 * - Log a "created" activity
 * - Return the populated task
 */
const createTask = async (projectId, payload, user) => {
  const project = await ensureProjectAccess(projectId, user);

  if (payload.assignee) {
    await ensureAssignableUser(project, payload.assignee);
  }

  const status = payload.status || "todo";
  const order =
    Number.isInteger(payload.order) && payload.order >= 0
      ? payload.order
      : await getNextOrder(projectId, status);

  const task = await Task.create({
    title: payload.title,
    description: payload.description || "",
    project: projectId,
    assignee: payload.assignee || null,
    status,
    priority: payload.priority || "medium",
    dueDate: payload.dueDate || null,
    order,
    createdBy: user.id,
  });

  await recordActivity({
    projectId,
    taskId: task.id,
    userId: user.id,
    action: "created",
    details: {
      field: "task",
      oldValue: null,
      newValue: {
        title: task.title,
        status: task.status,
      },
    },
  });

  return populateTask(Task.findById(task.id)).lean();
};

/**
 * b) List all tasks for a project, with optional filters.
 *
 * Supported filters:
 *  - status   (exact match)
 *  - assignee (exact ObjectId match)
 *  - priority (exact match)
 *  - search   (case-insensitive regex across title AND description)
 *
 * Results are sorted by status → order → createdAt.
 */
const listTasks = async (projectId, user, filters = {}) => {
  await ensureProjectAccess(projectId, user);

  const query = { project: projectId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.assignee) {
    query.assignee = filters.assignee;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, "i");
    query.$or = [{ title: searchRegex }, { description: searchRegex }];
  }

  return populateTask(
    Task.find(query).sort({ status: 1, order: 1, createdAt: 1 })
  ).lean();
};

/**
 * c) Get a single task by ID within a project.
 *
 * - 404 if the task doesn't exist or doesn't belong to the project.
 * - 403 if the user isn't a project member.
 */
const getTaskById = async (projectId, taskId, user) => {
  await ensureProjectAccess(projectId, user);

  const task = await populateTask(
    Task.findOne({ _id: taskId, project: projectId })
  ).lean();

  if (!task) {
    throw ApiError.notFound("Task not found.");
  }

  return task;
};

/**
 * d) Update editable task fields (title, description, priority, dueDate, order).
 *
 * - Checks project membership → 403
 * - Tracks every changed field → logs an "updated" activity for each
 */
const updateTask = async (projectId, taskId, payload, user) => {
  await ensureProjectAccess(projectId, user);
  const task = await ensureTaskInProject(projectId, taskId);

  const updatableFields = ["title", "description", "priority", "dueDate", "order"];
  const changes = [];

  updatableFields.forEach((field) => {
    if (typeof payload[field] !== "undefined") {
      const oldValue = serializeValue(task[field]);
      const newValue = serializeValue(payload[field]);

      if (oldValue !== newValue) {
        task[field] = payload[field];
        changes.push({
          field,
          oldValue,
          newValue,
        });
      }
    }
  });

  await task.save();

  // Log an activity entry for every field that actually changed
  await Promise.all(
    changes.map((change) =>
      recordActivity({
        projectId,
        taskId: task.id,
        userId: user.id,
        action: "updated",
        details: change,
      })
    )
  );

  return populateTask(Task.findById(task.id)).lean();
};

/**
 * e) Update ONLY the task status (and optionally its order within the new column).
 *
 * - 403 if user is not a member of the project
 * - Logs a "status_changed" activity with oldValue / newValue
 * - Returns { task, oldStatus, newStatus, updatedBy } so the controller can
 *   emit a socket event.
 */
const updateTaskStatus = async (projectId, taskId, { status, order }, user) => {
  await ensureProjectAccess(projectId, user);
  const task = await ensureTaskInProject(projectId, taskId);

  const oldStatus = task.status;
  const oldOrder = task.order;

  // Short-circuit when nothing actually changes
  if (oldStatus === status && (!order || Number(order) === oldOrder)) {
    return {
      task: await populateTask(Task.findById(task.id)).lean(),
      oldStatus,
      newStatus: status,
      updatedBy: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  // Determine the order value for the new column
  const newOrder =
    Number.isInteger(order) && order >= 0
      ? order
      : oldStatus === status
        ? oldOrder
        : await getNextOrder(projectId, status);

  task.status = status;
  task.order = newOrder;
  await task.save();

  await recordActivity({
    projectId,
    taskId: task.id,
    userId: user.id,
    action: "status_changed",
    details: {
      field: "status",
      oldValue: oldStatus,
      newValue: status,
    },
  });

  const populatedTask = await populateTask(Task.findById(task.id)).lean();

  return {
    task: populatedTask,
    oldStatus,
    newStatus: status,
    updatedBy: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
};

/**
 * f) Delete a task.
 *
 * - Only managers / owners / admins can delete (ensureProjectManagement).
 * - Logs a "deleted" activity before removing the document.
 */
const deleteTask = async (projectId, taskId, user) => {
  await ensureProjectManagement(projectId, user);
  const task = await ensureTaskInProject(projectId, taskId);

  await recordActivity({
    projectId,
    taskId: task.id,
    userId: user.id,
    action: "deleted",
    details: {
      field: "task",
      oldValue: {
        title: task.title,
        status: task.status,
      },
      newValue: null,
    },
  });

  await task.deleteOne();
};

/**
 * g) Assign (or unassign) a task.
 *
 * - User must be owner/manager/admin of the project → 403
 * - If assigneeId is provided, the target must also be a project member → 400
 * - Logs an "assigned" activity.
 */
const assignTask = async (projectId, taskId, assigneeId, user) => {
  const project = await ensureProjectManagement(projectId, user);
  const task = await ensureTaskInProject(projectId, taskId);

  if (assigneeId) {
    await ensureAssignableUser(project, assigneeId);
  }

  const oldAssignee = task.assignee ? String(task.assignee) : null;
  task.assignee = assigneeId || null;
  await task.save();

  await recordActivity({
    projectId,
    taskId: task.id,
    userId: user.id,
    action: "assigned",
    details: {
      field: "assignee",
      oldValue: oldAssignee,
      newValue: assigneeId || null,
    },
  });

  return populateTask(Task.findById(task.id)).lean();
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  assignTask,
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
  updateTaskStatus,
};
