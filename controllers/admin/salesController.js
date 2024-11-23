const Order = require("../../models/orderSchema"); // Import the Order model


const getSalesReport = async (req, res) => {
  try {
    const { dateRange, startDate, endDate } = req.query; // Get filters from the query parameters

    // Determine the date range for filtering
    let filter = {};
    const today = new Date();
    
    if (dateRange === 'daily') {
      filter.date = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else if (dateRange === 'weekly') {
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      filter.date = {
        $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      };
    } else if (dateRange === 'monthly') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      filter.date = {
        $gte: startOfMonth,
        $lte: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    } else if (dateRange === 'yearly') {
      filter.date = {
        $gte: new Date(today.getFullYear(), 0, 1),
        $lte: new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    } else if (dateRange === 'custom' && startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Fetch sales data from the Order model and populate the user and product fields
    const salesData = await Order.find(filter)
      .populate('user')
      .populate('orderedItems.product');


    // Calculate totals
    const totalSalesCount = salesData.length;
    const totalOrderAmount = salesData.reduce((sum, order) => sum + order.finalAmount, 0);
    const totalDiscounts = salesData.reduce((sum, order) => sum + order.discount, 0);
    const netSales = totalOrderAmount - totalDiscounts;

    // Render the sales report view with the calculated data
    res.render('salesReport', {
      totalSalesCount,
      totalOrderAmount,
      totalDiscounts,
      netSales,
      salesData,
      dateRange,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).send('An error occurred while generating the sales report.');
  }
};

module.exports = { getSalesReport };
