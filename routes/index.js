var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var { registerValidators, loginValidators, handleValidationErrors } = require("../middleware/validators");
var logger = require("../utils/logger");

//root route
router.get("/",function(req,res){
    res.render("landing",{currentUser:req.user});
}); 

//show register form
router.get("/register",function(req,res){
    res.render("register",{currentUser:req.user});
}); 


//handling user sign up
router.post("/register", registerValidators, function (req, res) {
  var validationError = handleValidationErrors(req, res);
  if (validationError) {
    return res.render("register", { currentUser: req.user, error: validationError });
  }
  const { username, password } = req.body;

  User.register(new User({ username }), password, function (err, user) {
    if (err) {
      logger.warn({ err }, "Register failed");
      return res.render("register", { currentUser: req.user, error: err.message });
    }
    passport.authenticate("local")(req, res, function (err) {
      if (err) {
        req.flash("error", "Error signing you in after registration");
        return res.redirect("/login");
      }
      req.flash(
        "success",
        "Welcome to Deck Deals, The Land of Magic, " + user.username
      );
      res.redirect("/decks");
    });
  });
});

router.get("/login",function(req, res) {
    res.render("login",{currentUser:req.user});
});

router.post("/login", loginValidators, function (req, res, next) {
  if (handleValidationErrors(req, res)) {
    return res.redirect("/login");
  }
  passport.authenticate("local", function (err, user, info) {
    if (err) return next(err);
    if (!user) {
      req.flash("error", info?.message || "Invalid username or password.");
      return res.redirect("/login");
    }
    req.login(user, function (err) {
      if (err) return next(err);
      req.flash("success", "Welcome back to Deck Deals, " + user.username + "!");
      return res.redirect("/decks");
    });
  })(req, res, next);
});

// logout route – log user out and rotate session so flash still works
router.post("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            req.flash("error", "Error logging out");
            return res.redirect("/decks");
        }

        // Regenerate a fresh anonymous session:
        // - old session (and its Redis key) is destroyed by express-session
        // - new empty session is created for this anonymous user
        // This allows us to safely use flash and redirect.
        req.session.regenerate(function (err) {
            if (err) {
                logger.error({ err }, "Error regenerating session on logout");
                return res.redirect("/decks");
            }

            req.flash("success", "Logged you out!");
            res.redirect("/decks");
        });
    });
});


module.exports=router;