

const categoryFixtures = {
    card_declined_generic: {
        errorCode: "CARD_DECLINED",
        errorSource: "gateway",
        errorStep: "payment_authorization",
        errorReason: "card_declined",
        errorDescription: "The card was declined by the issuing bank."
    },

    insufficient_funds: {
        errorCode: "INSUFFICIENT_FUNDS",
        errorSource: "bank",
        errorStep: "payment_authorization",
        errorReason: "insufficient_funds",
        errorDescription: "The account does not have sufficient funds."
    },

    expired_card: {
        errorCode: "CARD_EXPIRED",
        errorSource: "bank",
        errorStep: "payment_authorization",
        errorReason: "card_expired",
        errorDescription: "The payment card has expired."
    },

    authentication_3ds_failure: {
        errorCode: "AUTH_FAILED",
        errorSource: "gateway",
        errorStep: "authentication",
        errorReason: "authentication_failed",
        errorDescription: "3D Secure authentication failed."
    },

    bank_unavailable: {
        errorCode: "BANK_UNAVAILABLE",
        errorSource: "bank_unavailable",
        errorStep: "payment_authorization",
        errorReason: "bank_unavailable",
        errorDescription: "The bank's servers were unavailable."
    },

    upi_timeout: {
        errorCode: "UPI_TIMEOUT",
        errorSource: "gateway",
        errorStep: "payment_authorization",
        errorReason: "upi_timeout",
        errorDescription: "The UPI transaction timed out."
    },

    transaction_limit_exceeded: {
        errorCode: "TRANSACTION_LIMIT_EXCEEDED",
        errorSource: "bank",
        errorStep: "payment_authorization",
        errorReason: "transaction_limit_exceeded",
        errorDescription: "The transaction exceeded a payment limit."
    },

    uncategorized: {
        errorCode: "UNKNOWN_ERROR",
        errorSource: "gateway",
        errorStep: "payment_authorization",
        errorReason: "unspecified_failure",
        errorDescription: "The failure reason could not be determined."
    }
};

module.exports = categoryFixtures;