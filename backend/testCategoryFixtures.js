const classify = require("./taxonomy/classify");
const categoryFixtures = require(
    "./data/generators/categoryFixtures"
);

let passed = 0;
let failed = 0;

for (const [expectedCategory, failure] of Object.entries(
    categoryFixtures
)) {
    const actualCategory = classify({
        failure
    });

    const pass = actualCategory === expectedCategory;

    if (pass) {
        passed++;
    } else {
        failed++;
    }

    console.log(
        expectedCategory,
        "→",
        actualCategory,
        pass ? "PASS" : "FAIL"
    );
}

console.log("\n--- Category Fixture Summary ---");
console.log("Total:", passed + failed);
console.log("Passed:", passed);
console.log("Failed:", failed);