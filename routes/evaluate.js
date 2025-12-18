import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { paper, subject, marks, question, answer } = req.body;

        if (!question || !answer || !marks) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const prompt = `
You are a strict UPSC examiner.

Paper: ${paper}
Subject: ${subject || "General Studies"}
Marks: ${marks}

Question:
${question}

Answer:
${answer}

Evaluate strictly and give:
- Structure feedback
- Content relevance
- Ethics / philosophy / psychology depth
- Presentation
- Final marks out of ${marks}
`;

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + process.env.GROQ_API_KEY
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.4,
                    max_tokens: 1000
                })
            }
        );

        const data = await response.json();

        res.json({
            evaluation: data.choices[0].message.content
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Evaluation failed" });
    }
});

export default router;
