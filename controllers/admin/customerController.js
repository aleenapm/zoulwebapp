const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        const page= (req.query.page) || 1;
        const limit = 10;
        const skip = (page-1)*limit;
        const searchConditions = {
            isAdmin: false,
            $or: [
                {name: {$regex: search, $options: 'i'}},
                {email: {$regex: search, $options: 'i'}}
            ]
        };

        const userData = await User.find(searchConditions)
            .select('name email phone isBlocked loginStatus')
            .skip(skip).limit(limit);

        const count = await User.countDocuments(searchConditions);
        const totalPages =Math.ceil(count/limit);

        res.render("customers", {
            data: userData,
            totalPages,
            page,
            count:count,
            search: search 
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
        res.redirect('/admin/customers');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/customers');
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,

}