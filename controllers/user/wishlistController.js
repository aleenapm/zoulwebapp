const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');

const getWishList = async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.redirect('/login');
      }
  
      // Find the wishlist document and populate product details
      const wishlistDoc = await Wishlist.findOne({ userId: user })
        .populate('products.productId');
  
      console.log("wishdoc:", wishlistDoc);
  
      if (wishlistDoc) {
        // Sort products by `addedOn` in descending order
        wishlistDoc.products.sort((a, b) => b.addedOn - a.addedOn);
  
        // Render the wishlist view with sorted products
        return res.render('wishlist', { products: wishlistDoc.products });
      } else {
        // Render an empty wishlist view if no products found
        return res.render('wishlist', { products: null });
      }
    } catch (error) {
      console.error("Error loading wishlist", error);
      res.redirect('/page-not-found');
    }
  };
  

const addToWishlist = async (req, res) => {
    try {
      const productId = req.body.id;
      console.log("wishlist:",productId);
      const userId = req.session.user; // Assuming `userId` is stored as `user` in session
  
      // Check if product already in wishlist
      const existingWishlistItem = await Wishlist.findOne({ userId: userId, "products.productId": productId });
      if (existingWishlistItem) {
        return res.status(400).json({ message: 'Product already in wishlist' });
      }
  
      // If wishlist for the user doesn't exist, create it
      let wishlistDoc = await Wishlist.findOne({ userId });
      if (!wishlistDoc) {
        wishlistDoc = new Wishlist({ userId, products: [] });
      }
  
      // Add the product to the wishlist
      wishlistDoc.products.push({ productId });
      await wishlistDoc.save();
  
      res.status(200).json({ message: 'Product added to wishlist' });
    } catch (error) {
      console.error('Wishlist error:', error);
      res.status(500).json({ message: 'Error adding to wishlist' });
    }
  };
  

const removeItem = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { products: { productId } } }
    );

    res.redirect('/getWishlist');
  } catch (error) {
    console.error("Error removing item from wishlist", error);
    res.redirect('/page-not-found');
  }
};

module.exports = {
  getWishList,
  addToWishlist,
  removeItem
};
