const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");

const getOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;  // Get orderId from the URL parameters
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
        // console.log("createOrder userId:", userId);

        const cart = req.body.cart ? JSON.parse(req.body.cart) : { items: [] };
        const orderedItems = cart.items.map(item => ({
            product: item.productId,
            quantity: item.quantity,
            price: item.price || 0
        }));

        const totalPrice = req.body.totalPrice || 0;
        const discount = req.body.discount || 0;
        const finalAmount = req.body.finalAmount || (totalPrice - discount);
        const addressId = req.body.address;
        const paymentMethod = req.body.paymentMethod;

        const addresses = await Address.findOne({ userId });
        if (!addresses) return res.status(400).send("Address not found.");

        const addressDetails = addresses.address.find(address => address._id.toString() === addressId);
        if (!addressDetails) return res.status(400).send("Invalid address ID");

        const newOrder = new Order({
            user: userId,
            orderedItems,
            totalPrice,
            discount,
            finalAmount,
            address: addressDetails,
            status: "Pending",
            createdOn: new Date(),
            invoiceDate: new Date(),
            paymentMethod,
        });

        await newOrder.save();
        return res.redirect(`/order/${newOrder._id}`);
    } catch (error) {
        console.log("Error saving order:", error);
        res.status(500).send("Server Error");
    }
};


const getUserOrders = async (req, res) => {
    try {
      
      const userId = req.session.user;
      const orders = await Order.find({ user: userId });
  
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

        order.status = 'Cancelled';
        await order.save();

        return res.json({ message: 'Order cancelled successfully' });
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
        
            const address = await Address.findOne({userId}); 

            const findAddress = address.address.filter(addr => addr._id.toString() === orderData.address.toString());

            console.log("finded address",findAddress);
            

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
