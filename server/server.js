const http = require("http");

const app = require("./src/app");
const { connectDB, disconnectDB } = require("./src/config/db");
const env = require("./src/config/env");
const {
  closeRedisConnections,
  connectRedis,
  getRedisCacheClient,
  getRedisPubClient,
  getRedisSubClient,
} = require("./src/config/redis");
const { initializeSocketServer } = require("./src/sockets");
const logger = require("./src/utils/logger");

let server;
let io;
let isShuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received. Starting graceful shutdown.`);

  const forceShutdownTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out. Exiting forcefully.");
    process.exit(1);
  }, 10000);

  forceShutdownTimer.unref();

  try {
    if (io) {
      await new Promise((resolve) => {
        io.close(() => resolve());
      });
      logger.info("Socket.IO server closed.");
    }

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      logger.info("HTTP server closed.");
    }

    await Promise.allSettled([disconnectDB(), closeRedisConnections()]);
    clearTimeout(forceShutdownTimer);
    logger.info("Shutdown completed.");
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forceShutdownTimer);
    logger.error(`Shutdown failed: ${error.stack || error.message}`);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    logger.info("Starting backend server.");
    await connectDB();
    const redisConnections = await connectRedis();

    server = http.createServer(app);
    io = initializeSocketServer(
      server,
      redisConnections || {
        pubClient: getRedisPubClient(),
        subClient: getRedisSubClient(),
        redisClient: getRedisCacheClient(),
      }
    );

    server.listen(env.PORT, () => {
      logger.info(
        `Server listening on port ${env.PORT} in ${env.NODE_ENV} mode.`
      );
    });
  } catch (error) {
    logger.error(`Startup failed: ${error.stack || error.message}`);
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled promise rejection: ${reason?.stack || reason}`);
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error) => {
  logger.error(`Uncaught exception: ${error.stack || error.message}`);
  shutdown("uncaughtException", 1);
});

startServer();
