const preCheck = (failedPayment, category) => {
    const { customer } = failedPayment;

    // Hard constraint: customer has opted out
    if (customer.optedOut === true) {
        return {
            blocked: true,
            reason: "customer_opted_out",
            action: "do_not_retry"
        };
    }

    // Retry-limit is intentionally NOT hard-blocked here. The agent is
    // still consulted even when the limit is already exceeded, so the
    // pipeline produces a real "AI proposed X" record before postCheck
    // enforces the limit as a genuine override -- rather than silently
    // never asking. postCheck.js enforces this as a hard rule regardless
    // of what the agent proposes.

    return {
        blocked: false
    };
};

module.exports = preCheck;