const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,  
  },
  transactions: [
    {
      type: {
        type: String,
        enum: ['credit', 'debit', 'refund','referal'],  
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        default: Date.now,
      },
      description: {
        type: String,
        default: '',
      },
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order', 
        required: false,
      },
      productName: { // New field for product name
        type: String,
        default: '',
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

walletSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
