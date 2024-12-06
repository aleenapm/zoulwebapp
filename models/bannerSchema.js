const mongoose = require("mongoose");
const {Schema} = mongoose;

const bannerSchema = new Schema({
    image:{
        type:String,
        required:true
    },
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    link:{
        type:String
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    },
    hidden: { type: Boolean, default: false },
    createdAt:{
        type:Date,
        default:Date.now
    }
})

const Banner = mongoose.model("Banner",bannerSchema);

module.exports = Banner;