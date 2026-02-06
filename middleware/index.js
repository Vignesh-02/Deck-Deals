var Deck = require("../models/deck");
var Comment = require("../models/comment");
var logger = require("../utils/logger");

// all the middleware goes here
var middlewareObj={};

middlewareObj.checkDeckOwnership = async function(req,res,next){
    //is user logged in
    if(req.isAuthenticated()){
        try{
            const foundDeck = await Deck.findById(req.params.id);
            if(!foundDeck){
                req.flash("error","Deck not found");
                return res.redirect("back");
            }
            //does user own the Deck?
            if(foundDeck.author.id.equals(req.user._id)){
                return next();
            }else{
                req.flash("error","You do not have permmission to do that");
                return res.redirect("back");
            }
        } catch(err){
            logger.error({ err }, "checkDeckOwnership: find deck");
            req.flash("error","Deck not found");
            return res.redirect("back");
        }
    }else{
        req.flash("error","You need to be logged in to do that");
        res.redirect("back");
    }
}


middlewareObj.checkCommentOwnership = async function(req,res,next){
    //is user logged in
    if(req.isAuthenticated()){
        try{
            const foundComment = await Comment.findById(req.params.comment_id);
            if(!foundComment){
                return res.redirect("back");
            }
            //does user own the comment?
            if(foundComment.author.id.equals(req.user._id)){
                return next();
            }else{
                req.flash("You don't have permmission to do that");
                return res.redirect("back");
            }
        } catch(err){
            logger.error({ err }, "checkCommentOwnership: find comment");
            return res.redirect("back");
        }
    }else{
        req.flash("error","You need to be logged in to do that");
        res.redirect("back");
    }
}

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error","You need to be logged in to do that");
    res.redirect("/login");
}

module.exports=middlewareObj;


// In Express, res.redirect("back") sends the user back to the URL in the request’s Referer (or Referrer) header.
// If the browser sent a Referer header (e.g. user came from /decks/123), res.redirect("back") redirects them there.
// If there is no Referer header, Express falls back to / (the site root) by default.