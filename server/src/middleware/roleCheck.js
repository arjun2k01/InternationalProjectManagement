const Project = require("../models/Project");
const ApiError = require("../utils/ApiError");

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized("Authentication is required."));
  }

  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden("Not authorized"));
  }

  return next();
};

const isProjectMember = async (req, _res, next) => {
  try {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication is required."));
    }

    const projectId = req.params.id || req.params.projectId;

    if (!projectId) {
      return next(ApiError.badRequest("Project ID is required."));
    }

    const project = await Project.findById(projectId).select("owner members status");

    if (!project) {
      return next(ApiError.notFound("Project not found."));
    }

    const userId = String(req.user.id);
    const isOwner = String(project.owner) === userId;
    const memberExists = project.members.some(
      (member) => String(member.user) === userId
    );

    if (req.user.role !== "admin" && !isOwner && !memberExists) {
      return next(ApiError.forbidden("Not authorized"));
    }

    req.project = project;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  authorize,
  isProjectMember,
};
