const express = require("express");
const { body, query } = require("express-validator");

const taskController = require("../controllers/task.controller");
const { validate, validateObjectId } = require("../middleware/validate");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .post(
    validate([
      body("title")
        .isString()
        .withMessage("Task title must be a string.")
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage("Task title must be between 1 and 200 characters."),
      body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string.")
        .isLength({ max: 2000 })
        .withMessage("Description cannot exceed 2000 characters."),
      body("assigneeId")
        .optional({ nullable: true })
        .isMongoId()
        .withMessage("assigneeId must be a valid ObjectId."),
      body("status")
        .optional()
        .isIn(["todo", "in_progress", "in_review", "done"])
        .withMessage("Status must be one of: todo, in_progress, in_review, done."),
      body("priority")
        .optional()
        .isIn(["low", "medium", "high", "critical"])
        .withMessage("Priority must be one of: low, medium, high, critical."),
      body("dueDate")
        .optional({ nullable: true })
        .isISO8601()
        .withMessage("dueDate must be a valid ISO 8601 date."),
      body("order")
        .optional()
        .isInt({ min: 0 })
        .withMessage("order must be a non-negative integer."),
    ]),
    taskController.createTask
  )
  .get(
    validate([
      query("status")
        .optional()
        .isIn(["todo", "in_progress", "in_review", "done"])
        .withMessage("Status must be one of: todo, in_progress, in_review, done."),
      query("priority")
        .optional()
        .isIn(["low", "medium", "high", "critical"])
        .withMessage("Priority must be one of: low, medium, high, critical."),
      query("assigneeId")
        .optional()
        .isMongoId()
        .withMessage("assigneeId must be a valid ObjectId."),
    ]),
    taskController.getProjectTasks
  );

router
  .route("/:taskId")
  .get(
    validate([validateObjectId("taskId")]),
    taskController.getTaskById
  )
  .put(
    validate([
      validateObjectId("taskId"),
      body("title")
        .optional()
        .isString()
        .withMessage("Task title must be a string.")
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage("Task title must be between 1 and 200 characters."),
      body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string.")
        .isLength({ max: 2000 })
        .withMessage("Description cannot exceed 2000 characters."),
      body("priority")
        .optional()
        .isIn(["low", "medium", "high", "critical"])
        .withMessage("Priority must be one of: low, medium, high, critical."),
      body("dueDate")
        .optional({ nullable: true })
        .isISO8601()
        .withMessage("dueDate must be a valid ISO 8601 date."),
      body("order")
        .optional()
        .isInt({ min: 0 })
        .withMessage("order must be a non-negative integer."),
    ]),
    taskController.updateTask
  )
  .delete(validate([validateObjectId("taskId")]), taskController.deleteTask);

router.patch(
  "/:taskId/status",
  validate([
    validateObjectId("taskId"),
    body("status")
      .notEmpty()
      .isIn(["todo", "in_progress", "in_review", "done"])
      .withMessage("Status must be one of: todo, in_progress, in_review, done."),
    body("order")
      .optional()
      .isInt({ min: 0 })
      .withMessage("order must be a non-negative integer."),
  ]),
  taskController.updateTaskStatus
);

router.patch(
  "/:taskId/assign",
  validate([
    validateObjectId("taskId"),
    body("assigneeId")
      .custom((value) => value === null || /^[0-9a-fA-F]{24}$/.test(value))
      .withMessage("assigneeId must be null or a valid ObjectId."),
  ]),
  taskController.assignTask
);

module.exports = router;
