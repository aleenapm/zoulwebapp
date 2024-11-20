const Coupon = require('../../models/couponSchema');


const getCouponPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        const coupons = await Coupon.find()
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const count = await Coupon.countDocuments();

        res.render('coupons', {
            coupons,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        res.redirect("/admin/pageerror");
    }
};


const addCoupon = async (req,res) => {
    try {
        
        const {couponCode,discountPercentage,minimumPrice,maximumPrice,createdDate,endDate} = req.body;
        const coupon = new Coupon({
            name:couponCode,
            createdOn:createdDate,
            expireOn:endDate,
            offerPercentage:discountPercentage,
            minimumPrice:minimumPrice,
            maximumPrice:maximumPrice
        })

        await coupon.save();
        res.redirect('/admin/coupons');

    } catch (error) {
        console.error("Error loading coupon page",error);
        res.redirect('/admin/pageerror');
    }
}

const deleteCoupon = async (req,res) => {
    try {
        
        const id = req.query.id;
        await Coupon.findByIdAndDelete(id);
        res.redirect('/admin/coupons');

    } catch (error) {
        
    }
}

module.exports = {
    getCouponPage,
    addCoupon,
    deleteCoupon
}