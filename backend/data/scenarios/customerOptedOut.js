const customerOptedOutScenario = {
    scenarioId: "syn_customer_opted_out",

    description:
        "Customer has explicitly opted out of recovery communication and automated payment retries.",

    failedPayment: {
        internalId: "fp_syn_customer_opted_out",
        source: "synthetic",

        payment: {
            razorpayPaymentId: null,
            razorpayOrderId: null,
            amount: 1000,
            currency: "INR",
            method: "card",
            status: "failed"
        },

        failure: {
            errorCode: "CARD_DECLINED",
            errorSource: "bank",
            errorStep: "payment_authorization",
            errorReason: "card_declined",
            errorDescription: "The card was declined.",
            normalizedCategory: null
        },

        customer: {
            customerId: "cust_syn_003",
            email: "customer@example.com",
            contact: "+910000000002",
            priorSuccessfulPayments: 5,
            lifetimeValue: 7500,
            isSubscriber: true,
            optedOut: true
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
        failureCategory: "card_declined_generic",
        recommendedAction: "do_not_retry",
        retryAllowed: false
    }
};

module.exports = customerOptedOutScenario;