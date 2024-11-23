const Coupon = require('../../models/couponSchema');

const getCouponList = async (req,res) => {
    try {
      
      const user = req.session.user;
      if(!user){
        return res.redirect('/login');
      }
  
      const coupons = await Coupon.find({
        isList: true,
        userId: { $ne: user },
      });
      
      res.render('couponList',{coupons});
  
    } catch (error) {
      
    }
  }
  
  
  const applyCoupon = async (req, res) => {
    try {
      const { couponCode, totalPrice } = req.body;
      console.log("reqbody:",req.body);
      
      const userId = req.session.user;
  
      const coupon = await Coupon.findOne({
        name: couponCode,
        isList: true,
        expireOn: { $gt: new Date() }
      });
  
      if (!coupon) {
        return res.json({
          success: false,
          message: 'Invalid or expired coupon code'
        });
      }
  
      if (coupon.userId.includes(userId)) {
        return res.json({
          success: false,
          message: 'Coupon has already been used by this user'
        });
      }
  
      let discountAmount = (totalPrice*coupon.offerPercentage)/100;
      console.log("discount:",discountAmount);
      
  
      if (coupon.minimumPrice && totalPrice < coupon.minimumPrice) {
        return res.json({
          success: false,
          message: `Minimum purchase amount of ${coupon.minimumPrice} required`
        });
      }
  
      const discountedTotal = totalPrice - discountAmount;
      console.log("discounttotal:",discountedTotal);
      
  
  
      return res.json({
        success: true,
        message: 'Coupon applied successfully!',
        discountedTotal: discountedTotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2)
      });
  
    } catch (error) {
      console.error('Error applying coupon:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to apply coupon'
      });
    }
  };
  
  const removeCoupon = async (req, res) => {
    try {
  
      const { totalPrice } = req.body;
  
      const discountAmount = 0;
      const finalTotal = totalPrice;
  
      res.json({
        success: true,
        discountAmount,
        finalTotal,
      });
  
    } catch (error) {
      console.error("Error removing coupon", error);
      res.status(500);
    }
  }


  module.exports = {
    getCouponList,
    applyCoupon,
    removeCoupon


  }