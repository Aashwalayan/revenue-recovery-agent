const createScenario = ({
    scenarioId,
    description,
    failure,
    customer = {},
    attemptContext = {},
    expectedOutcome
}) => {
    return {
        scenarioId,

        description,

        failedPayment: {
            internalId: `fp_${scenarioId}`,
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
                errorCode: failure.errorCode,
                errorSource: failure.errorSource,
                errorStep: failure.errorStep,
                errorReason: failure.errorReason,
                errorDescription: failure.errorDescription,
                normalizedCategory: null
            },

            customer: {
                customerId: "cust_generated",
                email: "customer@example.com",
                contact: "+910000000000",
                priorSuccessfulPayments: 4,
                lifetimeValue: 6000,
                isSubscriber: false,
                optedOut: false,
                ...customer
            },

            attemptContext: {
                attemptNumber: 1,
                firstFailureAt: "2026-08-20T10:15:00Z",
                lastAttemptAt: "2026-08-20T10:15:00Z",
                priorAttempts: [],
                ...attemptContext
            },

            timestamps: {
                detectedAt: "2026-08-20T10:15:05Z",
                createdAt: "2026-08-20T10:15:00Z"
            }
        },

        expectedOutcome
    };
};

module.exports = createScenario;