const mongoose = require("mongoose");

const env = require("./env");
const logger = require("../utils/logger");

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 3000;

let eventsBound = false;

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const bindConnectionEvents = () => {
  if (eventsBound) {
    return;
  }

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connection established.");
  });

  mongoose.connection.on("error", (error) => {
    logger.error(`MongoDB connection error: ${error.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected.");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected.");
  });

  eventsBound = true;
};

const connectDB = async (attempt = 1) => {
  bindConnectionEvents();
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: !env.isProduction,
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
    });

    return mongoose.connection;
  } catch (error) {
    logger.error(
      `MongoDB connection attempt ${attempt} failed: ${error.message}`
    );

    if (attempt >= MAX_RETRIES) {
      throw error;
    }

    const retryDelay = BASE_RETRY_DELAY_MS * attempt;
    logger.warn(`Retrying MongoDB connection in ${retryDelay}ms.`);
    await wait(retryDelay);
    return connectDB(attempt + 1);
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
