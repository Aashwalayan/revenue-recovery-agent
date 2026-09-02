
const classify = (failedPayment) => {
    const { errorCode, errorReason, errorSource, errorStep } =
        failedPayment.failure;

    const { attemptNumber, priorAttempts } =
        failedPayment.attemptContext;

    // If this is not the first attempt and the same failure reason
    // has already occurred for this Razorpay order, escalate.
    if (
        attemptNumber > 1 &&
        priorAttempts.some(
            (attempt) => attempt.errorReason === errorReason
        )
    ) {
        return "repeated_failure_same_reason";
    }

    // Insufficient funds
    if (
        errorReason === "insufficient_fund" ||
        errorReason === "insufficient_funds" ||
        errorCode === "INSUFFICIENT_FUNDS"
    ) {
        return "insufficient_funds";
    }

    // Expired card
    if (
        errorReason === "card_expired" ||
        errorCode === "CARD_EXPIRED"
    ) {
        return "expired_card";
    }

    // Authentication failure
    if (
        errorReason === "authentication_failed" ||
        errorStep === "authentication"
    ) {
        return "authentication_3ds_failure";
    }

    // Generic payment authorization failure from bank/issuer
    if (
        errorReason === "payment_failed" &&
        (errorSource === "bank" || errorSource === "issuer")
    ) {
        return "bank_unavailable";
    }

    // Bank unavailable
    if (
        errorReason === "bank_unavailable" ||
        errorSource === "bank_unavailable" ||
        errorReason === "gateway_technical_error"
    ) {
        return "bank_unavailable";
    }

    // Timeout
    if (
        errorReason === "upi_timeout" ||
        errorReason === "payment_timed_out" ||
        errorCode === "UPI_TIMEOUT"
    ) {
        return "upi_timeout";
    }

    // Transaction limit
    if (
        errorReason === "transaction_limit_exceeded" ||
        errorCode === "TRANSACTION_LIMIT_EXCEEDED"
    ) {
        return "transaction_limit_exceeded";
    }

    // Generic card decline
    if (
        errorReason === "card_declined" ||
        errorCode === "CARD_DECLINED"
    ) {
        return "card_declined_generic";
    }

    return "uncategorized";
};

module.exports = classify;