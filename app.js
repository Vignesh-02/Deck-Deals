const env = require("dotenv");
env.config();

const { createClient } = require("redis");
const { RedisStore } = require("connect-redis");
const session = require("express-session");


// another deployment
// another mock deployment

var express = require("express"),
    app = express(),
    mongoose = require("mongoose"),
    flash = require("connect-flash"),
    passport = require("passport"),
    methodOverride = require("method-override"),
    LocalStrategy = require("passport-local"),
    User = require("./models/user");

// Trust proxy so cookies work behind reverse proxies (e.g. load balancers, nginx)
app.set("trust proxy", 1);

const url = process.env.MONGODB_URL;
mongoose.connect(url);

// Redis client for session store
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = createClient({ url: redisUrl });
redisClient.connect().catch(function (err) {
    console.error("Redis connection error:", err);
});

const redisStore = new RedisStore({
    client: redisClient,
    prefix: "deck-deals:sess:",
});

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());


// Make moment available in all templates
app.locals.moment = require("moment-timezone");




// changed testing

// PASSPORT CONFIGURATION – session stored in Redis, cookie set on client
app.use(
    session({
        store: redisStore,
        secret: process.env.SESSION_SECRET || "Once again Rusty wins cutest dog!",
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

//requring routes
var commentRoutes = require("./routes/comments"),
    deckRoutes = require("./routes/decks"),
    indexRoutes = require("./routes/index");

app.use("/", indexRoutes);
app.use("/decks", deckRoutes);
app.use("/decks/:id/comments", commentRoutes);

const port = process.env.PORT || 4001;
app.listen(port, function () {
    console.log(`The Magical Ride Has Started! on port ${port}`);
});
