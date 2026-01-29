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


module.exports=mongoose.model("decks",deckSchema);
    
