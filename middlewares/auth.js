const User = require("../models/userSchema");

const userAuth = (req, res, next) => {
  if (req.session.user) {
    User.findById(req.session.user)
      .then((data) => {
        if (data && !data.isBlocked) {
          // Attach user to req object for subsequent middleware/routes
          req.user = data;
          next();
        } else {
          res.redirect("/login");
        }
      })
      .catch((error) => {
        console.log("Error in user auth middleware");
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.redirect("/");
  }
};

const adminAuth = (req, res, next) => {
  User.findOne({ isAdmin: true })
    .then((data) => {
      if (data) {
        next();
      } else {
        res.redirect("/admin/login");
      }
    })
    .catch((error) => {
      console.log("Error in adminauth middleware", error);
      res.status(500).send("Internal Server Error");
    });
};

const checkBlocked = async (req, res, next) => {
  try {
      if (req.session.user) {
          const user = await User.findById(req.session.user);
          if (user && user.isBlocked) {
              req.session.destroy((err) => {
                  if (err) {
                      console.error("Session destruction error:", err);
                  }
                  return res.redirect("/login");
              });
              return; // Stop further execution
          }
      }
      next();
  } catch (error) {
      console.error("Blocked user check failed:", error);
      res.status(500).send("Server error");
  }
};

module.exports = {
  userAuth,
  adminAuth,
  checkBlocked
};
