const express = require("express");
const router = express.Router();
const admincontroller = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController");
const stockController = require('../controllers/admin/stockController');
const couponController = require("../controllers/admin/couponController");
const salesController = require("../controllers/admin/salesController");
const dashboardController = require('../controllers/admin/dashboardController');

const { userAuth, adminAuth } = require("../middlewares/auth");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({ storage: storage });

//error management
router.get("/pageerror", admincontroller.pageerror);

//login management 
router.get("/login", admincontroller.loadLogin);
router.post("/login", admincontroller.login);
router.get("/logout", admincontroller.logout);

// API routes for dashboard data
router.get('/dashboard',adminAuth,dashboardController.dashboard);
router.get('/bestSellingProducts', adminAuth, dashboardController.getBestSellingProducts);
router.get('/bestSellingCategories', adminAuth, dashboardController.getBestSellingCategories);
router.get('/bestSellingBrands', adminAuth, dashboardController.getBestSellingBrands);
router.get('/overview',adminAuth, dashboardController.getDashboardOverview);

//customer management
router.get("/customers", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);

//category management
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer); 
router.get("/listCategory", adminAuth, categoryController.getListcategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistcategory);
router.get("/editCategory", adminAuth, categoryController.getEditcategory);
router.post("/editCategory/:id", adminAuth, categoryController.editcategory);

//brand management
router.get("/brands", adminAuth, brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unBlockBrand", adminAuth, brandController.unBlockBrand);
router.get("/deleteBrand", adminAuth, brandController.deleteBrand);

//product management
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("images", 4),productController.addProducts);
router.get("/products", adminAuth, productController.getAllProducts);
router.post("/addProductOffer", adminAuth, productController.addProductOffer); 
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post("/editProduct",adminAuth,uploads.array("images", 4),productController.editProduct);
router.post("/deleteImage", adminAuth, productController.deleteSingleImage);
router.get("/deleteProduct",adminAuth,productController.deleteProduct);

//order management
router.get("/orders", adminAuth, orderController.loadOrders);
router.post('/update-order-status', orderController.updateOrderStatus);

//stock management
router.get('/stock',adminAuth,stockController.getStocks);
router.post('/update-stock',adminAuth,stockController.updateStock);

//coupon management
router.get('/coupons',adminAuth,couponController.getCouponPage);
router.post('/saveCoupon',adminAuth,couponController.addCoupon);
router.get('/deleteCoupon',adminAuth,couponController.deleteCoupon);

//sales report
router.get('/salesReport',adminAuth,salesController.getSalesReport);




module.exports = router;
