var pino = require("pino");

var level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
var isProduction = process.env.NODE_ENV === "production";

var opts = {
    level: level,
};
if (!isProduction) {
    opts.transport = {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
        },
    };
}

var logger = pino(opts);

module.exports = logger;
