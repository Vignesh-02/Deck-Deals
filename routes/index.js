var express=require("express");
var router=express.Router();
var passport=require("passport");
var User=require("../models/user");

//root route
router.get("/",function(req,res){
    res.render("landing",{currentUser:req.user});
   // res.send("This will be a landing page soon");
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
    passport.authenticate("local")(req, res, function () {
      req.flash(
        "success",
        "Welcome to The Land of Magic, magical " + user.username
      );
      res.redirect("/decks");
    });
  });
});

//show login form
router.get("/login",function(req, res) {
    res.render("login",{currentUser:req.user});
});

//handling login logic
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/decks",
    failureRedirect: "/login",
    failureFlash: true
  })
);

//logout route
router.get("/logout",function(req, res) {
    req.logout();
    req.flash("success","Logged you out!");
    res.redirect("/decks");
});


module.exports=router;