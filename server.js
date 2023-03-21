const app = require('./app')
const dotenv = require('dotenv')
const cloudinary = require('cloudinary')
const PORT = process.env.PORT || 4000
    // handling uncaught Exception

process.on("uncaughtException", err => {
    process.exit(1);
})

// cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
})




const server = app.listen(PORT, () => {})
    // unhandled promise rejection
process.on("unhandledRejection", err => {
    server.close(() => {
        process.exit(1);
    })
})