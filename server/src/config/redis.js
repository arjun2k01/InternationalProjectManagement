const Redis = require("ioredis");

const env = require("./env");
const logger = require("../utils/logger");

let redisClient;
let pubClient;
let subClient;
const REDIS_CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 3000);

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

const resetClients = () => {
  redisClient = null;
  pubClient = null;
  subClient = null;
};

const destroyClients = () => {
  [subClient, pubClient, redisClient].forEach((client) => {
    if (!client) {
      return;
    }

    try {
      client.disconnect();
    } catch (_error) {
      // Ignore disconnect errors during fallback cleanup.
    }
  });

  resetClients();
};

const withTimeout = (promise, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} connection timed out after ${REDIS_CONNECT_TIMEOUT_MS}ms.`));
      }, REDIS_CONNECT_TIMEOUT_MS);
    }),
  ]);

const connectClient = async (client, label) => {
  if (!client || ["ready", "connect", "connecting"].includes(client.status)) {
    return client;
  }

  await withTimeout(client.connect(), label);
  return client;
};

const connectRedis = async () => {
  ensureClients();
  logger.info("Connecting to Redis.");

  try {
    await Promise.all([
      connectClient(redisClient, "Redis cache client"),
      connectClient(pubClient, "Redis pub client"),
      connectClient(subClient, "Redis sub client"),
    ]);

    return {
      redisClient,
      pubClient,
      subClient,
    };
  } catch (error) {
    destroyClients();

    if (env.isProduction) {
      throw error;
    }

    logger.warn(
      `Redis is unavailable in development. Continuing without Redis-backed sockets. ${error.message}`
    );

    return {
      redisClient: null,
      pubClient: null,
      subClient: null,
    };
  }
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
  resetClients();
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
