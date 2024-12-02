const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order= require('../../models/orderSchema');
const Product = require('../../models/productSchema')


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createRazorpay = async (req, res) => { 
    const { amount, currency } = req.body;
  
    console.log("raz:",req.body);

    try {
        const options = {
            amount: Math.round(amount * 100),
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
const updatePaymentStatus = async (req, res) => {
    try {

        const { paymentId, orderId,razorpayId, signature,status } = req.body;
        console.log(req.body)

        const generatedSignature = crypto.createHmac('sha256',"IHs9TMBRVQGHHwUIGR5sS8ve" )
            .update(razorpayId + "|" + paymentId)
            .digest('hex');
        console.log("generatedSignature:",generatedSignature,"signature:",signature)
        if (generatedSignature !== signature) {
            const order = await Order.findOneAndUpdate(
                { _id: orderId },
                { paymentStatus: 'Payment failed'},
                { new: true }
            );
            console.log("fail")
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found.' });
            }else{
                return res.status(400).json({ success: false, message: 'Payment  failed!' });
            }
            
        }

                                                                                                                        
        const order = await Order.findOneAndUpdate(
            { _id: orderId },
            { paymentStatus: status},
            { new: true }
        );
        if(order && order.orderedItems.length>0){
            for (const item of Object.values(order.orderedItems)) {
                await Product.findByIdAndUpdate(
                    { _id: item.product },
                    { $inc: { quantity: -item.quantity } }
                );
            }
        }
        console.log("success order",order)
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        return res.status(200).json({ success: true, orderId: order._id });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

module.exports = {
    createRazorpay,
    updatePaymentStatus
};