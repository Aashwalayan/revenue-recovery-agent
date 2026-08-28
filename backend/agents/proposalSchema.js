const failureCategories = require("../taxonomy/failureCategories");

const allowedActions = [
    "retry_same_method",
    "retry_after_delay",
    "try_alternative_method",
    "ask_customer_to_update_payment_method",
    "send_payment_link",
    "escalate",
    "do_not_retry"
];

const validateProposal = (proposal) => {
    if (!proposal || typeof proposal !== "object") {
        return {
            valid: false,
            errors: ["Proposal must be an object."]
        };
    }

    const errors = [];

    if (
        typeof proposal.failureCategory !== "string" ||
        !failureCategories[proposal.failureCategory]
    ) {
        errors.push("Invalid failureCategory.");
    }

    if (typeof proposal.recoverable !== "boolean") {
        errors.push("recoverable must be a boolean.");
    }

    if (
        typeof proposal.confidence !== "number" ||
        proposal.confidence < 0 ||
        proposal.confidence > 1
    ) {
        errors.push("confidence must be a number between 0 and 1.");
    }

    if (
        typeof proposal.proposedAction !== "string" ||
        !allowedActions.includes(proposal.proposedAction)
    ) {
        errors.push("Invalid proposedAction.");
    }

    if (typeof proposal.reasoning !== "string") {
        errors.push("reasoning must be a string.");
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

module.exports = validateProposal;