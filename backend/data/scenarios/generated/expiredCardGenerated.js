const createScenario = require("../../generators/createScenarios");

const expiredCardGenerated = createScenario({
    scenarioId: "gen_expired_card_first_attempt",

    description:
        "Generated scenario: expired card on the first payment attempt.",

    failure: {
        errorCode: "CARD_EXPIRED",
        errorSource: "bank",
        errorStep: "payment_authorization",
        errorReason: "card_expired",
        errorDescription: "The payment card has expired."
    },

    expectedOutcome: {
        recoverable: false,
        failureCategory: "expired_card",
        recommendedAction: "ask_customer_to_update_payment_method",
        retryAllowed: false
    }
});

module.exports = expiredCardGenerated;