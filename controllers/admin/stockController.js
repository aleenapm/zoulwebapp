const Product = require('../../models/productSchema');

const getStocks = async (req,res) => {
    try {
        
        const products = await Product.find().populate('category', 'name');
        res.render('stocks',{products});

    } catch (error) {
        
    }
}

const updateStock = async (req,res) => {
    try {
        
        const {productId,newStock} = req.body;
        await Product.findByIdAndUpdate(productId,{quantity:newStock});
        res.json({ success: true });

    } catch (error) {
        console.error("Error updating stock",error);
        res.json({ success: false });
    }
}

module.exports = {
    getStocks,
    updateStock
}