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
        console.error("Error fetching coupon list:", error.message);
        res.status(500).render('errorPage', { message: 'Failed to load coupons.' });
    }
}
   
const applyCoupon = async (req, res) => {
    try {
        const { couponCode, totalPrice } = req.body;
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

        if (coupon.userId && coupon.userId.includes(userId)) {
            return res.json({
                success: false,
                message: 'Coupon has already been used by this user'
            });
        }

        if (coupon.minimumPrice && totalPrice < coupon.minimumPrice) {
            return res.json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minimumPrice} required`
            });
        }

        let discountAmount = Math.min(
            (totalPrice * coupon.offerPercentage) / 100,
            coupon.maximumDiscount || Infinity
        );

        discountAmount = Math.min(discountAmount, totalPrice);

        return res.json({
            success: true,
            message: 'Coupon applied successfully!',
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
      const { totalPrice, shippingCharges, gstAmount } = req.body;
      res.json({
          success: true,
          message: 'Coupon removed successfully'
      });
  } catch (error) {
      console.error("Error removing coupon", error);
      res.status(500).json({
          success: false,
          message: "Failed to remove coupon"
      });
  }
};

module.exports = {
    getCouponList,
    applyCoupon,
    removeCoupon
}