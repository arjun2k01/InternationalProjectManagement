const express = require("express");
const { body } = require("express-validator");

const activityController = require("../controllers/activity.controller");
const projectController = require("../controllers/project.controller");
const taskRoutes = require("./task.routes");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roleCheck");
const { validate, validateObjectId } = require("../middleware/validate");

const router = express.Router();

router.use(authenticate);

router
  .route("/")
  .post(
    authorize("admin", "project_manager"),
    validate([
      body("name")
        .isString()
        .withMessage("Project name must be a string.")
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Project name must be between 1 and 100 characters."),
      body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string.")
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters."),
    ]),
    projectController.createProject
  )
  .get(projectController.getUserProjects);

router.get(
  "/:projectId/activities",
  validate([validateObjectId("projectId")]),
  activityController.getProjectActivities
);

router.post(
  "/:id/members",
  validate([
    validateObjectId("id"),
    body("email")
      .isEmail()
      .withMessage("A valid email is required.")
      .normalizeEmail(),
    body("role")
      .isString()
      .withMessage("Role must be a string.")
      .isIn(["manager", "member"])
      .withMessage("Role must be manager or member."),
  ]),
  projectController.addMember
);

router.delete(
  "/:id/members/:userId",
  validate([validateObjectId("id"), validateObjectId("userId")]),
  projectController.removeMember
);

router
  .route("/:id")
  .get(validate([validateObjectId("id")]), projectController.getProjectById)
  .put(
    validate([
      validateObjectId("id"),
      body("name")
        .optional()
        .isString()
        .withMessage("Project name must be a string.")
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Project name must be between 1 and 100 characters."),
      body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string.")
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters."),
    ]),
    projectController.updateProject
  )
  .delete(
    validate([validateObjectId("id")]),
    authorize("admin", "project_manager"),
    projectController.deleteProject
  );

router.use(
  "/:projectId/tasks",
  validate([validateObjectId("projectId")]),
  taskRoutes
);

module.exports = router;
