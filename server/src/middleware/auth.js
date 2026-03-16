const jwt = require("jsonwebtoken");

const env = require("../config/env");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const extractBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
};

const findUserFromToken = async (token) => {
  if (!token) {
    throw ApiError.unauthorized("Authentication token is required.");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (_error) {
    throw ApiError.unauthorized("Invalid or expired token.");
  }

  const userId = decoded.id || decoded.sub;

  if (!userId) {
    throw ApiError.unauthorized("Invalid token payload.");
  }

  const user = await User.findById(userId).select("-password -refreshToken");

  if (!user) {
    throw ApiError.unauthorized("User not found.");
  }

  return user;
};

const authenticate = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization || "");
    const user = await findUserFromToken(token);

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const user = await findUserFromToken(token);

    socket.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  authenticateSocket,
};
