const Product = require('../../models/productSchema'); 

const sortProducts = async (req, res) => {
    try {
        const sortOption = req.query.sort;
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skipIndex = (page - 1) * limit;

        let sortCriteria = {};
        switch(sortOption) {
            case 'price-low':
                sortCriteria = { salePrice: 1 };
                break;
            case 'price-high':
                sortCriteria = { salePrice: -1 };
                break;
            case 'az':
                sortCriteria = { productName: 1 };
                break;
            case 'za':
                sortCriteria = { productName: -1 };
                break;
            case 'rating':
                sortCriteria = { averageRating: -1 };
                break;
            case 'new':
                sortCriteria = { createdAt: -1 };
                break;
            default:
                sortCriteria = { createdAt: -1 }; 
        }

        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find()
            .sort(sortCriteria)
            .skip(skipIndex)
            .limit(limit);

        res.json({
            products,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        });
    } catch (error) {
        res.status(500).json({ message: 'Error sorting products', error });
    }
};



module.exports = {
    sortProducts
}
