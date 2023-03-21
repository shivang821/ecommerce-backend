const express = require("express");
const { isAuthenticate, authorizeRole } = require("../middleware/auth");
const Product = require('../models/productModel');
const ApiFeatures = require("../utils/apiFeatures");
// const mongooseerror = require('mongoose-validation-error-message-handler');
const cloudinary = require('cloudinary')
const router = express.Router();
// admin route
router.route('/admin/products/new').post(isAuthenticate, authorizeRole, createProduct);
async function createProduct(req, res, next) {
    try {
        let images = []
        if (typeof req.body.images === "string") {
            images.push(req.body.images)
        } else {
            images = req.body.images
        }
        const imagesLinks = []
        for (let i = 0; i < images.length; i++) {
            const result = await cloudinary.v2.uploader.upload(images[i], { folder: "products" })
            imagesLinks.push({ public_id: result.public_id, url: result.secure_url })
        }
        req.body.image = imagesLinks;
        req.body.user = req.user._id;
        const product = await Product.create(req.body);
        res.status(200).json({ success: true, product })

    } catch (error) {
        let msg;
        Object.values(error.errors).forEach(val => {

            msg = val.properties.message
        });

        res.status(400).json({ message: "error", error: msg })
    }
}

router.route('/admin/products').get(isAuthenticate, authorizeRole, getAdminProducts)
async function getAdminProducts(req, res) {
    try {
        const products = await Product.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, products })
    } catch (error) {
        res.status(400).json({ success: false });
    }
}

router.route('/admin/products/:id').patch(isAuthenticate, authorizeRole, updateProduct).delete(isAuthenticate, authorizeRole, deleteProduct)
router.route('/products/:id').get(getProductDetails)
async function getProductDetails(req, res, next) {
    try {
        const _id = req.params.id;
        const product = await Product.findOne({ _id });
        if (!product) return res.status(400).json({ success: false, message: "product not found" })
        res.status(200).json({ success: true, product });
    } catch (error) {

    }
}

async function updateProduct(req, res, next) {
    try {
        const _id = req.params.id;

        const { oldImages, ...rest } = req.body
        let product = await Product.findById(_id)
            // removing product images that are removed by admin from fronted and stor in newImages 
        const newImages = product.image.filter((item) => {
                if (oldImages === undefined) {
                    return item;
                } else if (typeof oldImages === "string") {
                    return item.public_id !== oldImages
                } else {
                    const flag = oldImages.includes(item.public_id)
                    return !flag
                }
            })
            // removing useLess product images from cloudinary
        if (oldImages) {
            if (typeof oldImages === "string") {
                const result = await cloudinary.v2.uploader.destroy(oldImages)
            } else {
                oldImages.forEach(async(item) => {
                    const result = await cloudinary.v2.uploader.destroy(item)
                })
            }
        }
        // checking whether admin upload new image or not, if upload then upload it to cloudinary and pushed its reference into newImages   
        if (rest.image) {
            let images = []
            if (typeof rest.image === "string") {
                images.push(rest.image)
            } else {
                images = rest.image
            }
            for (let i = 0; i < images.length; i++) {
                const result = await cloudinary.v2.uploader.upload(images[i], { folder: "products" })
                newImages.push({ public_id: result.public_id, url: result.secure_url })
            }
        }
        // updating product data in database 
        rest.image = newImages
        product = await Product.findByIdAndUpdate(_id, rest, { new: true });
        if (!product) {
            return res.status(400).send('product not found')
        } else {
            res.status(200).json({ success: true, product })
        }
    } catch (error) {


    }
}
async function deleteProduct(req, res) {
    try {
        const _id = req.params.id;
        const product = await Product.findByIdAndDelete(_id);
        if (!product) {
            return res.status(400).json({ success: false, message: "product not found" })
        }
        for (let i = 0; i < product.image.length; i++) {
            const result = await cloudinary.v2.uploader.destroy(product.image[i].public_id)
        }

        res.status(200).json({ success: true, message: "product deleted successfully" });
    } catch (error) {

    }
}


// get all product
router.route('/products').get(getAllProduct);

async function getAllProduct(req, res, next) {
    try {
        // return res.status(400).json({ message: "this is sample error" })
        const resultPerPage = 8;
        const apiFeature = new ApiFeatures(Product.find(), req.query).search().filter()
        let productsWithoutPagination = await apiFeature.query
        let filteredProductsCount = productsWithoutPagination.length;

        const newapiFeature = new ApiFeatures(Product.find().sort({ createdAt: -1 }), req.query).search().filter().pagination(resultPerPage)
            // apiFeature.pagination(resultPerPage)
        const products = await newapiFeature.query;
        const productCounts = await Product.countDocuments();
        res.status(200).json({ success: true, products, productCounts, resultPerPage, filteredProductsCount })
    } catch (error) {

    }

}

// ******** Review Product ********
router.route('/review').post(isAuthenticate, reviewProduct)
async function reviewProduct(req, res) {
    try {
        const { comment, productId, rating } = req.body;
        const review = {
            user: req.user._id,
            comment,
            rating: Number(rating),
            name: req.user.name,
            avatar: req.user.avatar.url
        }
        const product = await Product.findById(productId)
        let isReviewed = false;
        product.reviews.forEach((rev) => {
            if (rev.user == req.user.id) isReviewed = true;
        });
        if (isReviewed) {
            product.reviews.forEach((rev) => {
                if (rev.user.toString() === req.user._id.toString()) {
                    rev.rating = rating;
                    rev.comment = comment;
                }
            })
        } else {
            product.reviews.push(review);
            product.numOfReviews = product.reviews.length
        }
        let rt = 0;
        product.reviews.forEach((rev) => {
            rt += rev.rating;
        })
        product.ratings = rt / product.numOfReviews;
        await product.save();
        res.status(200).json({ success: true, message: "product reviewed", product })

    } catch (error) {

    }
}

// get all product reviews

router.route('/reviews').get(getAllReviews).delete(isAuthenticate, deleteReview)

async function getAllReviews(req, res) {
    try {
        const product = await Product.findById(req.query.productId);
        if (!product) return res.status(404).json({ success: false, message: 'product not found' })
        const reviews = product.reviews;
        res.status(200).json({ success: true, reviews })
    } catch (error) {

    }
}
async function deleteReview(req, res) {
    try {
        const product = await Product.findById(req.query.productId);
        if (!product) return res.status(404).json({ success: false, message: 'product not found' })
        const reviews = product.reviews.filter((rev) => {
            return rev.user != req.user.id
        })
        let rt = 0;
        reviews.forEach((rev) => {
            rt += rev.rating;
        })
        const numOfReviews = reviews.length
        const ratings = rt / numOfReviews;
        await Product.findByIdAndUpdate(req.query.productId, { numOfReviews, ratings, reviews }, { new: true })
        res.status(200).json({ success: true, message: "review deleted" })


    } catch (error) {

    }
}

module.exports = router;