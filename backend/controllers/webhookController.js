const crypto = require("crypto");
const store = require("../data/store/recoveryStore");

const handleRazorpayWebhook = (req, res) => {
    try {
        const signature = req.headers["x-razorpay-signature"];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!signature || !webhookSecret) {
            return res.status(400).json({
                error: "Webhook signature or webhook secret is missing"
            });
        }

        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(req.body)
            .digest("hex");

        const expectedBuffer = Buffer.from(expectedSignature);
        const receivedBuffer = Buffer.from(signature);

        if (
            expectedBuffer.length !== receivedBuffer.length ||
            !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
        ) {
            console.warn("Invalid Razorpay webhook signature");

            return res.status(400).json({
                error: "Invalid webhook signature"
            });
        }

        const event = JSON.parse(req.body.toString("utf8"));

        if (event.event !== "payment_link.paid") {
            return res.status(200).json({
                received: true,
                handled: false,
                event: event.event
            });
        }

        const paymentLink =
            event.payload?.payment_link?.entity;

        const payment =
            event.payload?.payment?.entity;

        if (!paymentLink?.id || !payment?.id) {
            return res.status(400).json({
                error: "Invalid payment_link.paid payload"
            });
        }

        const result = store.markPaymentLinkRecovered(
            paymentLink.id,
            paymentLink.reference_id,
            {
                razorpayPaymentId: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                method: payment.method,
                paidAt: new Date().toISOString()
            }
        );

        if (!result) {
            console.warn(
                `Received payment confirmation for unknown link ${paymentLink.id}`
            );

            return res.status(200).json({
                received: true,
                handled: false,
                reason: "No matching recovery execution"
            });
        }

        return res.status(200).json({
            received: true,
            handled: true,
            internalId: result.failedPayment.internalId,
            alreadyRecovered: result.alreadyRecovered
        });
    } catch (error) {
        console.error("Failed to process Razorpay webhook:", error);

        return res.status(500).json({
            error: "Failed to process webhook"
        });
    }
};

module.exports = {
    handleRazorpayWebhook
};