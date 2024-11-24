const Order = require("../../models/orderSchema"); // Import the Order model


const getSalesReport = async (req,res) => {
  try {
      const page= (req.query.page) || 1;
      const limit = 10;
      const skip = (page-1)*limit;
      const orderData = await Order.find().populate("user").populate("orderedItems.product").sort({createdOn:-1}).skip(skip).limit(limit);
      const count = await Order.countDocuments();
      const totalPages =Math.ceil(count/limit);

      if(orderData){
          res.render("salesreport",{orders:orderData,activePage:"sales-report",count:count,totalPages,page})
      }
  } catch (error) {
      console.log(error)
  }
}
module.exports = { getSalesReport };
