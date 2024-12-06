const Product = require('../../models/productSchema');

const getStocks = async (req,res) => {
    try {
        const page= (req.query.page) || 1;
        const limit = 10;
        const skip = (page-1)*limit;
        const products = await Product.find().populate('category', 'name').skip(skip).limit(limit);
        const count = await Product.countDocuments();
        const totalPages =Math.ceil(count/limit);

        res.render('stocks',{products,count:count,totalPages,page});

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