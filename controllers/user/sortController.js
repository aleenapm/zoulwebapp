const Product = require('../../models/productSchema'); 

const sortProducts = async (req, res) => {
    try {
        const { sort } = req.query;
        let sortCriteria = {};

        switch (sort) {
            case 'featured':
                sortCriteria = {}; 
                break;
            case 'popularity':
                sortCriteria = { popularity: -1 }; 
                break;
            case 'price-low':
                sortCriteria = { salePrice: 1 }; 
                break;
            case 'price-high':
                sortCriteria = { salePrice: -1 }; 
                break;
            case 'rating':
                sortCriteria = { averageRating: -1 }; 
                break;
            case 'new':
                sortCriteria = { createdAt: -1 }; 
                break;
            case 'az':
                sortCriteria = { productName: 1 }; 
                break;
            case 'za':
                sortCriteria = { productName: -1 }; 
                break;
            default:
                sortCriteria = {}; 
        }

      
        const products = await Product.find().sort(sortCriteria);
        res.json({ products });
    } catch (error) {
        console.error('Error fetching sorted products:', error.message);
        res.status(500).json({
            error: 'Failed to fetch sorted products',
            message: error.message, 
        });
    }
};



module.exports = {
    sortProducts
}
