const dotenv = require('dotenv')
dotenv.config({ path: '../server/config.env' })
const express = require('express')
const { isAuthenticate } = require('../middleware/auth')
const router = express.Router()
router.route('/payment/process').post(isAuthenticate, processPayment)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
async function processPayment(req, res) {
    try {
        const myPayment = await stripe.paymentIntents.create({
            amount: req.body.amount,
            currency: "inr",
        })
        res.status(200).json({ success: true, client_secret: myPayment.client_secret })

    } catch (error) {}
}
router.route('/stripeapikey').get(isAuthenticate, sendStripeApiKey)
async function sendStripeApiKey(req, res) {
    try {
        res.status(200).json({ success: true, stripeApiKey: process.env.STRIPE_API_KEY });
    } catch (error) {

    }
}

module.exports = router;