const createScenario = require("./createScenarios");
const categoryFixtures = require("./categoryFixtures");

const generateClassificationScenarios = () => {
return [
createScenario({
scenarioId: "syn_generated_classification_expired_card",
description:
"Generated: expired card at a normal attempt count; assert deterministic classification without asserting an LLM action.",
failure: categoryFixtures.expired_card,
expectedOutcome: {
failureCategory: "expired_card"
}
}),

    createScenario({
        scenarioId:
            "syn_generated_classification_transaction_limit_exceeded",
        description:
            "Generated: transaction limit exceeded at a normal attempt count; assert deterministic classification without asserting an LLM action.",
        failure: categoryFixtures.transaction_limit_exceeded,
        expectedOutcome: {
            failureCategory: "transaction_limit_exceeded"
        }
    })
];

};

module.exports = generateClassificationScenarios;
