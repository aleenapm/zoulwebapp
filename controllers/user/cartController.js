const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Addresses = require("../../models/addressSchema");
const mongoose = require('mongoose'); 





const loadCart = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }
        const cart = await Cart.findOne({ userId: userId }).populate('items.productId').sort({ createdOn: -1 });;
        return res.render("cart", { cart: cart ? cart.items : [] });
    } catch (error) {
        console.log("Cart page not loading:", error);
        res.status(500).send("Server Error");
    }
};
const loadCheckout = async (req, res) => {     
    try {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }

        const SHIPPING_CHARGE = 70; // Fixed shipping charge
        const GST_RATE = 0.18; // 18% GST

        const addressDoc = await Addresses.findOne({ userId: user });
        const addresses = addressDoc ? addressDoc.address : [];

        let subtotal = 0;
        let products = [];
        let discount = 0;
        let shippingCharges = SHIPPING_CHARGE;
        let gstAmount = 0;
        let totalPriceAfterDiscount = 0;

        if (req.query.id) {
            // Single product checkout
            const quantity = req.query.quantity || 1;
            const product = await Product.findById(req.query.id);
            if (!product) {
                return res.redirect('/page-not-found');
            }

            subtotal = product.salePrice * quantity;
            gstAmount = subtotal * GST_RATE;
            totalPriceAfterDiscount = subtotal + shippingCharges + gstAmount - discount;

            return res.render('checkout', {
                cart: null,
                product,
                quantity,
                address: addresses,
                subtotal,
                discount,
                shippingCharges,
                gstAmount,
                totalPriceAfterDiscount,
                products: []
            });
        } else {
            // Cart-based checkout
            const cartItems = await Cart.findOne({ userId: user }).populate('items.productId');
            if (!cartItems || !cartItems.items.length) {
                return res.render('checkout', {
                    cart: null,
                    products: [],
                    address: addresses,
                    subtotal: 0,
                    discount: 0,
                    shippingCharges,
                    gstAmount: 0,
                    totalPriceAfterDiscount: shippingCharges,
                    product: null
                });
            }

            subtotal = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);
            products = cartItems.items;
            
            gstAmount = subtotal * GST_RATE;
            totalPriceAfterDiscount = subtotal + shippingCharges + gstAmount - discount;

            return res.render('checkout', {
                cart: cartItems,
                products,
                address: addresses,
                subtotal,
                discount,
                shippingCharges,
                gstAmount,
                totalPriceAfterDiscount,
                product: null
            });
        }
    } catch (error) {
        console.error("Error loading checkout page:", error);
        res.redirect('/page-not-found');
    } 
};

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }


        const productId = req.body.id || req.query.id;
        const quantity = parseInt(req.body.quantity) || 1;

        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Check if the product is out of stock
        if (product.quantity === 0) {
            return res.status(400).json({ message: "Oops! Product is out of stock." });
        }

        let cartDoc = await Cart.findOne({ userId });
        if (cartDoc) {
            const existingItem = cartDoc.items.find(item => item.productId.toString() === productId);

            if (existingItem) {
                const newQuantity = existingItem.quantity + quantity;
                if (newQuantity > product.quantity) {
                    return res.status(400).json({ message: `Only ${product.quantity} items available in stock.` });
                }
                existingItem.quantity = newQuantity;
                existingItem.totalPrice = newQuantity * product.salePrice;
            } else {
                if (quantity > product.quantity) {
                    return res.status(400).json({ message: `Only ${product.quantity} items available in stock.` });
                }
                cartDoc.items.push({
                    productId,
                    quantity,
                    price: product.salePrice,
                    totalPrice: quantity * product.salePrice
                });
            }
        } else {
            if (quantity > product.quantity) {
                return res.status(400).json({ message: `Only ${product.quantity} items available in stock.` });
            }
            cartDoc = new Cart({
                userId,
                items: [{
                    productId,
                    quantity,
                    price: product.salePrice,
                    totalPrice: quantity * product.salePrice
                }]
            });
        }

        await cartDoc.save();
        return res.json({ message: "Product added to cart successfully" });
    } catch (error) {
        console.error("Error saving to cart:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


const getCart = async (req,res) => {
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({userId:userId}).populate('items.productId');
        res.render('cart', { cart: cart ? cart.items : [] });
    } catch (error) {
        console.error("Error fetching cart:",error);
        res.status(500).send("Internal Server Error");
        
    }
    
}

const updateQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const user = req.session.user;
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        const cart = await Cart.findOne({ userId: user });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        cart.items[itemIndex].quantity = quantity;
        let newQuantity = cart.items[itemIndex].quantity

        
        const product = await Product.findById(productId);
        if (product && newQuantity > product.quantity) {
            return res.status(400).json({ success: false, message: `Only ${product.quantity} items available in stock` });
        }

        if (newQuantity < 0) {
            return res.status(400).json({ success: false, message: 'Quantity cannot be negative' });
        }

        cart.items[itemIndex].quantity = newQuantity;
        cart.items[itemIndex].totalPrice = newQuantity * product.salePrice;

        await cart.save();

       
        const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

      
        return res.json({ 
            success: true, 
            newQuantity, 
            newTotalPrice: cart.items[itemIndex].totalPrice, 
            subtotal,
            totalPrice: subtotal 
        });
    } catch (error) {
        console.error("Error updating cart quantity:", error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



const removeProduct = async (req, res) => {
    try {
        const userId = req.session.user;
        const cartProductId = req.body.id; 

        
        const findCart = await Cart.findOne({ userId });
        if (!findCart) {
            return res.status(404).json({ success: false, message: "Cart not found for the user" });
        }

        // Use $pull to remove the item based on the productId in items array
        const updateResult = await Cart.updateOne(
            { userId },
            { $pull: { items: { productId: cartProductId } } }
        );

        // Check if an item was actually removed
        if (updateResult.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: "Product not found in cart" });
        }

        res.json({ success: true, message: "Product removed from cart" });
    } catch (error) {
        console.error("Error in deleting product from cart", error);
        res.status(500).json({ success: false, message: "Error deleting product from cart" });
    }
};



module.exports = {
    loadCart,
    loadCheckout,
    addToCart,
    getCart,
    updateQuantity,
    removeProduct
}