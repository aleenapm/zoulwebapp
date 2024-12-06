const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');

const dashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            const salesData = await getTotalSales();
            const products = await getMostSellingProducts();
            const categories = await getMostSellingCategories();
            const brands = await getMostSellingBrands();
            const totalOrders = await Order.countDocuments();
            const totalProducts = await Product.countDocuments()


            res.render('dashboard', { 
                salesData: JSON.parse(JSON.stringify(salesData)), 
                products: JSON.parse(JSON.stringify(products)), 
                categories: JSON.parse(JSON.stringify(categories)), 
                brands: JSON.parse(JSON.stringify(brands)),
                totalOrders,
                totalProducts
            });
        }
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.redirect('/pageerror');
    }
}

async function getTotalSales() {
    try {
        const totalSales = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalSalesAmount: { $sum: "$finalAmount" }
                }
            }
        ]);

        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);

        const weeklySales = await Order.aggregate([
            {
                $match: {
                    createdOn: { $gte: startOfYear } 
                }
            },
            {
                $group: {
                    _id: { $week: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const monthlySales = await Order.aggregate([
            {
                $match: {
                    createdOn: { $gte: startOfYear } 
                }
            },
            {
                $group: {
                    _id: { $month: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const yearlySales = await Order.aggregate([
            {
                $group: {
                    _id: { $year: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];

        const weeklyData = {
            labels: weeklySales.map(item => `Week ${item._id}`),
            data: weeklySales.map(item => item.sales)
        };

        const monthlyData = {
            labels: monthNames,
            data: Array(12).fill(0)
        };
        monthlySales.forEach(item => {
            if (item._id >= 1 && item._id <= 12) {
                monthlyData.data[item._id - 1] = item.sales;
            }
        });

        const yearlyData = {
            labels: yearlySales.map(item => item._id.toString()),
            data: yearlySales.map(item => item.sales)
        };

        return {
            totalSalesAmount: totalSales.length > 0 ? totalSales[0].totalSalesAmount : 0,
            weekly: weeklyData,
            monthly: monthlyData,
            yearly: yearlyData
        };
    } catch (error) {
        console.error("Error in getTotalSales:", error);
        return {
            totalSalesAmount: 0,
            weekly: { labels: [], data: [] },
            monthly: { labels: [], data: [] },
            yearly: { labels: [], data: [] }
        };
    }
}


async function getMostSellingProducts() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$orderedItems.product",
                    productName: { $first: "$productDetails.productName" },
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling product:", error);
    }
}

async function getMostSellingCategories() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },

            { $unwind: "$categoryDetails" },

            {
                $group: {
                    _id: "$productDetails.category",
                    categoryName: { $first: "$categoryDetails.name" },
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category:", error);
    }
}

async function getMostSellingBrands() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$productDetails.brand",
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 },
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category and brand:", error);
    }
}


module.exports ={
    dashboard,
}