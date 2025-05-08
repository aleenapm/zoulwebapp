const Banner = require("../../models/bannerSchema");
const path = require("path");
const fs = require("fs");

const getBannerPage = async (req,res) => {
    try {
        const page= (req.query.page) || 1;
        const limit = 5;
        const skip = (page-1)*limit;
        const findBanner = await Banner.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const count = await Banner.countDocuments();
        const totalPages =Math.ceil(count/limit);
        res.render("banner",{data:findBanner,count:count,totalPages,page});
    } catch (error) {
        res.redirect("/admin/pageerror");
    }   
}

const getAddBannerPage = async (req, res) => {
    try {
        res.render("addBanner");
    } catch (error) {
        console.error("Error in getAddBannerPage:", error);
        res.redirect("/pageerror");
    }
};

const addBanner = async (req,res) => {
    try {
        const data = req.body;
        const image = req.file;

        const newBanner = new Banner({
            image:image.filename,
            title:data.title,
            description:data.description,
            startDate:new Date(data.startDate+"T00:00:00"),
            endDate:new Date(data.endDate+"T00:00:00"),
            link:data.link,
            hidden: false 
        })
        await newBanner.save();
        res.redirect("/admin/banner");
    } catch (error) {
        console.error("Error in addBanner:", error);
        res.redirect("/admin/pageerror"); 
    }
}

const getEditBannerPage = async (req, res) => {
    try {
        const bannerId = req.query.id;
        const banner = await Banner.findById(bannerId);
        if (!banner) {
            return res.redirect("/admin/pageerror");
        }
        res.render("editBanner", { banner });
    } catch (error) {
        console.error("Error in getEditBannerPage:", error);
        res.redirect("/admin/pageerror");
    }
};

const editBanner = async (req, res) => {
    try {
        const { id, title, description, startDate, endDate, link } = req.body;
        const updatedData = {
            title,
            description,
            startDate: new Date(startDate + "T00:00:00"),
            endDate: new Date(endDate + "T00:00:00"),
            link,
        };

        if (req.file) {
            const banner = await Banner.findById(id);
            if (banner.image) {
                const oldImagePath = path.join(__dirname, "../../public/uploads/re-image/", banner.image);
                fs.unlinkSync(oldImagePath); 
            }
            updatedData.image = req.file.filename;
        }

        await Banner.findByIdAndUpdate(id, updatedData, { new: true });
        res.redirect("/admin/banner");
    } catch (error) {
        console.error("Error in editBanner:", error);
        res.redirect("/admin/pageerror");
    }
};

const deleteBanner = async (req,res) => {
    try {
        const id = req.query.id;
        await Banner.deleteOne({_id:id});
        res.redirect("/admin/banner");
    } catch (error) {
        console.error("Error in deleteBanner:", error);
        res.redirect("/admin/pageerror")
    }
}

const toggleBannerVisibility = async (req, res) => {
    try {
        const { id, hidden } = req.body;
        const banner = await Banner.findByIdAndUpdate(
            id, 
            { hidden: hidden },
            { new: true } 
        )
        if (!banner) {
            return res.status(404).json({ 
                success: false, 
                message: "Banner not found" 
            });
        }
        res.json({ 
            success: true, 
            message: hidden ? "Banner has been hidden." : "Banner is now visible." 
        });
    } catch (error) {
        console.error("Error in toggleBannerVisibility:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to update banner visibility." 
        });
    }
};

module.exports = {
    getBannerPage,
    getAddBannerPage,
    addBanner,
    deleteBanner,
    toggleBannerVisibility,
    getEditBannerPage,
    editBanner
}