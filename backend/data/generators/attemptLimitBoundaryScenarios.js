const createScenario = require("./createScenarios");
const failureCategories = require("../../taxonomy/failureCategories");
const categoryFixtures = require("./categoryFixtures");

const generateAttemptLimitBoundaryScenarios = () => {
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
            scenarioId:
                `syn_generated_attempt_limit_boundary_${category}`,
            description:
                `Generated: ${category} at exactly its configured limit ` +
                `of ${maxAttempts}.`,
            failure: fixture,
            attemptContext: {
                attemptNumber: maxAttempts
            },
            expectedOutcome: {
                failureCategory: category,
                actionOverridden: false
            }
        })
    );
}

return scenarios;


};

module.exports = generateAttemptLimitBoundaryScenarios;
