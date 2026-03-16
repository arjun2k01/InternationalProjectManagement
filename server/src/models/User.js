const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const { Schema } = mongoose;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_SALT_ROUNDS = 10;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long."],
      maxlength: [50, "Name cannot exceed 50 characters."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator(value) {
          return EMAIL_REGEX.test(value);
        },
        message: "Please provide a valid email address.",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [6, "Password must be at least 6 characters long."],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "project_manager", "member"],
        message: "Role must be one of: admin, project_manager, member.",
      },
      default: "member",
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true });

userSchema.pre("save", async function hashPassword(next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }

    this.password = await bcrypt.hash(this.password, PASSWORD_SALT_ROUNDS);
    return next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword
) {
  if (!candidatePassword || !this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.compareRefreshToken = async function compareRefreshToken(
  candidateToken
) {
  if (!candidateToken || !this.refreshToken) {
    return false;
  }

  return bcrypt.compare(candidateToken, this.refreshToken);
};

userSchema.methods.toJSON = function toJSON() {
  const document = this.toObject();
  delete document.password;
  delete document.refreshToken;
  delete document.__v;
  return document;
};

module.exports = mongoose.model("User", userSchema);
