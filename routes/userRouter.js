const express = require("express");
const router = express.Router();
const passport = require("../config/passport");

const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController");
const sortController = require("../controllers/user/sortController");
const orderController = require("../controllers/user/orderController");
const couponController = require("../controllers/user/couponController");
const wishlistController = require("../controllers/user/wishlistController");
const paymentController = require("../controllers/user/paymentController");


const { userAuth,checkBlocked } = require("../middlewares/auth");
const User = require("../models/userSchema");

router.use(async (req, res, next) => {
  try {
    if (req.session.user) {
      const user = (await User.findById(req.session.user)) || null;
      res.locals.user = user;
    } else {
      res.locals.user = null;
    }
    next();
  } catch (error) {
    console.log(error);
    next(error);
  }
});


//error management
router.get("/pageNotFound", userController.pageNotFound);

//home page
router.get("/", checkBlocked, userController.loadHomepage);
router.get("/about",userController.loadAbout);

//signup management
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.get("/auth/google",passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback",passport.authenticate("google", { failureRedirect: "/signup" }),
(req, res) => {
    req.session.user = req.user._id;
    res.redirect("/");
  }
);


//login-logout management
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/logout", userController.logout);

//product management
router.get("/productDetails", userController.productDetails);
router.get("/sortProducts", sortController.sortProducts);
router.get('/filter-by-category',userController.catFilter);
router.get("/searchProducts",userController.searchProducts);
router.get("/loadShop",userController.loadShopping);
router.get("/shop", userController.loadCategoryProducts);



//profile management
router.get("/forgot-password", profileController.getForgotPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendOtp);
router.post("/reset-password", profileController.postNewPassword);
router.get("/userProfile", userAuth, profileController.userProfile);
router.get("/change-email", userAuth, profileController.changeEmail);
router.post("/change-email", userAuth, profileController.changeEmailValid);
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.post("/update-email", userAuth, profileController.updateEmail);
router.get("/change-password", userAuth, profileController.changePassword);
router.post("/change-password",userAuth,profileController.changePasswordValid);
router.post("/verify-changepassword-otp",profileController.verifyChangePassOtp);

//address management
router.get("/addAddress", userAuth, profileController.addAddress); 
router.post("/addAddress", userAuth, profileController.postAddAddress);
router.get("/editAddress", userAuth, profileController.editAddress);
router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);

//cart management
router.get("/checkout", userAuth, cartController.loadCheckout); //checkout
router.post("/addToCart", userAuth, cartController.addToCart);
router.get("/getCart", userAuth, cartController.getCart);
router.post("/updateCartQuantity",userAuth, cartController.updateQuantity);
router.post("/removeProduct", userAuth, cartController.removeProduct);

//order management
router.get("/order", userAuth, orderController.getOrder); 
router.post("/createOrder", userAuth, orderController.createOrder); 
router.get("/api/user/orders",userAuth, orderController.getUserOrders);
router.post("/cancelOrder", userAuth, orderController.cancelOrder);
router.get("/orderDetails",userAuth,orderController.orderDetails);
router.get('/downloadInvoice',userAuth,orderController.getInvoice);



//coupon management
router.get('/couponList',userAuth,couponController.getCouponList); 
router.post('/applyCoupon',userAuth, couponController.applyCoupon);
router.post('/removeCoupon',userAuth, couponController.removeCoupon);

//wishlist
router.get('/getWishlist',userAuth, wishlistController.getWishList);
router.post('/addToWishlist',userAuth, wishlistController.addToWishlist);
router.post('/removeWishlistItem',userAuth, wishlistController.removeItem);

//payment 
router.post('/createRazorpay',userAuth,paymentController.createRazorpay);
router.post('/updatePayment',userAuth,paymentController.updatePaymentStatus)



module.exports = router;
