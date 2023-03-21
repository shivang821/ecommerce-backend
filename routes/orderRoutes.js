const express = require('express')
const { isAuthenticate, authorizeRole } = require('../middleware/auth')

const router = express.Router()
const Order = require('../models/orderSchema')
const Product = require('../models/productModel')
const { route } = require('./userRoutes')

router.route('/order/new').post(isAuthenticate, createNewOrder)

async function createNewOrder(req, res) {
    try {
        const { shippingInfo, orderItems, paymentInfo, itemsPrice, taxPrice, shippingPrice, totalPrice } = req.body
        const order = await Order.create({ shippingInfo, orderItems, paymentInfo, itemsPrice, taxPrice, shippingPrice, totalPrice, paidAt: Date.now(), user: req.user.id })

        orderItems.forEach(async(item) => {
            const _id = item.product;
            const prd = await Product.findByIdAndUpdate(_id, { stock: item.stock - item.quantity }, { new: true })

        })
        res.status(200).json({ success: true, order })
    } catch (error) {

    }
}

router.route('/order/:id').get(isAuthenticate, getSingleOrder)

async function getSingleOrder(req, res) {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');
        if (!order) return res.status(404).json({ message: 'order not found with this id' })
        res.status(200).json({ success: true, order })
    } catch (error) {

    }
}
router.route('/orders/me').get(isAuthenticate, myOrders)
async function myOrders(req, res) {
    try {
        const orders = await Order.find({ user: req.user.id });
        res.status(200).json({ success: true, orders })
    } catch (error) {

    }
}

// get All orders ----(Admin) **********************************

router.route('/admin/orders').get(isAuthenticate, authorizeRole, getAllOrders)
async function getAllOrders(req, res) {
    try {

        let orders = await Order.find();
        orders = orders.filter((order) => {
            let flag = false;
            let itemsPrice = 0;
            order.orderItems = order.orderItems.filter((item) => {
                if (item.seller.equals(req.user._id)) {
                    itemsPrice += item.price;
                    flag = true;
                }
                return item.seller.equals(req.user._id)
            })
            if (flag) {
                order.itemsPrice = itemsPrice;
                order.taxPrice = (itemsPrice * 18 / 100)
                order.totalPrice = order.itemsPrice + order.taxPrice + order.shippingPrice;
            }
            return flag;
        })
        let totalAmount = 0;
        orders.forEach((order) => {
            totalAmount += order.totalPrice;
        })
        res.status(200).json({ success: true, totalAmount, orders })

    } catch (error) {

    }
}
// updateOrder status --(admin)
router.route('/admin/order/:id').patch(isAuthenticate, authorizeRole, updateOrder).delete(isAuthenticate, authorizeRole, deleteOrder).get(isAuthenticate, authorizeRole, getAdminOrderDetails)
async function getAdminOrderDetails(req, res) {
    try {
        const _id = req.params.id
        const order = await Order.find({ _id })
        if (order) {
            res.status(200).json({ success: true, order })
        }
    } catch (error) {
        res.status(400).json({ success: false, error: "order not found with this id" })
    }
}
async function updateOrder(req, res) {
    try {

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'order not found with this id' })
        if (order.orderStatus == "Delivered") {
            res.status(400).json({ success: false, message: "you have already delivered this order" })
        }
        order.orderStatus = req.body.status;
        if (req.body.status == "Delivered") {
            order.deliveredAt = Date.now()
        }
        await order.save({ validateBeforeSave: false })
        res.status(200).json({ success: true })

    } catch (error) {

    }
}


async function deleteOrder(req, res) {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'order not found with this id' })
        await order.remove()
        res.status(200).json({ success: true })
    } catch (error) {

    }
}

module.exports = router;