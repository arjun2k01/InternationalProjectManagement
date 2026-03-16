const Project = require("../models/Project");
const logger = require("../utils/logger");

const getRoomName = (projectId) => `project:${projectId}`;
const getPresenceKey = (projectId) => `presence:project:${projectId}`;
const inMemoryPresence = new Map();

const getSocketUserPayload = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const hasProjectAccess = (project, user) =>
  user.role === "admin" ||
  String(project.owner) === String(user.id) ||
  project.members.some((member) => String(member.user) === String(user.id));

const incrementLocalPresence = (projectId, userId) => {
  const projectPresence = inMemoryPresence.get(projectId) || new Map();
  const nextCount = Number(projectPresence.get(userId) || 0) + 1;

  projectPresence.set(userId, nextCount);
  inMemoryPresence.set(projectId, projectPresence);
  return nextCount;
};

const decrementLocalPresence = (projectId, userId) => {
  const projectPresence = inMemoryPresence.get(projectId);

  if (!projectPresence) {
    return 0;
  }

  const nextCount = Number(projectPresence.get(userId) || 0) - 1;

  if (nextCount <= 0) {
    projectPresence.delete(userId);
  } else {
    projectPresence.set(userId, nextCount);
  }

  if (projectPresence.size === 0) {
    inMemoryPresence.delete(projectId);
  } else {
    inMemoryPresence.set(projectId, projectPresence);
  }

  return Math.max(nextCount, 0);
};

const incrementPresence = async (redisClient, projectId, userId) => {
  if (!redisClient) {
    return incrementLocalPresence(projectId, userId);
  }

  const nextCount = await redisClient.hincrby(getPresenceKey(projectId), userId, 1);
  return Number(nextCount);
};

const decrementPresence = async (redisClient, projectId, userId) => {
  if (!redisClient) {
    return decrementLocalPresence(projectId, userId);
  }

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
    io.to(getRoomName(normalizedProjectId)).emit(
      "user:online",
      getSocketUserPayload(socket.user)
    );
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
    io.to(getRoomName(normalizedProjectId)).emit(
      "user:offline",
      getSocketUserPayload(socket.user)
    );
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
