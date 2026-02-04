var express=require("express");
var router=express.Router();
var passport=require("passport");
var User=require("../models/user");

//root route
router.get("/",function(req,res){
    res.render("landing",{currentUser:req.user});
}); 

//show register form
router.get("/register",function(req,res){
    res.render("register",{currentUser:req.user});
}); 


//handling user sign up
router.post("/register", function (req, res) {
  const { username, password } = req.body;

  if (!username || username.length < 5) {
    req.flash("error", "Username must be at least 5 characters long.");
    return res.render("register", { currentUser: req.user });
  }

  if (!password || password.length < 8) {
    req.flash("error", "Password must be at least 8 characters long.");
    return res.render("register", { currentUser: req.user });
  }

  User.register(new User({ username }), password, function (err, user) {
    if (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.render("register", { currentUser: req.user });
    }
    passport.authenticate("local")(req, res, function (err) {
      if (err) {
        req.flash("error", "Error signing you in after registration");
        return res.redirect("/login");
      }
      req.flash(
        "success",
        "Welcome to The Land of Magic, " + user.username
      );
      res.redirect("/decks");
    });
  });
});

router.get("/login",function(req, res) {
    res.render("login",{currentUser:req.user});
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/decks",
    failureRedirect: "/login",
    failureFlash: true
  })
);

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
                console.error("Error regenerating session on logout:", err);
                return res.redirect("/decks");
            }

            req.flash("success", "Logged you out!");
            res.redirect("/decks");
        });
    });
});


module.exports=router;