const dotenv = require('dotenv')
const express = require('express');
const userRoute = require('./routes/userRoutes')
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload')
const paymentRoute = require('./routes/PaymentRoute')
const path = require('path')
dotenv.config({ path: './config.env' })
require('./database/conn')
const app = express();
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
app.use(fileUpload())
app.use(express.json({ limit: '50mb' }));
const cookieParser = require('cookie-parser')
app.use(cookieParser());
const productRoute = require('./routes/productRoutes');
const orderRoute = require('./routes/orderRoutes')
app.use(productRoute);
app.use(userRoute)
app.use(orderRoute)
app.use(paymentRoute)
app.use(express.static(path.join(__dirname, './frontend/build')))
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, './frontend/build/index.html'))
})
module.exports = app