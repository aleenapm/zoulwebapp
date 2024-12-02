// dashboardController.js
const Order = require('../../models/orderSchema');
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

// Helper Functions
const getDateRange = (period) => {
    const now = new Date();
    const start = new Date();
    
    switch(period) {
        case 'yearly':
            start.setFullYear(start.getFullYear() - 1);
            break;
        case 'monthly':
            start.setMonth(start.getMonth() - 12);
            break;
        case 'weekly':
            start.setDate(start.getDate() - 7);
            break;
    }
    
    return { start, end: now };
};

const getGrouping = (period) => {
    switch(period) {
        case 'yearly':
            return { $year: '$createdOn' };
        case 'monthly':
            return { 
                year: { $year: '$createdOn' },
                month: { $month: '$createdOn' }
            };
        case 'weekly':
            return { 
                year: { $year: '$createdOn' },
                week: { $week: '$createdOn' }
            };
    }
};

const formatLabel = (id, period) => {
    switch(period) {
        case 'yearly':
            return `${id}`;
        case 'monthly':
            return `${id.year}-${id.month}`;
        case 'weekly':
            return `Week ${id.week}, ${id.year}`;
        default:
            return id.toString();
    }
};

// Controller Functions
const dashboard = async function(req, res) {
    try {
        const [salesData, products, categories, brands, overview] = await Promise.all([
            getSalesData(),
            getBestSellingProducts(),
            getBestSellingCategories(),
            getBestSellingBrands(),
            getDashboardOverview()
        ]);

        res.render('dashboard', {
            salesData,
            products,
            categories,
            brands,
            totalOrders: overview.totalOrders,
            totalProducts: await Product.countDocuments(),
            pageTitle: 'Dashboard'
        });
    } catch (error) {
        console.error('Dashboard render error:', error);
        res.status(500).render('error', { error: 'Failed to load dashboard' });
    }
};

const getSalesData = async function() {
    try {
        const periods = ['yearly', 'monthly', 'weekly'];
        const salesData = {};

        for (const period of periods) {
            const dateRange = getDateRange(period);
            const data = await Order.aggregate([
                {
                    $match: {
                        createdOn: { $gte: dateRange.start, $lte: dateRange.end },
                        status: { $ne: 'Cancelled' }
                    }
                },
                {
                    $group: {
                        _id: getGrouping(period),
                        total: { $sum: '$finalAmount' }
                    }
                },
                { $sort: { '_id': 1 } }
            ]);

            salesData[period] = {
                labels: data.map(d => formatLabel(d._id, period)),
                data: data.map(d => d.total)
            };
        }

        const totalSalesAmount = await Order.aggregate([
            { $match: { status: { $ne: 'Cancelled' } } },
            { $group: { _id: null, total: { $sum: '$finalAmount' } } }
        ]);

        salesData.totalSalesAmount = totalSalesAmount[0]?.total || 0;

        return salesData;
    } catch (error) {
        console.error('Error getting sales data:', error);
        throw error;
    }
};

const getBestSellingProducts = async function(req, res) {
    try {
        const bestSellingProducts = await Order.aggregate([
            { $match: { status: { $ne: 'Cancelled' } } },
            { $unwind: '$orderedItems' },
            {
                $group: {
                    _id: '$orderedItems.product',
                    totalQuantitySold: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $project: {
                    productName: '$productDetails.productName',
                    totalQuantitySold: 1,
                    totalRevenue: 1
                }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 }
        ]);

        return bestSellingProducts;
    } catch (error) {
        console.error('Error getting best selling products:', error);
        throw error;
    }
};

const getBestSellingCategories = async function() {
    try {
        const bestSellingCategories = await Order.aggregate([
            { $match: { status: { $ne: 'Cancelled' } } },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: '$categoryDetails' },
            {
                $group: {
                    _id: '$categoryDetails._id',
                    categoryName: { $first: '$categoryDetails.name' },
                    totalQuantitySold: { $sum: '$orderedItems.quantity' }
                }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 }
        ]);

        return bestSellingCategories;
    } catch (error) {
        console.error('Error getting best selling categories:', error);
        throw error;
    }
};

const getBestSellingBrands = async function() {
    try {
        const bestSellingBrands = await Order.aggregate([
            { $match: { status: { $ne: 'Cancelled' } } },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.brand',
                    totalQuantitySold: { $sum: '$orderedItems.quantity' }
                }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 }
        ]);

        return bestSellingBrands;
    } catch (error) {
        console.error('Error getting best selling brands:', error);
        throw error;
    }
};

const getDashboardOverview = async function() {
    try {
        const [totalRevenue, totalOrders, pendingOrders] = await Promise.all([
            Order.aggregate([
                { $match: { status: { $ne: 'Cancelled' } } },
                { $group: { _id: null, total: { $sum: '$finalAmount' } } }
            ]),
            Order.countDocuments({ status: { $ne: 'Cancelled' } }),
            Order.countDocuments({ status: 'Pending' })
        ]);

        return {
            totalRevenue: totalRevenue[0]?.total || 0,
            totalOrders,
            pendingOrders
        };
    } catch (error) {
        console.error('Error getting dashboard overview:', error);
        throw error;
    }
};

module.exports = {
    dashboard,
    getBestSellingProducts,
    getBestSellingCategories,
    getBestSellingBrands,
    getDashboardOverview
};