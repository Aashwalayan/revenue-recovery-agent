const normalizePayment = (payment) => {
    return {
        internalId: `fp_${payment.id}`,

        source: "razorpay_test",

        payment: {
            razorpayPaymentId: payment.id,
            razorpayOrderId: payment.order_id,
            amount: payment.amount / 100,
            currency: payment.currency,
            method: payment.method,
            status: payment.status
        },

        failure: {
            errorCode: payment.error_code,
            errorSource: payment.error_source,
            errorStep: payment.error_step,
            errorReason: payment.error_reason,
            errorDescription: payment.error_description,
            normalizedCategory: null
        },

        customer: {
            customerId: null,
            email: payment.email,
            contact: payment.contact,
            priorSuccessfulPayments: 0,
            lifetimeValue: 0,
            isSubscriber: false
        },

        attemptContext: {
            attemptNumber: 1,
            firstFailureAt: new Date(payment.created_at * 1000).toISOString(),
            lastAttemptAt: new Date(payment.created_at * 1000).toISOString(),
            priorAttempts: []
        },

        timestamps: {
            detectedAt: new Date().toISOString(),
            createdAt: new Date(payment.created_at * 1000).toISOString()
        }
    };
};

module.exports = normalizePayment;