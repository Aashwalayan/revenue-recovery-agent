const failureCategories = require("../taxonomy/failureCategories");

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
            action: "escalate"
        };
    }

    return {
        blocked: false
    };
};

const getMaxAttempts = (category) => {
    return Object.prototype.hasOwnProperty.call(failureCategories, category)
        ? failureCategories[category].retryPolicy.maxAttempts
        : null;
};

module.exports = preCheck;