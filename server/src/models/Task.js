const mongoose = require("mongoose");

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required."],
      trim: true,
      minlength: [1, "Task title must be at least 1 character long."],
      maxlength: [200, "Task title cannot exceed 200 characters."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Task description cannot exceed 2000 characters."],
      default: "",
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required."],
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ["todo", "in_progress", "in_review", "done"],
        message:
          "Task status must be one of: todo, in_progress, in_review, done.",
      },
      default: "todo",
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "critical"],
        message:
          "Task priority must be one of: low, medium, high, critical.",
      },
      default: "medium",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
      min: [0, "Task order cannot be negative."],
      validate: {
        validator(value) {
          return Number.isInteger(value);
        },
        message: "Task order must be an integer.",
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required."],
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ project: 1, order: 1 });

module.exports = mongoose.model("Task", taskSchema);
