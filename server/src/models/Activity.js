const mongoose = require("mongoose");

const { Schema } = mongoose;

const activityDetailsSchema = new Schema(
  {
    field: {
      type: String,
      trim: true,
      default: null,
    },
    oldValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const activitySchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required."],
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required."],
    },
    action: {
      type: String,
      required: [true, "Activity action is required."],
      enum: {
        values: [
          "created",
          "updated",
          "deleted",
          "status_changed",
          "assigned",
          "commented",
        ],
        message:
          "Activity action must be one of: created, updated, deleted, status_changed, assigned, commented.",
      },
    },
    details: {
      type: activityDetailsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

activitySchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", activitySchema);
