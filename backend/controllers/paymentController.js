const razorpay = require("../config/razorpay");

const getPayments = async (req, res) => {
    try {
        const payments = await razorpay.payments.all({
            count: 10
        });

        console.log(JSON.stringify(payments.items, null, 2));

        res.json(payments);
    } catch (error) {
        console.error("Razorpay error:", error);

        res.status(500).json({
            error: "Failed to fetch Razorpay payments"
        });
    }
};

module.exports = {
    getPayments
};