var express=require("express");
var router=express.Router();
var Deck=require("../models/deck");
var middleware=require("../middleware");

//INDEX-show all Decks
router.get("/", async function(req,res){
    try{
        //Get all Decks from DB
        const allDecks = await Deck.find({});
        res.render("decks/index",{decks:allDecks,currentUser:req.user});
    } catch(err){
        console.log(err);
        res.redirect("/decks");
    }
});

//CREATE-add new Deck to db 
router.post("/",middleware.isLoggedIn,async function(req,res){
 //get data from the campgrounsd array
  var name=req.body.name;
  var mobile=req.body.mobile;
  var email=req.body.email;
  var address=req.body.address;
  var price=req.body.price;
  var image=req.body.image;
  var stock=req.body.stock;
  var desc=req.body.description;
  var author={
      id: req.user._id,
      username: req.user.username
  }; 
  var newDeck={name:name,mobile:mobile,email:email,address:address,price:price,image:image,description:desc,author:author,stock:stock};
  try{
      //Create a new Deck and save to db
      await Deck.create(newDeck);
      res.redirect("/decks");
  } catch(err){
      console.log(err);
      res.redirect("/decks");
  }
});

//NEW- display form to create new Deck
router.get("/new",middleware.isLoggedIn,function(req, res) {
   res.render("decks/new.ejs"); 
});

//SHOW- shows some more info about one Deck
router.get("/:id",async function(req,res){
    try{
        //find the Deck with provided ID
        const foundDeck = await Deck.findById(req.params.id).populate("comments");
        if(!foundDeck){
            return res.redirect("/decks");
        }
        //render show template with Deck
        res.render("decks/show",{deck:foundDeck,currentUser:req.user});
    } catch(err){
        console.log(err);
        res.redirect("/decks");
    }
});

//EDIT Deck ROUTE
router.get("/:id/edit",middleware.checkDeckOwnership,async function(req, res) {
    try{
        const foundDeck = await Deck.findById(req.params.id);
        res.render("decks/edit",{deck:foundDeck});
    } catch(err){
        console.log(err);
        res.redirect("/decks");
    }
});
 
 
router.put("/:id",middleware.checkDeckOwnership,async function(req,res){
    try{
        //find and update the correct Deck
        await Deck.findByIdAndUpdate(req.params.id,req.body.group);
        //redirect somewhere(show page)
        res.redirect("/decks/"+req.params.id);
    } catch(err){
        console.log(err);
        res.redirect("/decks");
    }
}); 


//DESTROY CAMPGORUND ROUTE
router.delete("/:id",middleware.checkDeckOwnership,async function(req,res){
    try{
        await Deck.findByIdAndRemove(req.params.id);
        res.redirect("/decks");
    } catch(err){
        console.log(err);
        res.redirect("/decks");
    }
});


module.exports=router;