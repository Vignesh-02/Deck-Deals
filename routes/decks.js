var express = require("express");
var router = express.Router();
var Deck = require("../models/deck");
var middleware = require("../middleware");
var redisClient = require("../utils/redisClient");
var { deckCreateValidators, deckUpdateValidators, handleValidationErrors, matchedData } = require("../middleware/validators");
var logger = require("../utils/logger");

//INDEX-show all Decks (cached)
router.get("/", async function(req,res){
    const cacheKey = "decks:all";
    try{
        // Try cache first
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            const decks = JSON.parse(cached);
            return res.render("decks/index",{decks:decks,currentUser:req.user});
        }

        // Fallback to DB
        const allDecks = await Deck.find({});

        // Cache for 10 minutes to keep things fast and reasonably fresh
        try {
            await redisClient.setEx(cacheKey, 600, JSON.stringify(allDecks));
        } catch (cacheErr) {
            logger.warn({ err: cacheErr }, "Error caching decks index");
        }

        res.render("decks/index",{decks:allDecks,currentUser:req.user});
    } catch(err){
        logger.error({ err }, "Decks index failed");
        res.redirect("/decks");
    }
});

//CREATE-add new Deck to db 
router.post("/", middleware.isLoggedIn, deckCreateValidators, async function (req, res) {
  if (handleValidationErrors(req, res)) {
    return res.redirect("/decks/new");
  }
  var data = matchedData(req);
  var author = { id: req.user._id, username: req.user.username };
  var newDeck = {
    name: data.name,
    mobile: data.mobile,
    email: data.email,
    address: data.address,
    price: String(data.price),
    image: data.image,
    description: data.description || "",
    stock: String(data.stock),
    author: author,
  };
  try {
      //Create a new Deck and save to db
      const createdDeck = await Deck.create(newDeck);

      // Invalidate decks index cache
      try {
          await redisClient.del("decks:all");
      } catch (cacheErr) {
          logger.warn({ err: cacheErr }, "Error invalidating decks index cache after deck is created");
      }

      res.redirect("/decks");
  } catch(err){
      logger.error({ err }, "Deck create failed");
      res.redirect("/decks");
  }
});

//NEW- display form to create new Deck
router.get("/new",middleware.isLoggedIn,function(req, res) {
   res.render("decks/new.ejs"); 
});

//SHOW- shows some more info about one Deck (cached)
router.get("/:id",async function(req,res){
    const id = req.params.id;
    const cacheKey = "decks:show:" + id;
    try{
        // Try cache first
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            const deck = JSON.parse(cached);
            return res.render("decks/show",{deck:deck,currentUser:req.user});
        }

        //find the Deck with provided ID
        const foundDeck = await Deck.findById(id).populate("comments");
        if(!foundDeck){
            return res.redirect("/decks");
        }

        // Cache the deck (including populated comments) for 10 minutes
        try {
            await redisClient.setEx(cacheKey, 600, JSON.stringify(foundDeck));
        } catch (cacheErr) {
            logger.warn({ err: cacheErr }, "Error caching deck");
        }

        //render show template with Deck
        res.render("decks/show",{deck:foundDeck,currentUser:req.user});
    } catch(err){
        logger.error({ err }, "Failed to render deck/show");
        res.redirect("/decks");
    }
});

router.get("/:id/edit",middleware.checkDeckOwnership,async function(req, res) {
    try{
        const foundDeck = await Deck.findById(req.params.id);
        res.render("decks/edit",{deck:foundDeck});
    } catch(err){
        logger.error({ err }, "Deck edit: find deck failed");
        res.redirect("/decks");
    }
});
 
 
router.put("/:id", middleware.checkDeckOwnership, deckUpdateValidators, async function (req, res) {
    if (handleValidationErrors(req, res)) {
      return res.redirect("/decks/" + req.params.id + "/edit");
    }
    try {
        var data = matchedData(req);
        var group = data.group;
        await Deck.findByIdAndUpdate(req.params.id, {
          name: group.name,
          mobile: group.mobile,
          email: group.email,
          address: group.address,
          price: String(group.price),
          image: group.image,
          description: group.description || "",
          stock: String(group.stock),
        });

        // Invalidate caches for this deck and index
        try {
            await redisClient.del("decks:all");
            await redisClient.del("decks:show:" + req.params.id);
        } catch (cacheErr) {
            logger.warn({ err: cacheErr }, "Error invalidating deck caches after update");
        }

        res.redirect("/decks/"+req.params.id);
    } catch(err){
        logger.error({ err }, "Deck update failed");
        res.redirect("/decks");
    }
}); 


router.delete("/:id",middleware.checkDeckOwnership,async function(req,res){
    try{
        await Deck.findByIdAndRemove(req.params.id);

        // Invalidate caches for this deck and index
        try {
            await redisClient.del("decks:all");
            await redisClient.del("decks:show:" + req.params.id);
        } catch (cacheErr) {
            logger.warn({ err: cacheErr }, "Error invalidating deck caches after delete");
        }

        res.redirect("/decks");
    } catch(err){
        logger.error({ err }, "Deck delete failed");
        res.redirect("/decks");
    }
});


module.exports=router;