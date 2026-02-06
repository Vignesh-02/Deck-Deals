var express = require("express");
var router = express.Router({ mergeParams: true });
var Deck = require("../models/deck");
var Comment = require("../models/comment");
var middleware = require("../middleware");
var redisClient = require("../utils/redisClient");
var { commentValidators, handleValidationErrors, matchedData } = require("../middleware/validators");
var logger = require("../utils/logger");

//Comments New
router.get("/new",middleware.isLoggedIn, async function(req, res){
    try{
        // find deck by id
        const deck = await Deck.findById(req.params.id);
        res.render("comments/new", {deck: deck});
    } catch(err){
        logger.error({ err }, "Error in finding deck");
        res.redirect("/decks");
    }
});

// Create Comments
router.post("/", middleware.isLoggedIn, commentValidators, async function (req, res) {
   if (handleValidationErrors(req, res)) {
       return res.redirect("/decks/" + req.params.id + "/comments/new");
   }
   try {
       const deck = await Deck.findById(req.params.id);
       if (!deck) {
           return res.redirect("/decks");
       }
       var data = matchedData(req);
       var commentPayload = { text: data.comment.text };
       let comment = await Comment.create(commentPayload);
       //add username and id to comment
       comment.author.id = req.user._id;
       comment.author.username = req.user.username;
       //save comment
       await comment.save();
       deck.comments.push(comment);
       await deck.save();
       logger.debug({ commentId: comment._id, deckId: deck._id }, "Comment created");

       // Invalidate cache for this deck's show page
       try {
           await redisClient.del("decks:show:" + req.params.id);
       } catch (cacheErr) {
           logger.warn({ err: cacheErr }, "Error invalidating deck cache after comment is created");
       }

       res.redirect('/decks/' + deck._id);
   } catch(err){
       req.flash("error","Something went wrong");
       logger.error({ err }, "Comment create failed");
       res.redirect("/decks");
   }
});

//COMMENT EDIT ROUTE
router.get("/:comment_id/edit",middleware.checkCommentOwnership,async function(req,res){
    try{
        const foundComment = await Comment.findById(req.params.comment_id);
        res.render("comments/edit",{deck_id:req.params.id, comment: foundComment});        
    } catch(err){
        logger.error({ err }, "Comment edit: cannot find comment");
        res.redirect("back");
    }
});

//COMMENT UPDATE
router.put("/:comment_id", middleware.checkCommentOwnership, commentValidators, async function (req, res) {
    if (handleValidationErrors(req, res)) {
        return res.redirect("/decks/" + req.params.id + "/comments/" + req.params.comment_id + "/edit");
    }
    try {
        var data = matchedData(req);
        await Comment.findByIdAndUpdate(req.params.comment_id, { text: data.comment.text });

        // Invalidate cache for this deck's show page
        try {
            await redisClient.del("decks:show:" + req.params.id);
        } catch (cacheErr) {
            logger.warn({ err: cacheErr }, "Error invalidating deck cache after comment is updated");
        }

        res.redirect("/decks/"+req.params.id);
    } catch(err){
        logger.error({ err }, "Comment update failed");
        res.redirect("back");
    }
});

router.delete("/:comment_id",middleware.checkCommentOwnership,async function(req,res){
    try{

        await Comment.findByIdAndRemove(req.params.comment_id,req.body.comment);
        req.flash("success","Your Comment has been deleted");

        // Invalidate cache for this deck's show page
        try {
            await redisClient.del("decks:show:" + req.params.id);
        } catch (cacheErr) {
            logger.warn({ err: cacheErr }, "Error invalidating deck cache after comment delete");
        }

        res.redirect("/decks/"+req.params.id);
    } catch(err){
        logger.error({ err }, "Comment delete failed");
        res.redirect("back");
    }
});

module.exports = router;