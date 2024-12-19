const Order = require("../../models/orderSchema"); // Import the Order model


const getSalesReport = async (req,res) => {
  try {
      const page= (req.query.page) || 1;
      const limit = 10;
      const skip = (page-1)*limit;
      const orderData = await Order.find()
      .populate("user")
      .populate("orderedItems.product")
      .sort({createdOn:-1})
      .skip(skip)
      .limit(limit);
      const count = await Order.countDocuments();
      const totalPages =Math.ceil(count/limit);
   
    const totalSalesValue= orderData.reduce((sum,data)=>sum+data.finalAmount,0)
    const totalDiscountValue= orderData.reduce((sum,data)=>sum+data.discount,0)
    const custCount = await Order.distinct('user')
    console.log(custCount);
    
    
      if(orderData){
          res.render("salesReport",{orders:orderData,activePage:"sales-report",count:orderData.length,totalPages,page,totalDiscountValue,totalSalesValue,custCount:custCount.length})
      }
  } catch (error) {
      console.log(error)
  }
}
module.exports = { getSalesReport };
