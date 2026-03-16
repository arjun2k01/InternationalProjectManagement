const Activity = require("../models/Activity");
const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { recordActivity } = require("./activity.service");

// ---------------------------------------------------------------------------
// Helpers – population & authorisation
// ---------------------------------------------------------------------------

/**
 * Populate owner + members on a project query.
 */
const populateProject = (query) =>
  query
    .populate("owner", "name email role")
    .populate("members.user", "name email role");

/**
 * Check if a userId matches the project owner.
 */
const isOwner = (project, userId) =>
  String(project.owner?._id || project.owner) === String(userId);

/**
 * Check if a user (with role) has ANY access to the project.
 * Admins always pass.
 */
const hasProjectAccess = (project, user) =>
  user.role === "admin" ||
  isOwner(project, user.id) ||
  project.members.some(
    (member) => String(member.user?._id || member.user) === String(user.id)
  );

/**
 * Check if a user can manage (update/invite/remove) the project.
 * Owner, admin, or a member with "manager" role.
 */
const canManageProject = (project, user) =>
  user.role === "admin" ||
  isOwner(project, user.id) ||
  project.members.some(
    (member) =>
      String(member.user?._id || member.user) === String(user.id) &&
      member.role === "manager"
  );

/**
 * Fetch a project by ID or throw 404.
 */
const ensureProjectExists = async (projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw ApiError.notFound("Project not found.");
  }

  return project;
};

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * a) Create a new project.
 *
 * - Only admins and project_managers can create projects.
 * - The creator becomes the owner and is NOT added to the members array
 *   (the owner field already grants full access).
 *   NOTE: if you prefer the owner to also appear in members with role
 *   "manager", uncomment the block below.
 * - Returns the fully populated project document.
 */
const createProject = async ({ name, description, status }, user) => {
  if (!["admin", "project_manager"].includes(user.role)) {
    throw ApiError.forbidden("You do not have permission to create projects.");
  }

  const project = await Project.create({
    name,
    description,
    status: status || "active",
    owner: user.id,
    // Auto-add owner as "manager" member ↓
    // members: [{ user: user.id, role: "manager" }],
  });

  return populateProject(Project.findById(project.id));
};

/**
 * b) List projects the current user has access to.
 *
 * - Admins see every project.
 * - Other users see projects they own OR are a member of.
 * - Sorted by most-recently updated first.
 */
const listProjects = async (user) => {
  const query =
    user.role === "admin"
      ? {}
      : {
          $or: [{ owner: user.id }, { "members.user": user.id }],
        };

  return populateProject(Project.find(query).sort({ updatedAt: -1 })).lean();
};

/**
 * c) Get a single project by ID.
 *
 * - 404 if the project doesn't exist.
 * - 403 if the requesting user has no access.
 */
const getProjectById = async (projectId, user) => {
  const project = await populateProject(Project.findById(projectId));

  if (!project) {
    throw ApiError.notFound("Project not found.");
  }

  if (!hasProjectAccess(project, user)) {
    throw ApiError.forbidden("You do not have access to this project.");
  }

  return project;
};

/**
 * d) Update allowed project fields (name, description, status).
 *
 * - 404 if not found, 403 if user is not owner/manager/admin.
 * - Tracks each changed field and records an activity log entry.
 */
const updateProject = async (projectId, payload, user) => {
  const project = await ensureProjectExists(projectId);

  if (!canManageProject(project, user)) {
    throw ApiError.forbidden("You do not have permission to update this project.");
  }

  const allowedFields = ["name", "description", "status"];
  const changedFields = [];

  allowedFields.forEach((field) => {
    if (
      typeof payload[field] !== "undefined" &&
      payload[field] !== project[field]
    ) {
      changedFields.push({
        field,
        oldValue: project[field],
        newValue: payload[field],
      });
      project[field] = payload[field];
    }
  });

  await project.save();

  // Log an activity entry for every field that actually changed
  await Promise.all(
    changedFields.map((change) =>
      recordActivity({
        projectId: project.id,
        userId: user.id,
        action: "updated",
        details: change,
      })
    )
  );

  return populateProject(Project.findById(project.id));
};

/**
 * e) Delete a project AND all associated tasks and activities.
 *
 * - Only admins can delete projects.
 * - Cascade-deletes tasks and activity logs in parallel.
 */
const deleteProject = async (projectId, user) => {
  const project = await ensureProjectExists(projectId);

  const canDeleteProject =
    user.role === "admin" ||
    (user.role === "project_manager" && canManageProject(project, user));

  if (!canDeleteProject) {
    throw ApiError.forbidden("You do not have permission to delete this project.");
  }

  await Promise.all([
    Task.deleteMany({ project: project.id }),
    Activity.deleteMany({ project: project.id }),
    Project.findByIdAndDelete(project.id),
  ]);
};

/**
 * f) Add a member to a project.
 *
 * - Requester must be owner, manager, or admin → 403
 * - Target user must exist → 404
 * - Owner cannot be "added" again → 400
 * - Duplicate membership → 409
 * - Records an activity log entry.
 */
const addMemberToProject = async (projectId, { userId, email, role }, actor) => {
  const project = await ensureProjectExists(projectId);

  if (!canManageProject(project, actor)) {
    throw ApiError.forbidden("You do not have permission to manage project members.");
  }

  const normalizedEmail = email ? String(email).toLowerCase() : null;
  const user = userId
    ? await User.findById(userId)
    : await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  if (isOwner(project, user.id)) {
    throw ApiError.badRequest("Project owner is already part of the project.");
  }

  const isAlreadyMember = project.members.some(
    (member) => String(member.user) === String(user.id)
  );

  if (isAlreadyMember) {
    throw ApiError.conflict("User is already a member of this project.");
  }

  project.members.push({
    user: user.id,
    role: role || "member",
  });

  await project.save();

  await recordActivity({
    projectId: project.id,
    userId: actor.id,
    action: "updated",
    details: {
      field: "members",
      oldValue: null,
      newValue: {
        userId: user.id,
        email: user.email,
        role: role || "member",
      },
    },
  });

  return populateProject(Project.findById(project.id));
};

/**
 * g) Remove a member from a project.
 *
 * - Requester must be owner, manager, or admin → 403
 * - The owner can never be removed → 400
 * - Target must actually be a member → 404
 * - Records an activity log entry.
 */
const removeMemberFromProject = async (projectId, userId, actor) => {
  const project = await ensureProjectExists(projectId);

  if (!canManageProject(project, actor)) {
    throw ApiError.forbidden("You do not have permission to manage project members.");
  }

  if (isOwner(project, userId)) {
    throw ApiError.badRequest("Project owner cannot be removed.");
  }

  const existingMember = project.members.find(
    (member) => String(member.user) === String(userId)
  );

  if (!existingMember) {
    throw ApiError.notFound("User is not a member of this project.");
  }

  project.members = project.members.filter(
    (member) => String(member.user) !== String(userId)
  );

  await project.save();

  await recordActivity({
    projectId: project.id,
    userId: actor.id,
    action: "updated",
    details: {
      field: "members",
      oldValue: {
        userId,
        role: existingMember.role,
      },
      newValue: null,
    },
  });

  return populateProject(Project.findById(project.id));
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  addMemberToProject,
  canManageProject,
  createProject,
  deleteProject,
  getProjectById,
  hasProjectAccess,
  listProjects,
  removeMemberFromProject,
  updateProject,
};
