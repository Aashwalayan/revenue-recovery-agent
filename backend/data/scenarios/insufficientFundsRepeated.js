const insufficientFundsRepeatedScenario = {
    scenarioId: "syn_insufficient_funds_repeat",

    description:
        "Customer has insufficient funds and has already experienced multiple consecutive failures for the same reason.",

    failedPayment: {
        internalId: "fp_syn_insufficient_funds_repeat",
        source: "synthetic",

        payment: {
            razorpayPaymentId: null,
            razorpayOrderId: null,
            amount: 2500,
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
            customerId: "cust_syn_002",
            email: "customer@example.com",
            contact: "+910000000001",
            priorSuccessfulPayments: 2,
            lifetimeValue: 5000,
            isSubscriber: false,
            optedOut: false
        },

        attemptContext: {
            attemptNumber: 3,

            firstFailureAt: "2026-08-18T10:00:00Z",
            lastAttemptAt: "2026-08-20T10:00:00Z",

            priorAttempts: [
                {
                    timestamp: "2026-08-18T10:00:00Z",
                    outcome: "failed",
                    method: "card",
                    failureReason: "insufficient_funds"
                },
                {
                    timestamp: "2026-08-19T10:00:00Z",
                    outcome: "failed",
                    method: "card",
                    failureReason: "insufficient_funds"
                }
            ]
        },

        timestamps: {
            detectedAt: "2026-08-20T10:00:05Z",
            createdAt: "2026-08-20T10:00:00Z"
        }
    },

    expectedOutcome: {
        recoverable: true,
        failureCategory: "insufficient_funds",
        recommendedAction: "escalate",
        retryAllowed: false
    }
};

module.exports = insufficientFundsRepeatedScenario;