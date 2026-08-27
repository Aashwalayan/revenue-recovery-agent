const insufficientFundsSingleScenario = {
    scenarioId: "syn_insufficient_funds_single",

    description:
        "Customer has insufficient funds but has only experienced one failed attempt.",

    failedPayment: {
        internalId: "fp_syn_insufficient_funds_single",
        source: "synthetic",

        payment: {
            razorpayPaymentId: null,
            razorpayOrderId: null,
            amount: 2000,
            currency: "INR",
            method: "card",
            status: "failed"
        },

        failure: {
            errorCode: "INSUFFICIENT_FUNDS",
            errorSource: "bank",
            errorStep: "payment_authorization",
            errorReason: "insufficient_funds",
            errorDescription: "The customer's account has insufficient funds.",
            normalizedCategory: null
        },

        customer: {
            customerId: "cust_syn_004",
            email: "customer@example.com",
            contact: "+910000000003",
            priorSuccessfulPayments: 3,
            lifetimeValue: 6000,
            isSubscriber: false,
            optedOut: false
        },

        attemptContext: {
            attemptNumber: 1,
            firstFailureAt: "2026-08-20T10:00:00Z",
            lastAttemptAt: "2026-08-20T10:00:00Z",
            priorAttempts: []
        },

        timestamps: {
            detectedAt: "2026-08-20T10:00:05Z",
            createdAt: "2026-08-20T10:00:00Z"
        }
    },

    expectedOutcome: {
        recoverable: true,
        failureCategory: "insufficient_funds",
        recommendedAction: "retry_after_delay",
        retryAllowed: true
    }
};

module.exports = insufficientFundsSingleScenario;