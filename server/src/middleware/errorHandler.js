const mongoose = require("mongoose");

const ApiError = require("../utils/ApiError");
const env = require("../config/env");
const logger = require("../utils/logger");

const errorHandler = (error, _req, res, _next) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let details;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed.";
    details = Object.values(error.errors).map((fieldError) => ({
      field: fieldError.path,
      message: fieldError.message,
    }));
  } else if (error instanceof mongoose.Error.CastError || error.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  } else if (
    error.name === "TokenExpiredError" ||
    error.name === "JsonWebTokenError"
  ) {
    statusCode = 401;
    message =
      error.name === "TokenExpiredError"
        ? "Token has expired."
        : "Invalid token.";
  } else if (error.code === 11000) {
    statusCode = 409;
    const duplicateField = Object.keys(error.keyValue || {})[0] || "field";
    message = `${duplicateField} already exists.`;
  }

  if (statusCode >= 500) {
    logger.error(error.stack || error.message);
  } else {
    logger.warn(error.stack || error.message);
  }

  const errorResponse = {
    message,
  };

  if (details) {
    errorResponse.details = details;
  }

  if (!env.isProduction && error.stack) {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json({
    success: false,
    error: errorResponse,
  });
};

module.exports = errorHandler;
