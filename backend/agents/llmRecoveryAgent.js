require("dotenv").config();

const { validateProposal } = require("./proposalSchema");

const llmRecoveryAgent = async (failedPayment, failureCategory) => {
    const prompt = `
You are a revenue recovery proposal agent.

Your job is to analyze a failed payment and propose ONE recovery action.

You do NOT execute payments.
You do NOT override customer consent or system policy.
You only return a proposal.

Failure category:
${failureCategory}

Failed payment:
${JSON.stringify(failedPayment, null, 2)}

Return ONLY valid JSON in this exact format:

{
    "failureCategory": "string",
    "recoverable": true,
    "confidence": 0,
    "proposedAction": "string",
    "reasoning": "string"
}

Allowed proposedAction values:

- retry_same_method
- retry_after_delay
- try_alternative_method
- ask_customer_to_update_payment_method
- send_payment_link
- escalate
- do_not_retry
`;

    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
                model: "qwen/qwen3.6-27b",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0,
                max_tokens: 500,
                reasoning: {
                    effort: "none"
                }
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `OpenRouter request failed: ${JSON.stringify(data)}`
        );
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("LLM returned no proposal content.");
    }

    let proposal;

    try {
        proposal = JSON.parse(content);
    } catch {
        throw new Error(
            `LLM returned invalid JSON: ${content}`
        );
    }

    const validation = validateProposal(proposal);

    if (!validation.valid) {
        throw new Error(
            `Invalid LLM proposal: ${validation.errors.join(", ")}`
        );
    }

    return proposal;
};

module.exports = llmRecoveryAgent;