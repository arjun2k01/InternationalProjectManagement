const mongoose = require("mongoose");

const { Schema } = mongoose;

const projectMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Member user is required."],
    },
    role: {
      type: String,
      enum: {
        values: ["manager", "member"],
        message: "Member role must be either manager or member.",
      },
      default: "member",
      required: [true, "Member role is required."],
    },
  },
  {
    _id: false,
  }
);

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required."],
      trim: true,
      minlength: [1, "Project name must be at least 1 character long."],
      maxlength: [100, "Project name cannot exceed 100 characters."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Project description cannot exceed 500 characters."],
      default: "",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Project owner is required."],
    },
    members: {
      type: [projectMemberSchema],
      default: [],
      validate: {
        validator(members) {
          const memberIds = members.map((member) => String(member.user));
          return new Set(memberIds).size === memberIds.length;
        },
        message: "Project members must be unique.",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["active", "archived"],
        message: "Project status must be either active or archived.",
      },
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

projectSchema.index({ owner: 1 });
projectSchema.index({ "members.user": 1 });
projectSchema.index({ status: 1 });

projectSchema.virtual("taskCount", {
  ref: "Task",
  localField: "_id",
  foreignField: "project",
  count: true,
});

module.exports = mongoose.model("Project", projectSchema);
