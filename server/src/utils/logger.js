const fs = require("fs");
const path = require("path");

const { createLogger, format, transports } = require("winston");

const logsDirectory = path.resolve(__dirname, "../../logs");

if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory, { recursive: true });
}

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.errors({ stack: true }),
        format.printf(
          ({ timestamp, level, message, stack }) =>
            `${timestamp} [${level}]: ${stack || message}`
        )
      ),
    }),
    new transports.File({
      filename: path.join(logsDirectory, "error.log"),
      level: "error",
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.errors({ stack: true }),
        format.json()
      ),
    }),
    new transports.File({
      filename: path.join(logsDirectory, "combined.log"),
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.errors({ stack: true }),
        format.json()
      ),
    }),
  ],
});

logger.stream = {
  write(message) {
    logger.http(message.trim());
  },
};

module.exports = logger;
