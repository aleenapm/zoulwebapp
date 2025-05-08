const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    message:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:['unread','read'],
        default:"unread",
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

const Notification = mongoose.model("Notification",notificationSchema);
module.exports = Notification;
