const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const pageerror = async (req,res) => {
    res.render("admin-error")
    
}

const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard");
    }
    res.render("admin-login",{message:null});
}

const login = async (req,res) => {
    try {
        const {email,password} = req.body;
        console.log(email,password);
        const admin = await User.findOne({email,isAdmin:true});
        if(admin){
            const passwordMatch = await bcrypt.compare(password,admin.password);
            if(passwordMatch){
                req.session.admin = true;
                console.log("Admin logged in:", req.session.admin);
                return res.redirect("/admin/dashboard")
            }else{
                return res.redirect("/admin/login");
            }
        }else{
            return res.redirect("/admin/login");
        }
    } catch (error) {
        console.log("Login error:",error);
        return res.redirect("/admin/pageerror");
    }
    
}

const loadDashboard = async (req,res) => {
    if(req.session.admin){
        try {
            res.render("dashboard");
        } catch (error) {
            res.redirect("/admin/pageerror")
            
        }
    }
}

const logout = async (req,res) => {
    try {
        req.session.admin = null;
        res.redirect("/admin/login")
    } catch (error) {
        console.error("Error in logout",error);
        res.redirect("/admin/pageerror");
    }
    
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout
}