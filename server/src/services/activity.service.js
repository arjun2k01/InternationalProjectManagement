const Activity = require("../models/Activity");
const Project = require("../models/Project");
const ApiError = require("../utils/ApiError");

// ---------------------------------------------------------------------------
// Helpers – authorisation
// ---------------------------------------------------------------------------

/**
 * Check if the userId matches the project owner.
 */
const isOwner = (project, userId) =>
  String(project.owner) === String(userId);

/**
 * Check if the user is a member of the project (any role).
 */
const isMember = (project, userId) =>
  project.members.some(
    (member) => String(member.user) === String(userId)
  );

/**
 * Determine if a user may view the activity log.
 * Admins, the owner, and any project member can see activities.
 */
const canViewActivityLog = (project, user) =>
  user.role === "admin" ||
  isOwner(project, user.id) ||
  isMember(project, user.id);

/**
 * Load a project and verify the user has activity-viewing permission.
 */
const ensureProjectForActivity = async (projectId, user) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw ApiError.notFound("Project not found.");
  }

  if (!canViewActivityLog(project, user)) {
    throw ApiError.forbidden("You do not have permission to view activity logs.");
  }

  return project;
};

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * a) Log a new activity entry.
 *
 * This is typically called internally by other services (project, task)
 * whenever a significant action occurs.
 *
 * @param {Object}  params
 * @param {string}  params.projectId  – The project this activity belongs to
 * @param {string}  [params.taskId]   – Optional related task
 * @param {string}  params.userId     – The user who performed the action
 * @param {string}  params.action     – One of: created, updated, deleted,
 *                                       status_changed, assigned, commented
 * @param {Object}  [params.details]  – { field, oldValue, newValue }
 * @returns {Promise<Document>}       – The created activity document
 */
const recordActivity = async ({
  projectId,
  taskId = null,
  userId,
  action,
  details = null,
}) =>
  Activity.create({
    project: projectId,
    task: taskId,
    user: userId,
    action,
    details,
  });

/**
 * b) Get paginated activity entries for a project.
 *
 * - Verifies the requesting user has view-access → 403
 * - Populates user (name, email) and task (title)
 * - Sorted by createdAt descending (newest first)
 * - Default pagination: page 1, limit 20
 *
 * @param {string} projectId
 * @param {Object} user       – The authenticated user (with id & role)
 * @param {number} [page=1]
 * @param {number} [limit=20]
 * @returns {Promise<{ activities, total, page, totalPages }>}
 */
const listProjectActivities = async (
  projectId,
  user,
  page = 1,
  limit = 20
) => {
  await ensureProjectForActivity(projectId, user);

  const currentPage = Math.max(1, Number(page) || 1);
  const perPage = Math.max(1, Math.min(100, Number(limit) || 20));
  const skip = (currentPage - 1) * perPage;

  const [activities, total] = await Promise.all([
    Activity.find({ project: projectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate("user", "name email role")
      .populate("task", "title status priority assignee")
      .lean(),
    Activity.countDocuments({ project: projectId }),
  ]);

  return {
    activities,
    total,
    page: currentPage,
    totalPages: Math.ceil(total / perPage) || 1,
  };
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  listProjectActivities,
  recordActivity,
};
