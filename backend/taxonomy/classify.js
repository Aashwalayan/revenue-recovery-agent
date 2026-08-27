const failureCategories = require("./failureCategories");

const classify = (failedPayment) => {
    const { errorCode, errorReason, errorSource, errorStep } =
        failedPayment.failure;

    if (
        errorReason === "insufficient_funds" ||
        errorCode === "INSUFFICIENT_FUNDS"
    ) {
        return "insufficient_funds";
    }

    if (
        errorReason === "card_expired" ||
        errorCode === "CARD_EXPIRED"
    ) {
        return "expired_card";
    }

    if (
        errorReason === "authentication_failed" ||
        errorStep === "authentication"
    ) {
        return "authentication_3ds_failure";
    }

    if (
        errorReason === "bank_unavailable" ||
        errorSource === "bank_unavailable"
    ) {
        return "bank_unavailable";
    }

    if (
        errorReason === "upi_timeout" ||
        errorCode === "UPI_TIMEOUT"
    ) {
        return "upi_timeout";
    }

    if (
        errorReason === "transaction_limit_exceeded" ||
        errorCode === "TRANSACTION_LIMIT_EXCEEDED"
    ) {
        return "transaction_limit_exceeded";
    }

    if (
        errorReason === "card_declined" ||
        errorCode === "CARD_DECLINED"
    ) {
        return "card_declined_generic";
    }

    return "uncategorized";
};

module.exports = classify;