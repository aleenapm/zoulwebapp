const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const getProductAddPage = async (req,res) => {
    try {
        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});
        res.render("product-add",{
            cat:category,
            brand:brand
        });
    } catch (error) {
        console.error("Error loading product add page:", error);
        res.redirect("/admin/pageerror");
    }
}

const addProducts = async (req,res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName:products.productName
        })

        if(!productExists){
            const images = [];
            
            if(req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
                    await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }
            

            const categoryId = await Category.findOne({name:products.category})

            if(!categoryId){
                return res.status(400).json("Invalid category name")
            }

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                brand:products.brand,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdAt:new Date(),
                quantity:products.quantity,
                size:products.size,
                color:products.color,
                productImage:images,
                status:"Available",
            })

            await newProduct.save();
            return res.redirect('/admin/addProducts')

        }else{
            return res.status(400).json("Product already exists, please try with another name");
        }

    } catch (error) {
        console.error("Error adding product",error)
        res.redirect('/admin/pageerror')
    }
}

const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Count documents before applying pagination
        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ]
        }).countDocuments();

        // Fetch paginated product data
        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ]
        })
            .populate('category')
            .skip(skip)
            .limit(limit)
            .exec();

        const totalPages = Math.ceil(count / limit);

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        if (category && brand) {
            res.render("products", {
                data: productData,
                totalPages,
                page,
                cat: category,
                brand: brand,
                search
            });
        } else {
            res.render("page-404");
        }
    } catch (error) {
        console.error("Error in getAllProducts:", error);
        res.redirect("/admin/pageerror");
    }
};


const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (!findCategory) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: "This product's category already has a category offer" });
        }

        findProduct.salePrice =
            findProduct.regularPrice - Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();

        findCategory.categoryOffer = 0; // Reset category offer
        await findCategory.save();

        return res.json({ status: true, message: "Product offer added successfully" });
    } catch (error) {
        console.error("Error in addProductOffer:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const removeProductOffer = async (req, res) => {
    try {
        const productId = req.body.productId;

        const findProduct = await Product.findById(productId);
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const percentage = findProduct.productOffer;

        if (typeof findProduct.salePrice === "number" && typeof findProduct.regularPrice === "number") {
            findProduct.salePrice =
                findProduct.salePrice + Math.floor(findProduct.regularPrice * (percentage / 100));
            findProduct.productOffer = 0;

            await findProduct.save();
            return res.json({ status: true, message: "Product offer removed successfully" });
        } else {
            return res.status(400).json({ status: false, message: "Invalid product price data" });
        }
    } catch (error) {
        console.error("Error in removeProductOffer:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};


const blockProduct = async (req,res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/admin/pageerror") 
    }
}

const unblockProduct = async (req,res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/admin/pageerror") 
    }
}

const deleteProduct = async (req,res) => {
    try {
        const id = req.query.id;
        await Product.findByIdAndDelete(id);
        console.log("Product deleted successfully:", id);
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/admin/pageerror");
        
    }
    
}

const getEditProduct = async (req,res) => {
    try {
        const id = req.query.id;
        const product = await Product.findById(id);
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render("edit-product",{
            product:product,
            cat:category,
            brand:brand,
        })
    } catch (error) {
        res.redirect("/admin/pageerror");
        
    }
    
}

const editProduct = async (req, res) => {
    try {
        const id = req.query.id;
        console.log(id);

    
        const product = await Product.findById({ _id: id });
        const data = req.body;

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });
        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try with another name" });
        }

        const images = [];

        
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

        const category = await Category.findOne({ name: data.category });

       
        const updatefields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: category._id,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            color: data.color
        };

        if (req.files.length > 0) {
            updatefields.$push = { productImage: { $each: images } };
        }

        if (parseInt(data.quantity) === 0) {
            updatefields.status = "Out of Stock";
        } else {
            updatefields.status = "Available";
        }

        await Product.findByIdAndUpdate(id, updatefields, { new: true });

        res.redirect("/admin/products");

    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");
    }
}

const deleteSingleImage = async (req,res) => {
    try {
        const{imageNameToServer, productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath = path.join("public","uploads","re-image",imageNameToServer);
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
        }else{
            console.log(`Image ${imageNameToServer} not found`);
        }
        res.send({status:true});
    } catch (error) {
        res.redirect("/admin/pageerror");
        
    }
    
}

module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    deleteProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}