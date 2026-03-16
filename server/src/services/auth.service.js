const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

// ---------------------------------------------------------------------------
// Helpers – token generation
// ---------------------------------------------------------------------------

/**
 * Sign a short-lived access token.
 * Payload includes user id, email, role, and token type.
 */
const generateAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRY }
  );

/**
 * Sign a long-lived refresh token.
 * Payload is intentionally minimal (user id + type).
 */
const generateRefreshToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      type: "refresh",
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY }
  );

// ---------------------------------------------------------------------------
// Helpers – persistence & sanitisation
// ---------------------------------------------------------------------------

/**
 * Hash and persist the refresh token on the user document so we can validate
 * it later on /refresh and /logout requests.
 */
const persistRefreshToken = async (userId, rawRefreshToken) => {
  const hashed = await bcrypt.hash(rawRefreshToken, 12);
  await User.findByIdAndUpdate(userId, { refreshToken: hashed });
};

/**
 * Strip sensitive fields before returning a user object to the client.
 */
const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Build a complete auth response (user + tokens).
 * Used by register, login and refresh flows.
 */
const buildAuthResponse = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await persistRefreshToken(user.id, refreshToken);

  return {
    user: sanitizeUser(user),
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_EXPIRY,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRY,
    },
  };
};

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Register a new user.
 *
 * Steps:
 *  1. Check for duplicate email → 409
 *  2. Create the user document (password is hashed by the pre-save hook)
 *  3. Generate access + refresh tokens
 *  4. Persist the hashed refresh token
 *  5. Return the sanitised user and both tokens
 */
const registerUser = async ({ name, email, password }) => {
  const normalised = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalised });

  if (existingUser) {
    throw ApiError.conflict("A user with this email already exists.");
  }

  const user = await User.create({
    name,
    email: normalised,
    password,
    role: "member",
  });

  return buildAuthResponse(user);
};

/**
 * Authenticate an existing user with email + password.
 *
 * Steps:
 *  1. Look up by email (explicitly selecting password + refreshToken)
 *  2. Validate password → 401 on mismatch
 *  3. Return auth payload
 */
const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password +refreshToken"
  );

  if (!user) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw ApiError.unauthorized("Invalid email or password.");
  }

  return buildAuthResponse(user);
};

/**
 * Exchange a valid refresh token for a new access token (and rotate the
 * refresh token at the same time for better security).
 *
 * Steps:
 *  1. Verify the JWT signature + expiry
 *  2. Confirm stored (hashed) refresh token still matches → 401
 *  3. Issue a fresh pair of tokens
 */
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw ApiError.unauthorized("Refresh token is required.");
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch (_error) {
    throw ApiError.unauthorized("Invalid or expired refresh token.");
  }

  if (decoded.type !== "refresh") {
    throw ApiError.unauthorized("Invalid refresh token type.");
  }

  const user = await User.findById(decoded.sub).select("+refreshToken");

  if (!user || !user.refreshToken) {
    throw ApiError.unauthorized("Refresh token is no longer valid.");
  }

  const isRefreshTokenValid = await user.compareRefreshToken(refreshToken);

  if (!isRefreshTokenValid) {
    throw ApiError.unauthorized("Refresh token is no longer valid.");
  }

  // Rotate tokens – issue brand-new access + refresh pair
  return buildAuthResponse(user);
};

/**
 * Log the user out by clearing the stored refresh token.
 *
 * Accepts either an authenticated userId (from the JWT middleware) or a raw
 * refreshToken so the client can log out without a valid access token.
 */
const logoutUser = async ({ userId, refreshToken }) => {
  if (userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return;
  }

  if (!refreshToken) {
    throw ApiError.badRequest("Refresh token is required to logout.");
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch (_error) {
    throw ApiError.unauthorized("Invalid or expired refresh token.");
  }

  await User.findByIdAndUpdate(decoded.sub, { refreshToken: null });
};

/**
 * Return the currently authenticated user's profile.
 */
const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select("-password -refreshToken");

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  return sanitizeUser(user);
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
};
