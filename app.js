const env = require("dotenv");
env.config();

const { RedisStore } = require("connect-redis");
const { RedisStore: RateLimitRedisStore } = require("rate-limit-redis");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const redisClient = require("./utils/redisClient");
const logger = require("./utils/logger");



var express = require("express"),
    helmet = require("helmet"),
    app = express(),
    mongoose = require("mongoose"),
    flash = require("connect-flash"),
    passport = require("passport"),
    methodOverride = require("method-override"),
    LocalStrategy = require("passport-local"),
    User = require("./models/user");

// Trust proxy so cookies work behind reverse proxies (e.g. load balancers, nginx)
app.set("trust proxy", 1);

// Secure HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                "default-src": ["'self'"],
                "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
                "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                "font-src": ["'self'", "https://fonts.gstatic.com"],
                "img-src": ["'self'", "data:", "https:"],
                "connect-src": ["'self'"],
            },
        },
    })
);

const url = process.env.MONGODB_URL;
mongoose.connect(url);

const redisStore = new RedisStore({
    client: redisClient,
    prefix: "deck-deals:sess:",
});

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

// Health check for load balancers and monitoring (before rate limit so it isn't throttled)
app.get("/health", async function (req, res) {
    var mongoOk = mongoose.connection.readyState === 1;
    var redisOk = false;
    try {
        await redisClient.ping();
        redisOk = true;
    } catch (e) {
        // redis not reachable
    }
    var ok = mongoOk && redisOk;
    res.status(ok ? 200 : 503).json({
        status: ok ? "ok" : "degraded",
        mongo: mongoOk ? "up" : "down",
        redis: redisOk ? "up" : "down",
    });
});

// Swagger API docs (before rate limit so monitoring/dev doesn't throttle)
var swaggerUi = require("swagger-ui-express");
var swaggerDocument = require("./docs/swagger");

if (process.env.NODE_ENV !== "production") {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Rate limit Redis store factory (limits shared across instances and survive restarts)
function createRateLimitStore(prefix) {
    return new RateLimitRedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: "deck-deals:rl:" + prefix + ":",
    });
}

// Rate limiting – general (per IP); relaxed in development so dev browsing doesn't hit the limit
const generalLimitMax = process.env.NODE_ENV === "production" ? 150 : 2000;
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: generalLimitMax,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("general"),
});
app.use(generalLimiter);

// Make moment available in all templates
app.locals.moment = require("moment-timezone");




// changed testing

// PASSPORT CONFIGURATION – session stored in Redis, cookie set on client
app.use(
    session({
        store: redisStore,
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
    }),
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

// Stricter rate limit for auth routes (brute-force protection), after session so we can flash
// Only apply to POST so viewing the login/register form doesn't count or cause redirect loops
const authLimitMax = process.env.NODE_ENV === "production" ? 15 : 50;
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: authLimitMax,
    message: "Too many login or sign-up attempts, please try again after 15 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("auth"),
    handler: function (req, res, next, options) {
        req.flash("error", options.message);
        res.redirect(req.originalUrl.startsWith("/register") ? "/register" : "/login");
    },
});
app.use("/login", function (req, res, next) {
    if (req.method !== "POST") return next();
    authLimiter(req, res, next);
});
app.use("/register", function (req, res, next) {
    if (req.method !== "POST") return next();
    authLimiter(req, res, next);
});

//requring routes
var commentRoutes = require("./routes/comments"),
    deckRoutes = require("./routes/decks"),
    indexRoutes = require("./routes/index");

app.use("/", indexRoutes);
app.use("/decks", deckRoutes);
app.use("/decks/:id/comments", commentRoutes);

// 404 – no route matched
app.use(function (req, res, next) {
    res.status(404).render("errors/404", { currentUser: req.user });
});

// Central error handler – 500; in production do not send stack to client
app.use(function (err, req, res, next) {
    logger.error({ err }, "Error");
    var isProduction = process.env.NODE_ENV === "production";
    res.status(500).render("errors/500", {
        currentUser: req.user,
        message: isProduction ? "We’re sorry, something went wrong. Please try again later." : (err.message || "Something went wrong."),
        stack: isProduction ? undefined : (err.stack || ""),
    });
});

const port = process.env.PORT || 4001;
const server = app.listen(port, function () {
    logger.info({ port }, "Server listening");
});


// Graceful shutdown: on SIGTERM/SIGINT, stop accepting requests, close Redis/Mongo, then exit
function shutdown(signal) {
    logger.info({ signal }, "Shutdown received, closing server and connections");
    server.close(function () {
        logger.info("HTTP server closed");
        mongoose.connection.close(false).then(function () {
            logger.info("MongoDB connection closed");
            return redisClient.quit();
        }).then(function () {
            logger.info("Redis connection closed");
            process.exit(0);
        }).catch(function (err) {
            logger.error({ err }, "Error during shutdown");
            process.exit(1);
        });
    });
    // Force exit after 10s if shutdown hangs
    setTimeout(function () {
        logger.error("Forced exit after 10s");
        process.exit(1);
    }, 10000);
}

process.on("SIGTERM", function () { shutdown("SIGTERM"); });
process.on("SIGINT", function () { shutdown("SIGINT"); });
