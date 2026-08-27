const expiredCardScenario = {
    scenarioId: "syn_expired_card",

    description:
        "Customer's card has expired and cannot be used for another payment attempt.",

    failedPayment: {
        internalId: "fp_syn_expired_card",
        source: "synthetic",

        payment: {
            razorpayPaymentId: null,
            razorpayOrderId: null,
            amount: 1500,
            currency: "INR",
            method: "card",
            status: "failed"
        },

        failure: {
            errorCode: "CARD_EXPIRED",
            errorSource: "bank",
            errorStep: "payment_authorization",
            errorReason: "card_expired",
            errorDescription: "The payment card has expired.",
            normalizedCategory: null
        },

        customer: {
            customerId: "cust_syn_001",
            email: "customer@example.com",
            contact: "+910000000000",
            priorSuccessfulPayments: 4,
            lifetimeValue: 6000,
            isSubscriber: false,
            optedOut: false
        },

        attemptContext: {
            attemptNumber: 1,
            firstFailureAt: "2026-08-20T10:15:00Z",
            lastAttemptAt: "2026-08-20T10:15:00Z",
            priorAttempts: []
        },

        timestamps: {
            detectedAt: "2026-08-20T10:15:05Z",
            createdAt: "2026-08-20T10:15:00Z"
        }
    },

    expectedOutcome: {
        recoverable: false,
        failureCategory: "expired_card",
        recommendedAction: "ask_customer_to_update_payment_method",
        retryAllowed: false
    }
};

module.exports = expiredCardScenario;