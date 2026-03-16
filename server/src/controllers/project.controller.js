const {
  addMemberToProject,
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  removeMemberFromProject,
  updateProject,
} = require("../services/project.service");
const { emitProjectEvent } = require("../sockets");
const catchAsync = require("../utils/catchAsync");

// ---------------------------------------------------------------------------
// POST /api/projects
// ---------------------------------------------------------------------------
const createProjectHandler = catchAsync(async (req, res) => {
  const project = await createProject(req.body, req.user);

  res.status(201).json({
    success: true,
    message: "Project created successfully.",
    data: project,
  });
});

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------
const getUserProjects = catchAsync(async (req, res) => {
  const projects = await listProjects(req.user);

  res.status(200).json({
    success: true,
    data: projects,
  });
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id
// ---------------------------------------------------------------------------
const getProjectByIdHandler = catchAsync(async (req, res) => {
  const project = await getProjectById(req.params.id, req.user);

  res.status(200).json({
    success: true,
    data: project,
  });
});

// ---------------------------------------------------------------------------
// PUT /api/projects/:id
// ---------------------------------------------------------------------------
const updateProjectHandler = catchAsync(async (req, res) => {
  const project = await updateProject(req.params.id, req.body, req.user);

  res.status(200).json({
    success: true,
    message: "Project updated successfully.",
    data: project,
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id
// ---------------------------------------------------------------------------
const deleteProjectHandler = catchAsync(async (req, res) => {
  await deleteProject(req.params.id, req.user);

  res.status(200).json({
    success: true,
    message: "Project deleted successfully.",
  });
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/members
// ---------------------------------------------------------------------------
const addMember = catchAsync(async (req, res) => {
  const { email, role } = req.body;

  const project = await addMemberToProject(
    req.params.id,
    { email, role },
    req.user
  );

  // Find the newly added member to include in the socket event payload
  const addedMember = project.members.find(
    (member) => member.user?.email === email
  );

  emitProjectEvent(req.params.id, "member:joined", {
    user: addedMember
      ? {
          id: addedMember.user.id || addedMember.user._id,
          name: addedMember.user.name,
          email: addedMember.user.email,
          role: addedMember.role,
        }
      : { email },
  });

  res.status(200).json({
    success: true,
    message: "Member added successfully.",
    data: project,
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id/members/:userId
// ---------------------------------------------------------------------------
const removeMember = catchAsync(async (req, res) => {
  const project = await removeMemberFromProject(
    req.params.id,
    req.params.userId,
    req.user
  );

  emitProjectEvent(req.params.id, "member:left", {
    userId: req.params.userId,
  });

  res.status(200).json({
    success: true,
    message: "Member removed successfully.",
    data: project,
  });
});

// ---------------------------------------------------------------------------
// Exports — names must match what the route files reference
// ---------------------------------------------------------------------------
module.exports = {
  addMember,
  createProject: createProjectHandler,
  deleteProject: deleteProjectHandler,
  getProjectById: getProjectByIdHandler,
  getUserProjects,
  removeMember,
  updateProject: updateProjectHandler,
};
