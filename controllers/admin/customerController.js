const User = require("../../models/userSchema");



const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 10;  // Increased from 3 to 10 for better UX

        const searchConditions = {
            isAdmin: false,
            $or: [
                {name: {$regex: search, $options: 'i'}},
                {email: {$regex: search, $options: 'i'}}
            ]
        };

        const userData = await User.find(searchConditions)
            .select('name email phone isBlocked loginStatus')
            .limit(limit)
            .skip((page - 1) * limit);

        const count = await User.countDocuments(searchConditions);

        res.render("customers", {
            data: userData,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            search: search  // Pass search term back to view
        });
    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");
    }
};
const customerBlocked = async (req,res) => {
    try {
        const userId = req.query.id;
        await User.findByIdAndUpdate(userId, { 
            isBlocked: true,
            loginStatus: false 
        });
        res.redirect('/admin/customers');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/customers');
    }
};
const customerunBlocked = async (req,res) => {
    try {
        const userId = req.query.id;
        await User.findByIdAndUpdate(userId, { 
            isBlocked: false 
        });
        // req.flash('success', 'Customer unblocked successfully');
        res.redirect('/admin/customers');
    } catch (error) {
        console.error(error);
        // req.flash('error', 'Failed to unblock customer');
        res.redirect('/admin/customers');
    }
    
}



module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,

}