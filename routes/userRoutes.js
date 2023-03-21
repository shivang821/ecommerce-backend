const User = require('../models/userSchema');
const express = require('express')
const router = express.Router()
const sendEmail = require('../utils/sendEmail')
const cloudinary = require('cloudinary')
    // create user
const crypto = require('crypto')
const sendToken = require('../utils/jwToken');
const { isAuthenticate, authorizeRole } = require("../middleware/auth");
const { response } = require('express');
const validationError = require('../utils/validationError');
router.route('/register').post(postUser);
async function postUser(req, res, next) {
    try {
        const { email, name, password, role } = req.body;
        let user = await User.findOne({ email });
        if (user) { return res.status(400).json({ success: false, message: "user already exist" }) }
        const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, { folder: "avatars", width: 150, crop: "scale" })
        user = await User.create({
            email,
            name,
            password,
            role,
            avatar: {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        })
        sendToken(user, 201, res, "user registered");
    } catch (error) {

    }
}

router.route('/login').post(loginUser)

async function loginUser(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "please enter email and password" })
        }
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(400).json({ success: false, message: "user not found" })
        }
        const isMatch = await user.comparePassword(password);
        if (user && isMatch) {
            sendToken(user, 200, res, "user loged in")
        } else {
            return res.status(400).json({ success: false, message: 'invalid username or password' })
        }
    } catch (error) {

        res.status(400).json({ message: "error" })
    }
}
// loguot

router.route('/logout').get(logOutUser);

async function logOutUser(req, res) {
    try {
        res.cookie('token', null, { expires: new Date(Date.now()), httpOnly: true })
        res.status(200).json({ success: true, message: "user logged out" })
    } catch (error) {

    }
}
router.route('/password/forgot').post(forgotPassword)

async function forgotPassword(req, res, next) {

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: "user not found" })
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`

    const message = `Your password reset token is :- \n\n${resetPasswordUrl}\n\nif you have not requested this email then please ignore it.`
    try {
        await sendEmail({
            email: user.email,
            subject: 'Ecommerce password recovery',
            message
        })
        res.status(200).json({ success: true, message: `email sent to ${user.email} successfully` })
    } catch (error) {
        user.resetPasswordToken = undefined;

        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return res.status(500).json({ message: error.message, success: false })
    }
}

// get user details

router.route('/me').get(isAuthenticate, getDetails)

async function getDetails(req, res) {
    try {
        const user = await User.findOne({ _id: req.user.id });
        res.status(200).json({ success: true, user })
    } catch (error) {

    }
}





router.route('/password/reset/:token').patch(resetPassword)
async function resetPassword(req, res, next) {
    try {
        const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
        const user = await User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } })
        if (!user) return res.status(400).json({ success: false, message: "reset password token is invalid or has been expired" })
        if (req.body.password !== req.body.confirmPassword) {
            return res.status(400).json({ success: false, message: "password and confirm password does not match" })
        }
        user.password = req.body.password;
        user.resetPasswordExpire = undefined;
        user.resetPasswordToken = undefined;
        await user.save()
        sendToken(user, 200, res, "password changed successfully");

    } catch (error) {

    }
}

// updatePassword

router.route('/password/update').patch(isAuthenticate, updateUserPassword)
async function updateUserPassword(req, res) {
    try {
        const user = await User.findById(req.user.id).select("+password");
        const isMatch = await user.comparePassword(req.body.oldPassword);
        if (!isMatch) return res.status(400).json({ success: false, message: "old password is incorrect" })
        if (req.body.newPassword !== req.body.confirmPassword) return res.status(400).json({ success: false, message: "new password and confirm password doesn't match" })
        user.password = req.body.newPassword;
        await user.save()
        sendToken(user, 200, res, "password changed successfully");
    } catch (error) {

    }
}
// update user profile
router.route('/me/update').patch(isAuthenticate, updateProfile)
async function updateProfile(req, res) {
    try {
        const newUser = {
            email: req.body.email,
            name: req.body.name
        }

        if (req.body.avatar != "") {

            const userUp = await User.findById(req.user.id);
            const imageId = userUp.avatar.public_id;
            await cloudinary.uploader.destroy(imageId);

            const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, { folder: "avatars", width: 150, crop: "scale" })

            newUser.avatar = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }

        }

        const user = await User.findByIdAndUpdate(req.user.id, newUser, { new: true, runValidators: true })
        sendToken(user, 200, res, "profile updated")
    } catch (error) {
        if (error.name == "ValidationError") {
            validationError(error, res)
        }
    }
}
// get users in admin route
router.route('/admin/users').get(isAuthenticate, authorizeRole, getAllUsers)

async function getAllUsers(req, res) {
    try {
        const users = await User.find();
        res.status(200).json({ success: true, users })
    } catch (error) {

    }
}

router.route('/admin/user/:id').get(isAuthenticate, authorizeRole, getSingelUser).patch(isAuthenticate, authorizeRole, updateUserRole).delete(isAuthenticate, authorizeRole, deleteUserAdmin)
async function getSingelUser(req, res) {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(400).json({ message: 'user not exist', success: false })
        res.status(200).json({ success: true, user })
    } catch (error) {

    }
}

// update user role --Admin
async function updateUserRole(req, res) {
    try {
        const newUser = {
            role: req.body.role
        }
        const user = await User.findByIdAndUpdate(req.params.id, newUser, { new: true, runValidators: true })
        if (!user) return res.status(400).json({ message: 'user not exist', success: false })
        res.status(200).json({ success: true, user })
    } catch (error) {
        if (error.name == "ValidationError") {
            validationError(error, res)
        }
    }
}
// delete userProfile --Admin
async function deleteUserAdmin(req, res) {
    try {
        const user = await User.findById(req.params.id)
        if (!user) return res.status(400).json({ message: `user does not exist with id: ${req.params.id}`, success: false })
        await user.remove()
        res.status(200).json({ success: true, message: "user deleted" })
    } catch (error) {

    }
}
module.exports = router;