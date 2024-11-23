const Razorpay = require('razorpay');
const crypto = require('crypto');



const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createRazorpay = async (req, res) => {
    const { amount, currency } = req.body;
  
    console.log("raz:",req.body);

    try {
        const options = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: currency || 'INR',
            receipt: `order_rcptid_${Date.now()}`
            
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ message: 'Unable to create order', error });
    }
};

module.exports = {
    createRazorpay
};