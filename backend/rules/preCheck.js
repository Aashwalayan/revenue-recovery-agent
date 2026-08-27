const preCheck = (failedPayment, category) => {
    const { customer, attemptContext } = failedPayment;

    // Hard constraint: customer has opted out
    if (customer.optedOut === true) {
        return {
            blocked: true,
            reason: "customer_opted_out",
            action: "do_not_retry"
        };
    }

    // Hard constraint: maximum retry attempts reached
    const maxAttempts = getMaxAttempts(category);

    if (
        maxAttempts !== null &&
        attemptContext.attemptNumber > maxAttempts
    ) {
        return {
            blocked: true,
            reason: "retry_limit_reached",
            action: "do_not_retry"
        };
    }

    return {
        blocked: false
    };
};

const getMaxAttempts = (category) => {
    const retryLimits = {
        card_declined_generic: 2,
        insufficient_funds: 2,
        expired_card: 0,
        authentication_3ds_failure: 1,
        bank_unavailable: 3,
        upi_timeout: 2,
        transaction_limit_exceeded: 0,
        repeated_failure_same_reason: 0,
        uncategorized: 0
    };

    return Object.prototype.hasOwnProperty.call(retryLimits, category)
        ? retryLimits[category]
        : null;
};

module.exports = preCheck;