const createScenario = require("./createScenarios");
const categoryFixtures = require("./categoryFixtures");

const generateOptOutScenarios = () => {
    return [
        createScenario({
            scenarioId:
                "syn_generated_opted_out_attempt_limit_card_declined_generic",
            description:
                "Generated: customer opted out and retry limit is also exceeded; opt-out must take precedence.",
            failure: categoryFixtures.card_declined_generic,
            customer: {
                optedOut: true
            },
            attemptContext: {
                attemptNumber: 3
            },
            expectedOutcome: {
                recommendedAction: "do_not_retry"
            }
        })
    ];
};

module.exports = generateOptOutScenarios;
