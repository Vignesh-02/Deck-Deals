const env = require("dotenv");
env.config();

// 12 July 2022 2 AM MongoDB has been fixed now.

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

const url = process.env.MONGODB_URL;
mongoose.connect(url);

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());


// Make moment available in all templates
app.locals.moment = require("moment-timezone");




// changed testing

// PASSPORT CONFIGURATION
app.use(
    require("express-session")({
        secret: "Once again Rusty wins cutest dog!",
        resave: false,
        saveUninitialized: false,
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
