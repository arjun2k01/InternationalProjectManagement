const Redis = require("ioredis");

const env = require("./env");
const logger = require("../utils/logger");

let redisClient;
let pubClient;
let subClient;

const attachRedisEvents = (client, label) => {
  client.on("connect", () => {
    logger.info(`${label} connected.`);
  });

  client.on("ready", () => {
    logger.info(`${label} ready.`);
  });

  client.on("error", (error) => {
    logger.error(`${label} error: ${error.message}`);
  });

  client.on("close", () => {
    logger.warn(`${label} connection closed.`);
  });

  client.on("reconnecting", (delay) => {
    logger.warn(`${label} reconnecting in ${delay}ms.`);
  });

  client.on("end", () => {
    logger.info(`${label} connection ended.`);
  });
};

const createRedisClient = (label) => {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times) {
      return Math.min(times * 200, 2000);
    },
  });

  attachRedisEvents(client, label);
  return client;
};

const ensureClients = () => {
  if (!redisClient) {
    redisClient = createRedisClient("Redis cache client");
    pubClient = createRedisClient("Redis pub client");
    subClient = createRedisClient("Redis sub client");
  }
};

const connectClient = async (client) => {
  if (!client || ["ready", "connect", "connecting"].includes(client.status)) {
    return client;
  }

  await client.connect();
  return client;
};

const connectRedis = async () => {
  ensureClients();

  await Promise.all([
    connectClient(redisClient),
    connectClient(pubClient),
    connectClient(subClient),
  ]);

  return {
    redisClient,
    pubClient,
    subClient,
  };
};

const closeClient = async (client, label) => {
  if (!client || client.status === "end") {
    return;
  }

  try {
    await client.quit();
    logger.info(`${label} closed.`);
  } catch (error) {
    logger.error(`${label} close failed: ${error.message}`);
    client.disconnect();
  }
};

const closeRedisConnections = async () => {
  await Promise.all([
    closeClient(subClient, "Redis sub client"),
    closeClient(pubClient, "Redis pub client"),
    closeClient(redisClient, "Redis cache client"),
  ]);
};

const getRedisCacheClient = () => redisClient;
const getRedisPubClient = () => pubClient;
const getRedisSubClient = () => subClient;

module.exports = {
  closeRedisConnections,
  connectRedis,
  getRedisCacheClient,
  getRedisPubClient,
  getRedisSubClient,
};
