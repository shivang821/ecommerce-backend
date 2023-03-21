const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'please enter name'],
        maxLength: [30, "name should not exceed 30 characters"],
        minLength: [4, 'name should have more than 4 characters']
    },
    email: {
        type: String,
        requierd: true,
        unique: true,
        validate: [validator.isEmail, "please enter valid email"]
    },
    password: {
        type: String,
        required: [true, "please enter password"],
        minLength: [8, "password should be greater than 8 characters"],
        select: false
    },

    avatar: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    },
    role: {
        type: String,
        required: [true, "please enter role"],
        default: "user"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date

})
userSchema.pre("save", async function(next) {
        if (!this.isModified("password")) {
            next()
        }
        this.password = await bcrypt.hash(this.password, 10)
    })
    // generating token
userSchema.methods.getJwtToken = function() {
        return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE })
    }
    // compare password
userSchema.methods.comparePassword = async function(currPassword) {
        return await bcrypt.compare(currPassword, this.password)
    }
    // forgot password
userSchema.methods.getResetPasswordToken = function() {
    // generation token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // hashing and addin resetPasswordresetToken to userSchema 
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    return resetToken;
}
module.exports = mongoose.model("User", userSchema)