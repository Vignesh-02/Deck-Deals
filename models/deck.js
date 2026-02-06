var mongoose=require("mongoose");

var deckSchema=new mongoose.Schema({
    name:String,
    mobile:String,
    email:String,
    address:String,
    price:String,
    image:String,
    description:String,
    author:{
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    stock:String,
    comments: [ 
        { 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment' 
        }
    ]
});

// Indexes for common access patterns
deckSchema.index({ "author.id": 1 });
deckSchema.index({ name: 1 });

module.exports=mongoose.model("decks",deckSchema);
    
    