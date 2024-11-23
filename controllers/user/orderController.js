const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");

const getOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.query.id;  // Get orderId from the URL parameters
        // console.log("getOrder userId:", userId, "orderId:", orderId);

        const order = await Order.findOne({ _id: orderId, user: userId }) 
            .populate('orderedItems.product');

        if (!order) {
            return res.status(404).send("Order not found");
        }

        const subtotal = order.orderedItems.reduce((total, item) => total + item.price * item.quantity, 0);
        const shipping = order.shipping || 0;
        const discount = order.discount || 0;
        const totalAmount = subtotal - discount + shipping;

        return res.render("order", {
            products: order.orderedItems,
            subtotal,
            shipping,
            discount,
            totalAmount,
            email: order.address.email,
            phone: order.address.phone,
            shippingAddress: order.address,
            paymentMethod: order.paymentMethod,
            orderStatus: order.status
        });
    } catch (error) {
        console.log("Order page not loading:", error);
        res.status(500).send("Server Error");
    }
};


const createOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        let { cart, totalAmount, couponCode, paymentMethod, discount, addressId, singleProduct } = req.body;
        console.log("rebody:",req.body);
        

        // Validate addressId
        if (!addressId) {
            return res.status(400).json({ error: "Address is required." });
        }

        // Find the Address document for the given userId
        const userAddressDoc = await Address.findOne({ userId: userId });
        if (!userAddressDoc) {
            return res.status(400).json({ error: "Address not found." });
        }

        // Find the specific address inside the address array by matching addressId
        const specificAddress = userAddressDoc.address.find(
            (addr) => addr._id.toString() === addressId
        );
        if (!specificAddress) {
            return res.status(404).json({ error: "Address with provided ID not found." });
        }

        let orderedItems = [];

        // Add ordered items
        if (singleProduct) {
            const product = JSON.parse(singleProduct);
            orderedItems.push({
                product: product._id,
                quantity: 1,
                price: product.salePrice,
            });
        } else {
            // Check if `cart` is provided and is a valid JSON string
            try {
                const cartItems = JSON.parse(cart);
                
                // Ensure `cartItems` is an array before using `.map()`
                if (Array.isArray(cartItems)) {
                    orderedItems = cartItems.map(item => ({
                        product: item.productId,
                        quantity: item.quantity,
                        price: item.totalPrice / item.quantity,
                    }));
                } else {
                    return res.status(400).json({ error: "Cart items should be an array." });
                }
            } catch (err) {
                return res.status(400).json({ error: "Invalid cart data format." });
            }
        }

        const couponApplied = Boolean(couponCode && couponCode.trim() !== "");
        const parsedTotalPrice = Number(totalAmount) || 0;
        const parsedDiscount = Number(discount) || 0;

        let fullAmount = parsedTotalPrice + parsedDiscount;
        let convTotal = Number(fullAmount);
        let finAmount = totalAmount;
        let convfin = Number(finAmount);

        console.log("fullamt:",fullAmount);
        console.log("finalAmt:",finAmount);
        
        if (discount == 0) {
            couponCode = undefined;
        }

        // Prepare order data
        const orderData = {
            orderedItems,
            totalPrice: convTotal.toFixed(2),
            finalAmount: convfin.toFixed(2),
            couponCode: couponCode,
            discount,
            couponApplied,
            user: userId,
            address: specificAddress,
            paymentMethod,
        };
        

        if (paymentMethod === 'COD') {
            orderData.status = 'Pending';
            orderData.paymentStatus = 'Pending';
        } else if (paymentMethod === 'Online') {
            orderData.status = 'Pending';
            orderData.paymentStatus = 'Completed';
        }

        // Save coupon if applied
        if (discount !== 0) {
            await User.findByIdAndUpdate(userId, { $push: { redeemedcoupon: couponCode } });
        }

        // Create and save the order
        const newOrder = new Order(orderData);
        await newOrder.save();

        // Process post-order creation based on payment method
        if (paymentMethod === 'COD') {
            if (singleProduct) {
                const product = JSON.parse(singleProduct);
                await Product.findByIdAndUpdate(product._id, { $inc: { quantity: -1 } });
            }
            res.redirect(`/order?id=${newOrder._id}`);
        } else {
            res.json({ orderId: newOrder._id, finalAmount: finAmount });
        }

    } catch (error) {
        console.error("Error in placing order:", error);
        res.status(500).send("Internal Server Error");
    }
};



const getUserOrders = async (req, res) => {
    try {
      
      const userId = req.session.user;
      const orders = await Order.find({ user: userId }).sort({ createdOn: -1 });
  
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to retrieve orders' });
    }
};
  
const cancelOrder = async (req, res) => {
    const { orderId } = req.body;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'Pending') {
            return res.status(403).json({ message: 'Cannot cancel this order' });
        }

        if (order.paymentMethod === 'COD') {
            order.status = 'Cancelled';
            await order.save();
            return res.json({ message: 'Order cancelled successfully' });
        }

        if (order.paymentMethod === 'Online') {
            const userId = req.session.user;

            if (!userId) {
                console.error("User ID not found in session.");
                return res.status(400).json({ message: 'User not authenticated' });
            }

            const amount = order.finalAmount;

            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    balance: amount,
                    transactions: [{
                        type: 'refund',
                        amount,
                        orderId,
                        date: new Date(),
                        
                    }]
                });
            } else {
                wallet.balance += amount;
                wallet.transactions.push({
                    type: 'refund',
                    amount,
                    orderId,
                    date: new Date()
                });
            }

            await wallet.save();

            order.status = 'Cancelled';
            await order.save();

            return res.json({ message: 'Order cancelled and refund processed successfully' });
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(500).json({ message: 'Failed to cancel order' });
    }
};


const orderDetails = async (req, res) => {
    try {
        const orderId = req.query.id; 
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login');
        }

        const orderData = await Order.findById(orderId)
            .populate({
                path: 'orderedItems.product', 
            })
            .sort({ createdOn: -1 });
        
            const address = await Address.findOne({userId}); 

            const findAddress = address.address.filter(addr => addr._id.toString() === orderData.address.toString());

            

        if (!orderData) {
            return res.status(404).send("Order not found.");
        }

        res.render('orderDetails', { orders: orderData,address:findAddress });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.redirect('/pageNotFound');
    }
};



module.exports = {
    createOrder,
    getOrder,
    getUserOrders,
    cancelOrder,
    orderDetails
};
