const { createClient } = require("redis");
const logger = require("./logger");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({ url: redisUrl });

redisClient.on("error", function (err) {
    logger.error({ err }, "Redis client error");
});

redisClient.connect().catch(function (err) {
    logger.error({ err }, "Redis connection error");
});

module.exports = redisClient;

