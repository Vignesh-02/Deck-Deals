var mongoose=require("mongoose");

var commentSchema=new mongoose.Schema({
    text:String,
    author:{
        id:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    username: String
    }
}, { timestamps: true });  

// Index comments by author for faster lookups
commentSchema.index({ "author.id": 1 });
 
module.exports=mongoose.model("Comment",commentSchema);  