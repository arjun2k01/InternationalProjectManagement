const { createAdapter } = require("@socket.io/redis-adapter");
const { Server } = require("socket.io");

const env = require("../config/env");
const { authenticateSocket } = require("../middleware/auth");
const logger = require("../utils/logger");
const registerSocketHandlers = require("./handlers");

let ioInstance;

const initializeSocketServer = (
  httpServer,
  { pubClient = null, subClient = null, redisClient = null } = {}
) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL.split(",").map((origin) => origin.trim()),
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  if (pubClient && subClient) {
    ioInstance.adapter(createAdapter(pubClient, subClient));
    logger.info("Socket.IO Redis adapter enabled.");
  } else {
    logger.warn("Socket.IO Redis adapter disabled. Using in-memory socket adapter.");
  }

  ioInstance.use(authenticateSocket);

  ioInstance.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id} (${socket.user.email})`);
    registerSocketHandlers(ioInstance, socket, redisClient);
  });

  return ioInstance;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.IO server has not been initialized.");
  }

  return ioInstance;
};

const emitProjectEvent = (projectId, eventName, payload) => {
  getIO().to(`project:${projectId}`).emit(eventName, payload);
};

module.exports = {
  emitProjectEvent,
  getIO,
  initializeSocketServer,
};
