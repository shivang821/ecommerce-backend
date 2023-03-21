const jwt = require("jsonwebtoken");
const User = require("../models/userSchema")
exports.isAuthenticate = async(req, res, next) => {
    try {
        const { token } = req.cookies;
        if (!token) {
            return res.status(401).json({ success: false, message: "please login to access this page" })
        }
        const decodedData = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decodedData.id);
        if (!user) return res.status(400).json({ success: false, message: "please login to access this page" })
        req.user = user;
        next()
    } catch (error) {
        res.status(400).json({ success: false, message: 'error' })
    }
}

exports.authorizeRole = (req, res, next) => {
    if (req.user.role != "admin") return res.status(403).json({ success: false, message: `Role:${req.user.role} is not allowed to access this page` })
    next()
}