const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
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
        req.session.user = findUser._id;
        res.redirect("/")
    } catch (error) {
        console.error("login error",error);
        res.render("login",{message:"login failed. Please try again later"})
        
    }
}

const signup = async (req,res) => {
    try {
        const {name,phone,email,password,cPassword} = req.body
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
        req.session.userData = {name,phone,email,password};

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
            return res.render("login")
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

const loadShopping = async (req,res) => {
    try {
        return res.render("shop");
    } catch (error) {
        console.log("shopping page not loading:",error);
        res.status(500).send("Server Error")
        
    }
    
}

const loadHomepage = async(req,res)=>{
    try{
        const user = req.session.user;
        // console.log(user)
        const categories = await Category.find({isListed:true});
        let productData = await Product.find(
            {isBlocked:false,
                category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}
            }
        )

        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));
        productData = productData.slice(0);
        if(user){
            const userData = await User.findById(user);
            console.log(userData);
            res.render("home",{user:userData,products:productData, categories});
        }else{
            return res.render("home",{products:productData, categories});
        }

    }catch(error){
        console.log("Home page not loading",error);
        res.status(500).send("Server error");
    }
}

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
        console.log("Received OTP:", otp);
        console.log("Stored OTP:", req.session.userOtp);
        
        // Compare with userOtp instead of user
        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);
            
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            });
            
            await saveUserData.save();
            req.session.user = saveUserData._id;
            // Clear the OTP after successful verification
            req.session.userOtp = null;
            req.session.userData = null;

            
            res.json({ success: true, redirectUrl: "/" });
        } else {
            res.status(400).json({ 
                success: false, 
                message: "Invalid OTP, Please try again" 
            });
        }
    } catch (error) {
        console.error("Error Verifying OTP:", error);
        res.status(500).json({ 
            success: false, 
            message: "An error occurred" 
        });
    }
}
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

const logout = async (req,res) => {
    try {
        req.session.user = null;
        res.redirect("/login")
    } catch (error) {
        console.error("Error in logout",error);
        res.redirect("/pageNotFound");
    }
    
}

const productDetails = async (req,res) => {
    try {
        const productId = req.query.id;
        const user = req.session.user
        const product = await Product.findById(productId);
        const category = await Category.findById(product.category);
        const userData = await User.findById(user);
     
        res.render("productview",{product,
            cat:category,
            user:userData,
        });
    } catch (error) {
        console.error("Error in productDetails",error);
    }
    
}

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
        
        // Search products by name
        const products = await Product.find({
            productName: { $regex: searchQuery, $options: 'i' }
        });
        
        res.json({ products });
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    
  }
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
    searchProducts
}