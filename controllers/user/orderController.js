const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const Return = require("../../models/returnSchema");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const getOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.query.id; 

        const order = await Order.findOne({ _id: orderId, user: userId })
            .populate('orderedItems.product');

        if (!order) {
            return res.status(404).send("Order not found");
        }

        const subtotal = order.orderedItems.reduce((total, item) => total + item.price * item.quantity, 0);
        const shippingCharges = order.shippingCharges || 70;
        const GST = order.GST || (subtotal * 0.18); 
        const discount = order.discount || 0;
        const totalAmount = subtotal + GST + shippingCharges - discount;

        return res.render("order", {
            products: order.orderedItems,
            subtotal,
            shippingCharges,
            GST: GST.toFixed(2),
            discount,
            totalAmount,
            email: order.address.email,
            phone: order.address.phone,
            shippingAddress: order.address,
            paymentMethod: order.paymentMethod,
            orderStatus: order.status,
            orderData: order,
        });
    } catch (error) {
        console.error("Order page not loading:", error);
        res.status(500).send("Server Error");
    }
};

const createOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        let {
            cart,
            subtotal,
            totalAmount,
            couponCode,
            paymentMethod,
            discount,
            addressId,
            singleProduct,
            gstAmount,
            shippingCharges
        } = req.body;

        subtotal = parseFloat(subtotal) || 0;
        discount = parseFloat(discount) || 0;
        gstAmount = parseFloat(gstAmount) || 0;
        shippingCharges = parseFloat(shippingCharges) || 70;

        const userAddressDoc = await Address.findOne({ userId: userId });
        if (!userAddressDoc) {
            return res.status(400).json({ error: "Address not found." });
        }

        const specificAddress = userAddressDoc.address.find(
            (addr) => addr._id.toString() === addressId
        );
        if (!specificAddress) {
            return res.status(404).json({ error: "Address with provided ID not found." });
        }

        let orderedItems = [];
        if (singleProduct) {
            const product = JSON.parse(singleProduct);
            orderedItems.push({
                product: product._id,
                quantity: 1,
                price: parseFloat(product.salePrice)
            });
            if (subtotal <= 0) {
                subtotal = parseFloat(product.salePrice);
            }
        } else if (cart) {
            const cartItems = JSON.parse(cart);
            orderedItems = cartItems.map(item => ({
                product: item.productId,
                quantity: parseInt(item.quantity),
                price: parseFloat(item.totalPrice) / parseInt(item.quantity)
            }));
            if (subtotal <= 0) {
                subtotal = cartItems.reduce((total, item) => total + parseFloat(item.totalPrice), 0);
            }
        }

        const GST = gstAmount || (subtotal * 0.18);
        const calculatedTotalAmount = parseFloat(
            (subtotal + GST + shippingCharges - discount).toFixed(2)
        );

        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ userId }); 
            if (!wallet) {
                return res.status(404).json({ error: "Wallet not found." });
            }

            const walletBalance = parseFloat(wallet.balance) || 0;

            if (walletBalance < calculatedTotalAmount) {
                return res.status(400).json({
                    error: "Insufficient wallet balance.",
                    walletBalance
                });
            }

            wallet.balance -= calculatedTotalAmount;

            const walletTransaction = {
                type: "debit",
                amount: calculatedTotalAmount,
                date: new Date(),
                description: "Order payment using wallet",
                orderId: null, 
            };
            wallet.transactions.push(walletTransaction);

            await wallet.save();
        }

        const orderData = {
            orderedItems,
            totalPrice: subtotal.toFixed(2),
            discount: discount.toFixed(2),
            GST: GST.toFixed(2),
            shippingCharges: shippingCharges.toFixed(2),
            finalAmount: calculatedTotalAmount.toFixed(2),
            couponCode,
            couponApplied: Boolean(couponCode),
            user: userId,
            address: specificAddress,
            paymentMethod,
            status: 'Pending',
            paymentStatus: paymentMethod === 'Wallet' ? 'payment completed' : 'Pending',
        };
        if(cart){
            const cartProducts = await Cart.findOne({userId:req.session.user})
            cartProducts.items = [];
            await cartProducts.save()
        }
        const newOrder = new Order(orderData);
        await newOrder.save();

        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ userId });
            const lastTransaction = wallet.transactions[wallet.transactions.length - 1];
            if (lastTransaction) {
                lastTransaction.orderId = newOrder._id;
            }
            await wallet.save();
            return res.redirect(`/order?id=${newOrder._id}`);
        }
        if (paymentMethod === 'COD') {
            return res.redirect(`/order?id=${newOrder._id}`);
        } else {
            return res.json({ 
                orderId: newOrder._id, 
                finalAmount: calculatedTotalAmount 
            });
        }  
    } catch (error) {
        console.error("Error in placing order:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
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

        if (order.paymentMethod === 'Online'|| order.paymentMethod === "Wallet") {
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

        const orderData = await Order.findById(orderId).populate({
                path: 'orderedItems.product',
            })
            .sort({ createdOn: -1 });

        if (!orderData) {
            return res.status(404).send("Order not found.");
        }

        const address = await Address.findOne({ userId });
        const findAddress = address.address.filter(addr => 
            addr._id.toString() === orderData.address.toString()
        );

        res.render('orderDetails', { 
            orders: orderData, 
            address: findAddress 
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.redirect('/pageNotFound');
    }
};

const getInvoice = async (req, res) => {
    const orderId = req.query.id;

    const formatCurrency = (amount) => `Rs ${amount.toFixed(2)}`;

    try {
        const order = await Order.findById(orderId)
            .populate('user', 'name email')
            .populate('orderedItems.product', 'productName productCode');

        if (!order) {
            return res.status(404).send("Order not found.");
        }

        const address = await Address.findOne({ 'address._id': order.address });

        if (!address) {
            return res.status(404).send("Address not found.");
        }

        const selectedAddress = address.address.find(
            (addr) => addr._id.toString() === order.address.toString()
        );

        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            font: 'Helvetica'
        });

        const fileName = `ZOUL-Invoice-${order._id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        doc.pipe(res);

        const colors = {
            primary: '#6D4C3E',
            secondary: '#b68b40',
            accent: '#8B4513',
            highlight: '#F5E6D3',
            text: '#4A3F35',
            background: 'white',
            border: '#D2B48C'
        };

        doc.lineWidth(1)
            .strokeColor(colors.border)
            .rect(40, 40, doc.page.width - 80, doc.page.height - 80)
            .stroke();

        doc.font('Helvetica-Bold')
            .fontSize(32)
            .fillColor(colors.primary)
            .text('ZOUL', 0, 100, { align: 'center' })
            .fontSize(16)
            .fillColor(colors.secondary)
            .text('Everyday wear | Personalised jewellery', 0, 140, { align: 'center' });

        doc.font('Helvetica')
            .fontSize(10)
            .fillColor(colors.text)
            .text('Zoul Jewelry Pvt Ltd', 0, 160, { align: 'center' })
            .text('Thrissur, Kerala - 680568', 0, 175, { align: 'center' })
            .text('GSTIN: 29AABCU9603R1ZX', 0, 190, { align: 'center' });

        doc.moveTo(50, 220)
            .lineTo(550, 220)
            .strokeColor(colors.accent)
            .strokeOpacity(0.8)
            .lineWidth(2)
            .stroke();

        doc.font('Helvetica')
            .fontSize(10)
            .fillColor(colors.text)
            .text(`Invoice No: ZOUL-${orderId.slice(-8)}`, 360, 250)
            .text(`Date: ${new Date(order.createdOn).toLocaleDateString('en-IN')}`, 360, 265)
            .text(`Order ID: ${orderId}`, 360, 280);

        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('BILLED TO:', 50, 250)
            .font('Helvetica')
            .fontSize(10)
            .text(order.user.name, 50, 270)
            .text(order.user.email, 50, 285)
            .text(
                `${selectedAddress.name}, ${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.pincode}`,
                50,
                300
            );

        
        const tableTop = 350;
        doc.save()
            .rect(50, tableTop, 500, 35)
            .fillColor(colors.secondary)
            .fill()
            .restore();

        doc.fillColor('white')
            .font('Helvetica-Bold')
            .text('PRODUCT', 60, tableTop + 12)
            .text('QTY', 350, tableTop + 12)
            .text('PRICE', 430, tableTop + 12)
            .text('TOTAL', 490, tableTop + 12);

        let yPosition = tableTop + 50;
        order.orderedItems.forEach((item, index) => {
            if (index % 2 === 0) {
                doc.save()
                    .rect(50, yPosition - 5, 500, 25)
                    .fillColor(colors.highlight)
                    .opacity(0.5)
                    .fill()
                    .restore();
            }

            doc.font('Helvetica')
                .fontSize(10)
                .fillColor(colors.text)
                .text(item.product.productName, 60, yPosition)
                .text(item.quantity.toString(), 350, yPosition)
                .text(formatCurrency(item.price), 430, yPosition)
                .text(formatCurrency(item.price * item.quantity), 490, yPosition);

            yPosition += 30;
        });

        doc.save()
            .rect(350, yPosition + 20, 200, 100)
            .fillColor(colors.highlight)
            .opacity(0.3)
            .fill()
            .restore();

        doc.font('Helvetica')
            .fontSize(10)
            .fillColor(colors.text)
            .text('Subtotal', 360, yPosition + 30)
            .text(formatCurrency(order.totalPrice), 490, yPosition + 30, { align: 'right' })
            .text('Delivery', 360, yPosition + 45)
            .text(formatCurrency(order.shippingCharges), 490, yPosition + 45, { align: 'right' })
            .text('GST', 360, yPosition + 60)
            .text(formatCurrency(order.GST), 490, yPosition + 60, { align: 'right' });

        if (order.discount > 0) {
            doc.text('Discount', 360, yPosition + 75)
                .text(formatCurrency(order.discount), 490, yPosition + 75, { align: 'right' });
        }

        doc.font('Helvetica-Bold')
            .fontSize(12)
            .fillColor(colors.primary)
            .text('TOTAL', 360, yPosition + 95)
            .text(formatCurrency(order.finalAmount), 480, yPosition + 95, { align: 'right' });

        doc.font('Helvetica')
            .fontSize(9)
            .fillColor(colors.text)
            .text('Thank you for choosing ZOUL - Where Every Piece Tells a Story', 0, 750, { align: 'center' })
            .font('Helvetica-Bold')
            .text('www.zoul.jewelry', 0, 765, { align: 'center' })
            .text('For any queries, contact: support@zoul.jewelry', 0, 780, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).send("Error generating invoice.");
    }
};

const returnOrder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const userId = req.session.user;

        const orderData = await Order.findById(orderId);
        if (!orderData) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const existingReturn = await Return.findOne({ orderId });
        if (existingReturn) {
            return res.status(400).json({ message: 'Return request already submitted for this order' });
        }

        const reasonData = new Return({
            userId,
            orderId,
            reason,
            refundAmount: orderData.finalAmount,
            returnStatus: 'pending',
        });

        await reasonData.save();

        await Order.findByIdAndUpdate(
            orderId,
            { $set: { status: 'Return Requested' } },
            { new: true }
        );

        return res.status(200).json({ message: 'Return Request Submitted Successfully' });
    } catch (error) {
        console.error('Error processing return request:', error);
        return res.status(500).json({ message: 'Something went wrong, please try again later.' });
    }
};

module.exports = {
    createOrder,
    getOrder,
    getUserOrders,
    cancelOrder,
    orderDetails,
    getInvoice,
    returnOrder
};
