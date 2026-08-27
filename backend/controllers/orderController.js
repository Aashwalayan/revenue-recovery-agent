const razorpay = require("../config/razorpay");

const createOrder = async (req, res) => {
    try {
        const { amount, currency = "INR" } = req.body;

        const order = await razorpay.orders.create({
            amount,
            currency,
            receipt: `receipt_${Date.now()}`
        });

        res.status(201).json({
            ...order,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Razorpay order error:", error);

        res.status(500).json({
            error: "Failed to create Razorpay order"
        });
    }
};

module.exports = {
    createOrder
};