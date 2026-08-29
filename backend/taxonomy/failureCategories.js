const failureCategories = {
    card_declined_generic: {
        description: "Bank declined the card transaction without a specific reason.",
        defaultRecoverable: true,
        defaultAction: "retry_after_delay",
        retryPolicy: {
            maxAttempts: 2,
            delayHours: 12
        },
        priority: "medium"
    },

    insufficient_funds: {
        description: "The customer's account does not have sufficient funds.",
        defaultRecoverable: true,
        defaultAction: "retry_after_delay",
        retryPolicy: {
            maxAttempts: 2,
            delayHours: 24
        },
        priority: "medium"
    },

    expired_card: {
        description: "The payment card has expired.",
        defaultRecoverable: false,
        defaultAction: "ask_customer_to_update_payment_method",
        retryPolicy: {
            maxAttempts: null
        },
        priority: "high"
    },

    authentication_3ds_failure: {
        description: "Card authentication or 3D Secure authentication failed.",
        defaultRecoverable: true,
        defaultAction: "try_alternative_method",
        retryPolicy: {
            maxAttempts: 1,
            delayHours: 1
        },
        priority: "medium"
    },

    bank_unavailable: {
        description: "The bank or payment gateway is temporarily unavailable.",
        defaultRecoverable: true,
        defaultAction: "retry_same_method",
        retryPolicy: {
            maxAttempts: 3,
            delayHours: 2
        },
        priority: "high"
    },

    upi_timeout: {
        description: "The UPI transaction timed out before completion.",
        defaultRecoverable: true,
        defaultAction: "retry_same_method",
        retryPolicy: {
            maxAttempts: 2,
            delayHours: 1
        },
        priority: "medium"
    },

    transaction_limit_exceeded: {
        description: "The transaction exceeded a payment method or bank limit.",
        defaultRecoverable: true,
        defaultAction: "try_alternative_method",
        retryPolicy: {
            maxAttempts: null
        },
        priority: "medium"
    },

    repeated_failure_same_reason: {
        description: "The payment has failed repeatedly for the same reason.",
        defaultRecoverable: false,
        defaultAction: "escalate",
        retryPolicy: {
            maxAttempts: null
        },
        priority: "high"
    },

    uncategorized: {
        description: "The failure could not be confidently classified.",
        defaultRecoverable: false,
        defaultAction: "escalate",
        retryPolicy: {
            maxAttempts: 0
        },
        priority: "medium"
    }
};

module.exports = failureCategories;