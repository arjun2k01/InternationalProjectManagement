const Project = require("../models/Project");
const logger = require("../utils/logger");

const getRoomName = (projectId) => `project:${projectId}`;
const getPresenceKey = (projectId) => `presence:project:${projectId}`;

const hasProjectAccess = (project, user) =>
  user.role === "admin" ||
  String(project.owner) === String(user.id) ||
  project.members.some((member) => String(member.user) === String(user.id));

const incrementPresence = async (redisClient, projectId, userId) => {
  const nextCount = await redisClient.hincrby(getPresenceKey(projectId), userId, 1);
  return Number(nextCount);
};

const decrementPresence = async (redisClient, projectId, userId) => {
  const nextCount = await redisClient.hincrby(getPresenceKey(projectId), userId, -1);

  if (nextCount <= 0) {
    await redisClient.hdel(getPresenceKey(projectId), userId);
    return 0;
  }

  return Number(nextCount);
};

const joinProjectRoom = async (io, socket, redisClient, projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new Error("Project not found.");
  }

  if (!hasProjectAccess(project, socket.user)) {
    throw new Error("You do not have access to this project.");
  }

  const normalizedProjectId = String(projectId);

  if (socket.data.joinedProjects.has(normalizedProjectId)) {
    return;
  }

  socket.join(getRoomName(normalizedProjectId));
  socket.data.joinedProjects.add(normalizedProjectId);

  const presenceCount = await incrementPresence(
    redisClient,
    normalizedProjectId,
    socket.user.id
  );

  if (presenceCount === 1) {
    io.to(getRoomName(normalizedProjectId)).emit("user:online", {
      userId: socket.user.id,
    });
  }
};

const leaveProjectRoom = async (io, socket, redisClient, projectId) => {
  const normalizedProjectId = String(projectId);

  if (!socket.data.joinedProjects.has(normalizedProjectId)) {
    return;
  }

  socket.leave(getRoomName(normalizedProjectId));
  socket.data.joinedProjects.delete(normalizedProjectId);

  const presenceCount = await decrementPresence(
    redisClient,
    normalizedProjectId,
    socket.user.id
  );

  if (presenceCount === 0) {
    io.to(getRoomName(normalizedProjectId)).emit("user:offline", {
      userId: socket.user.id,
    });
  }
};

const registerSocketHandlers = (io, socket, redisClient) => {
  socket.data.joinedProjects = new Set();

  socket.on("join:project", async ({ projectId } = {}) => {
    try {
      if (!projectId) {
        throw new Error("projectId is required.");
      }

      await joinProjectRoom(io, socket, redisClient, projectId);
    } catch (error) {
      logger.warn(`join:project failed for user ${socket.user.id}: ${error.message}`);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("leave:project", async ({ projectId } = {}) => {
    try {
      if (!projectId) {
        throw new Error("projectId is required.");
      }

      await leaveProjectRoom(io, socket, redisClient, projectId);
    } catch (error) {
      logger.warn(`leave:project failed for user ${socket.user.id}: ${error.message}`);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("disconnect", async (reason) => {
    const joinedProjects = Array.from(socket.data.joinedProjects || []);

    await Promise.allSettled(
      joinedProjects.map((projectId) =>
        leaveProjectRoom(io, socket, redisClient, projectId)
      )
    );

    logger.info(`Socket ${socket.id} disconnected: ${reason}`);
  });
};

module.exports = registerSocketHandlers;
