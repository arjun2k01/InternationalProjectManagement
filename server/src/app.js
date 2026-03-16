const cors = require("cors");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const routes = require("./routes");
const ApiError = require("./utils/ApiError");
const logger = require("./utils/logger");

const app = express();

const allowedOrigins = env.CLIENT_URL.split(",").map((origin) => origin.trim());

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(ApiError.forbidden("Origin not allowed by CORS policy."));
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(
  morgan(env.isProduction ? "combined" : "dev", {
    stream: logger.stream,
  })
);
app.use(express.json({ limit: "10kb" }));

app.use("/api/auth", authRateLimiter);
app.use("/api", routes);

app.use((req, _res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found.`));
});

app.use(errorHandler);

module.exports = app;
