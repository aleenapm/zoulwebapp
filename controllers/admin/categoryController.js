const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");


const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Convert page to a number
        const limit = 10;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const count = await Category.countDocuments();
        const totalPages = Math.ceil(count / limit);

        res.render("category", {
            cat: categoryData,
            totalPages,
            page,
        });
    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");
    }
};


const addCategory = async (req,res) => {
    const {name,description} = req.body;
    try {
       const existingCategory = await Category.findOne({name});
       if(existingCategory){
        return res.status(400).json({error:"Category already exists"})
       } 
       const newCategory = new Category({name,description});
       await newCategory.save();
       return res.json({message:"Category added successfully"})
    } catch (error) {
        console.log("Error in addCategory:",error)
        return res.status(500).json({error:"Internal Server Error"})
    }
    
}

const addCategoryOffer = async (req,res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if(!category){
            return res.status(404).json({status:false,message:"Category not found"});
        }
        const products = await Product.find({category:category._id});
        const hasProductOffer = products.some((product)=>product.productOffer > percentage);
        if(hasProductOffer){
            return res.json({status:false, message:"Products within this category already have product offers"});
        }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});

        for(const product of products){
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            await product.save();
        }
        res.json({status:true});
    } catch (error) {
        res.status(500).json({status:false, message:"Internal server Error"});
    }
}


const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        console.log("Received categoryId:", categoryId);

        const category = await Category.findById(categoryId);
        if (!category) {
            console.error("Category not found for ID:", categoryId);
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const percentage = category.categoryOffer;
        const products = await Product.find({ category: category._id });

        if (products.length > 0) {
            for (const product of products) {
                console.log(`Updating product: ${product._id}`);
                product.salePrice += Math.floor(product.regularPrice * (percentage / 100));
                product.productOffer = 0;
                await product.save();
            }
        }

        category.categoryOffer = 0;
        await category.save();
        console.log("Category offer removed successfully");
        return res.json({ status: true });
    } catch (error) {
        console.error("Error in removeCategoryOffer:", error);
        return res.status(500).json({ status: false, message: "Internal server error" });
    }
};


const getListcategory = async (req,res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect("/admin/pageerror");
    }   
}

const getUnlistcategory = async (req,res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect("/admin/pageerror");
    }   
}

const getEditcategory = async (req,res) => {
    try {
        let id = req.query.id;
        const category = await Category.findOne({_id:id})
        res.render("edit-category",{category:category});
    } catch (error) {
        res.redirect("/admin/pageerror");
    }   
}

const editcategory = async (req,res) => {
    try {
        let id = req.params.id;
        const {categoryName, description} = req.body;

        console.log(req.body);
        console.log("Category ID:", id);

        const existingCategory = await Category.findOne({name:categoryName});

        if(existingCategory){
            return res.status(400).json({error:"Category exists, Please choose another name"})
        }
        const updateCategory = await Category.findByIdAndUpdate(id,{
            name:categoryName,
            description:description,
        },{new:true});

        if(updateCategory){
            res.redirect("/admin/category");
        }else{
            res.status(404).json({error:"Category not found"});
        }
    } catch (error) {
        res.status(500).json({error:"Internal server error"})
    }   
}



module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListcategory,
    getUnlistcategory,
    getEditcategory,
    editcategory
}