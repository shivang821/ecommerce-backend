const validationError = (error, res) => {
    let msg;
    Object.values(error.errors).forEach(val => {
        msg = val.properties.message
    });
    return res.status(400).json({ message: "error", msg })
}
module.exports = validationError