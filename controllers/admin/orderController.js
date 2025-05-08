const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");

const loadOrders = async (req, res) => {
    console.log(req.session.admin);
    if (req.session.admin) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 6;
            const skip = (page - 1) * limit;

            const totalOrders = await Order.countDocuments();
            const totalPages = Math.ceil(totalOrders / limit);

            const orders = await Order.find()
                .populate('user', 'name email')
                .populate('address')
                .populate("orderedItems.product")
                .sort({ createdOn: -1 })
                .skip(skip)
                .limit(limit)
                .exec();

            const formattedOrders = orders.map(order => ({
                orderId: order.orderId || order._id,
                name: order.user ? order.user.name : "N/A",
                quantity: order.quantity,
                paymentMethod: order.paymentMethod,
                total: `₹${order.finalAmount.toFixed(2)}`,
                status: order.status,
                date: new Date(order.invoiceDate || order.createdOn).toLocaleDateString("en-GB"),
                items:order.orderedItems
            }));

            res.render("adminOrder", {
                orders: formattedOrders,
                totalPages,
                currentPage: page
            });
        } catch (error) {
            console.error('Error loading orders:', error);
            res.redirect("/admin/pageerror");
        }
    } else {
        res.redirect("/admin/login");
    }
};

const updateOrderStatus = async (req, res) => {
    if (!req.session.admin) {
        return res.status(401).json({ message: "Unauthorized. Please log in as an admin." });
    }

    try {
        const { orderId, status } = req.body;

        console.log("Request body:", req.body); 
        console.log("Order ID:", orderId, "Status:", status); 

        if (!orderId || typeof orderId !== 'string' || !status || typeof status !== 'string') {
            console.error("Invalid orderId or status");
            return res.status(400).json({ message: "Order ID and status are required and must be strings." });
        }

        const updatedOrder = await Order.findOneAndUpdate({orderId:orderId}, { status }, { new: true });

        if (!updatedOrder) {
            console.error("Order not found"); 
            return res.status(404).json({ message: "Order not found" });
        }

        console.log("Order updated successfully:", updatedOrder); 
        res.json({ message: "Order status updated successfully", updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error); 
        res.status(500).json({ message: "An error occurred while updating the order status" });
    }
};

module.exports = {
    loadOrders,
    updateOrderStatus,
};
