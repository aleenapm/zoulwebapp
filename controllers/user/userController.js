const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");
const Banner = require("../../models/bannerSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt")


const pageNotFound = async (req,res) => {
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")  
    } 
}

function generateReferalCode(length) {
    let result = '';
    const characters = 'abcdef0123456789';

    for (let i = 0; i < length; i++) {
        result += characters[Math.floor(Math.random() * characters.length)];
    }
    return result;
}


function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();
}
async function sendVerificationEmail(email,otp) {
    try {
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP: ${otp}<b>`,
        })

        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }
    
}

const login = async(req,res)=>{
    try {
        const {email,password} = req.body;
        const findUser = await User.findOne({isAdmin:0,email:email});
        if(!findUser){
            return res.render("login",{message:"User not found"});
        }
        if(findUser.isBlocked){
            return res.render("login",{message:"User is blocked by admin"})
        }
        const passwordMatch = await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"});
        }
        findUser.setLoggedIn();
        req.session.user = findUser._id;
        res.redirect("/")
    } catch (error) {
        console.error("login error",error);
        res.render("login",{message:"login failed. Please try again later"})
        
    }
}

const signup = async (req,res) => {
    try {
        const {name,phone,email,referal,password,cPassword} = req.body
        if(password !== cPassword){
            return res.render("signup",{message:"Passwords do not match"})
        }
        const findUser = await User.findOne({email});
        if(findUser){
            return res.render("signup",{message:"User with this email already exists"})
        }

        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.json("email-error")
        }

        req.session.userOtp = otp;
        req.session.userData = {name,phone,email,password,referal};

        res.render("verify-otp");
        console.log("OTP Sent",otp);

    } catch (error) {

        console.log("signup error",error);
        res.redirect("/pageNotFound")
    }
    
}

const loadSignup = async (req,res) => {
    try {
        return res.render("signup");
    } catch (error) {
        console.log("Home page not loading:",error);
        res.status(500).send("Server Error")
        
    }
    
}

const loadLogin = async (req,res) => {
    try {
        if(!req.session.user){
            return res.render("login",{
                message: ""
            })
        }else{
            res.redirect("/")
        }
    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
    
}

const loadAbout = async (req,res) => {
    try {
       
        return res.render("about")
        
    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
    
}
const loadShopping = async (req, res) => {
    try {
        const categories = await Category.find();

        const categoryName = req.query.category;
        const page = parseInt(req.query.page) || 1;

        const category = categoryName ? await Category.findOne({ name: categoryName }) : null;

        if (categoryName && !category) {
            return res.status(404).send('Category not found');
        }

        const itemsPerPage = 12; 
        const skip = (page - 1) * itemsPerPage;

        let products;
        if (category) {
            products = await Product.find({ category: category._id, isBlocked: false }) // Exclude blocked products
                .skip(skip)
                .limit(itemsPerPage);
        } else {
            products = await Product.find({ isBlocked: false }) // Exclude blocked products
                .skip(skip)
                .limit(itemsPerPage);
        }

        const totalProducts = category 
            ? await Product.countDocuments({ category: category._id, isBlocked: false }) // Count unblocked products
            : await Product.countDocuments({ isBlocked: false }); // Count unblocked products

        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        res.render('shop', {
            products,
            categories,
            selectedCategory: categoryName || '',
            page,        
            totalPages,   
        });
    } catch (err) {
        console.error('Error fetching products or categories:', err);
        res.status(500).send('Internal Server Error');
    }
};




const loadHomepage = async(req,res)=>{ 
    try {
        const today = new Date().toISOString();
        
        const findBanner = await Banner.find({
            hidden: false,  
            startDate: { $lt: new Date(today) },
            endDate: { $gt: new Date(today) }
        });

        const user = req.session.user;
        const categories = await Category.find({
            isListed: true, 
            name: "Personalised collection"
        });

        let productData = await Product.find({
            isBlocked: false, // Exclude blocked products
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 }
        });

        productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        productData = productData.slice(0);

        if (user) {
            const userData = await User.findById(user);
            return res.render("home", {
                user: userData,
                products: productData,
                categories,
                banners: findBanner || []
            });
        } else {
            return res.render("home", {
                products: productData,
                categories,
                banners: findBanner || []
            });
        }
    } catch (error) {
        console.log("Home page not loading", error);
        res.status(500).send("Server error");
    }
};

const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        
    }
}


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("User entered OTP:", otp);
        console.log("Session OTP:", req.session.userOtp);

        if (otp ==req.session.userOtp) {
            const user = req.session.userData;
            console.log(user)
            const passwordHash = await securePassword(user.password);
            const referalCode = generateReferalCode(8);

            let refererBonus = 120;
            let newUserBonus = 100;
            if (user) {
                const refererUser = await User.findOne({ referalCode: user.referal });
        
                if (refererUser) {
                  await Wallet.findOneAndUpdate(
                    { userId: refererUser._id },
                    {
                      $inc: { balance: refererBonus },
                      $push: {
                        transactions: {
                          type: "referal",
                          amount: refererBonus,
                          description: "Referral bonus for referring a new user"
                        }
                      }
                    },
                    { upsert: true }
                  );
                }
            }
            const saveUserData = new User({
                name: user.name,   
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                referalCode
            });

            await saveUserData.save();
            await Wallet.create({
                userId: saveUserData._id,
                balance: user.referal ? newUserBonus : 0,
                transactions: user.referal
                  ? [{
                    type: "referal",
                    amount: newUserBonus,
                    description: "Referral bonus for signing up with a referral code"
                  }]
                  : []
              });
            req.session.user = saveUserData._id;

            return res.json({
                success: true,
                redirectUrl: '/'
            });

        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid OTP, please try again'
            });
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred'
        });
    }
};
const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData || {};
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: "Email not found in session" 
            });
        }

        const otp = generateOtp();
        req.session.userOtp = otp; 

        const emailSent = await sendVerificationEmail(email, otp);
        console.log("Email sent response:", emailSent);

        if (emailSent) {
            console.log("Resend OTP:", otp);
            return res.status(200).json({ 
                success: true, 
                message: "OTP Resent Successfully" 
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                message: "Failed to resend OTP. Please try again." 
            });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error: Please try again." });
    }
}

const logout = async (req, res) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            if (user) {
                user.setLoggedOut();
                await user.save();
            }
            
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error destroying session:", err);
                }
                res.redirect("/login");
            });
        } else {
            res.redirect("/login");
        }
    } catch (error) {
        console.error("Error in logout", error);
        res.redirect("/pageNotFound");
    }
}

const productDetails = async (req, res) => {
    try {
        const productId = req.query.id;
        const user = req.session.user;

        const product = await Product.findOne({ _id: productId, isBlocked: false }); // Exclude blocked products
        if (!product) {
            return res.status(404).send("Product not found or is blocked");
        }

        const categoryId = product.category;
        const recommendedProducts = await Product.find({
            category: categoryId,
            isBlocked: false, // Exclude blocked products
            _id: { $ne: productId } // Exclude the current product
        });

        const category = await Category.findById(product.category);
        const userData = await User.findById(user);
     
        res.render("productview", {
            product,
            cat: category,
            user: userData,
            recommended: recommendedProducts 
        });
    } catch (error) {
        console.error("Error in productDetails", error);
        res.status(500).send("Server error");
    }
};


const catFilter = async (req, res) => {
    try {
  
      const category = req.query.category;
      let products;
  
      if (category === 'all-categories') {
        products = await Product.find({});
      } else {
        products = await Product.find({ category: category });
      }
  
      res.json({ products });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching products' });
    }
  }

  const searchProducts = async (req,res) => {
    try {
        const searchQuery = req.query.query.toLowerCase();
        
        const products = await Product.find({
            productName: { $regex: searchQuery, $options: 'i' }
        });
        
        res.json({ products });
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    
  }
  const loadCategoryProducts = async (req, res) => {
    try {
        const categories = await Category.find();

        const categoryName = req.query.category;
        if (!categoryName) {
            console.error('Category not specified');
            return res.status(400).send('Category not specified');
        }

        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            console.error(`Category '${categoryName}' not found`);
            return res.status(404).send('Category not found');
        }

        const itemsPerPage = 12;
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1); 

        const products = await Product.find({ category: category._id, isBlocked: false }) // Exclude blocked products
            .limit(itemsPerPage);

        const totalProducts = await Product.countDocuments({ category: category._id, isBlocked: false }); // Count unblocked products
        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        
        res.render('shop', {
            products,
            categories,
            page,
            totalPages,
            selectedCategory: categoryName,
        });
    } catch (err) {
        console.error("Error fetching products or categories:", err);
        res.status(500).send('Server error');
    }
};






module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    loadLogin,
    loadAbout,
    loadShopping,
    signup,
    login,
    verifyOtp,
    resendOtp,
    logout,
    productDetails,
    catFilter,
    searchProducts,
    loadCategoryProducts
}