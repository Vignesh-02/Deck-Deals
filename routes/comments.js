var express = require("express");
var router  = express.Router({mergeParams: true});
var Deck = require("../models/deck");
var Comment = require("../models/comment");
var middleware=require("../middleware");

//Comments New
router.get("/new",middleware.isLoggedIn, async function(req, res){
    try{
        // find deck by id
        const deck = await Deck.findById(req.params.id);
        res.render("comments/new", {deck: deck});
    } catch(err){
        console.log(err);
        res.redirect("/decks");
    }
});

//Comments Create
router.post("/",middleware.isLoggedIn,async function(req, res){
   try{
       //lookup deck using ID
       const deck = await Deck.findById(req.params.id);
       if(!deck){
           return res.redirect("/decks");
       }
       let comment = await Comment.create(req.body.comment);
       //add username and id to comment
       comment.author.id = req.user._id;
       comment.author.username = req.user.username;
       //save comment
       await comment.save();
       deck.comments.push(comment);
       await deck.save();
       console.log(comment);
       res.redirect('/decks/' + deck._id);
   } catch(err){
       req.flash("error","Something went wrong");
       console.log(err);
       res.redirect("/decks");
   }
});

//COMMENT EDIT ROUTE
router.get("/:comment_id/edit",middleware.checkCommentOwnership,async function(req,res){
    try{
        const foundComment = await Comment.findById(req.params.comment_id);
        res.render("comments/edit",{deck_id:req.params.id, comment: foundComment});        
    } catch(err){
        console.log(err);
        res.redirect("back");
    }
});

//COMMENT UPDATE
router.put("/:comment_id",middleware.checkCommentOwnership,async function(req,res){
    try{
        await Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment);
        res.redirect("/decks/"+req.params.id);
    } catch(err){
        console.log(err);
        res.redirect("back");
    }
});

//COMMENT DESTROY ROUTE
router.delete("/:comment_id",middleware.checkCommentOwnership,async function(req,res){
    try{
        //findByIdAndRemove
        await Comment.findByIdAndRemove(req.params.comment_id,req.body.comment);
        req.flash("success","Your Comment has been deleted");
        res.redirect("/decks/"+req.params.id);
    } catch(err){
        console.log(err);
        res.redirect("back");
    }
});

module.exports = router;