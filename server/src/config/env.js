const dotenv = require("dotenv");

dotenv.config();

const REQUIRED_ENV_VARS = [
  "PORT",
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_EXPIRY",
  "JWT_REFRESH_EXPIRY",
  "REDIS_URL",
  "CLIENT_URL",
  "NODE_ENV",
];

const ALLOWED_NODE_ENVS = new Set(["development", "test", "production"]);

const missingEnvVars = REQUIRED_ENV_VARS.filter(
  (key) => !process.env[key] || !String(process.env[key]).trim()
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

if (!ALLOWED_NODE_ENVS.has(process.env.NODE_ENV)) {
  throw new Error(
    `NODE_ENV must be one of: ${Array.from(ALLOWED_NODE_ENVS).join(", ")}`
  );
}

const parsedPort = Number(process.env.PORT);

if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
  throw new Error("PORT must be a positive integer.");
}

const env = Object.freeze({
  PORT: parsedPort,
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY,
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY,
  REDIS_URL: process.env.REDIS_URL,
  CLIENT_URL: process.env.CLIENT_URL,
  isProduction: process.env.NODE_ENV === "production",
});

module.exports = env;
