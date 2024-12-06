const Wishlist = require('../../models/wishlistSchema');
const Banner = require('../../models/bannerSchema');
const Product = require('../../models/productSchema');

const getWishList = async (req, res) => {
  try {
      const user = req.session.user;
      if (!user) {
          return res.redirect('/login');
      }

      const wishlistDoc = await Wishlist.findOne({ userId: user }).populate('products.productId');

      if (wishlistDoc) {
          const validProducts = wishlistDoc.products.filter(product => product.productId);

          validProducts.sort((a, b) => b.addedOn - a.addedOn);

          return res.render('wishlist', { products: validProducts });
      } else {
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
      const userId = req.session.user;
      console.log(userId);
  
      const existingWishlistItem = await Wishlist.findOne({ userId: userId, "products.productId": productId });
      console.log(existingWishlistItem);
      if (existingWishlistItem) {
        return res.status(400).json({ message: 'Product already in wishlist' });
      }
  
      let wishlistDoc = await Wishlist.findOne({ userId });
      if (!wishlistDoc) {
        wishlistDoc = new Wishlist({ userId, products: [] });
      }
  
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
