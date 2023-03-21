const mongoose = require('mongoose')
var validator = require('validator')
const productSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please Enter name"]
    },
    desc: {
        type: String,
        required: [true, "Please Enter Description"]
    },
    price: {
        type: Number,
        required: [true, "Please enter product price"],
        maxLength: [8, "Price cannot exceed 8 digits"]
    },
    ratings: {
        type: Number,
        default: 0
    },
    image: [{
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    }],
    category: {
        type: String,
        required: [true, "Please enter product category"]
    },
    stock: {
        type: Number,
        required: [true, "Please enter product stock"],
        maxLength: [3, "Stock cannot exceed 3 digits"],
        default: 1
    },
    numOfReviews: {
        type: Number,
        default: 0
    },
    reviews: [{
        avatar: {
            type: String,
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "user",
            required: true
        },
        name: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true
        },
        comment: {
            type: String,
            required: true
        }
    }],
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "user",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})
module.exports = mongoose.model("Product", productSchema);