const createScenario = require("./createScenarios");
const failureCategories = require("../../taxonomy/failureCategories");
const categoryFixtures = require("./categoryFixtures");

const generateAttemptLimitScenarios = () => {
    const scenarios = [];

    for (const [category, definition] of Object.entries(failureCategories)) {
        const maxAttempts = definition.retryPolicy.maxAttempts;

        if (maxAttempts === null || maxAttempts === undefined) {
            continue;
        }

        const fixture = categoryFixtures[category];

        if (!fixture) {
            continue;
        }

        scenarios.push(
            createScenario({
                scenarioId: `syn_generated_attempt_limit_${category}`,
                description:
                    `Generated: ${category} at attemptNumber ${maxAttempts + 1}, ` +
                    `one past its configured limit of ${maxAttempts}.`,
                failure: fixture,
                attemptContext: {
                    attemptNumber: maxAttempts + 1
                },
                expectedOutcome: {
                    recommendedAction: "escalate"
                }
            })
        );
    }

    return scenarios;
};

module.exports = generateAttemptLimitScenarios;