require("dotenv").config();

async function testOpenRouter() {
    try {
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
                            content: "Reply with exactly: Qwen connection successful"
                        }
                    ],
                    temperature: 0,
                    max_tokens: 100,
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

        console.log(data.choices[0].message.content);
    } catch (error) {
        console.error("Qwen connection failed:", error.message);
    }
}

testOpenRouter();