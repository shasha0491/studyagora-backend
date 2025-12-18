import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(cors());
app.use(express.json());

// --------------------
// Health Check
// --------------------
app.get("/", (req, res) => {
  res.send("StudyAgora backend running 🚀");
});

// --------------------
// Helper: Groq Call (SAFE)
// --------------------
async function callGroq(prompt, maxTokens = 1200, temperature = 0.6) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens
      })
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text);
  }

  const data = JSON.parse(text);

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error("Invalid Groq response: " + text);
  }

  return data.choices[0].message.content;
}

// --------------------
// QUIZ GENERATOR
// --------------------
app.post("/quiz", async (req, res) => {
  try {
    console.log("QUIZ BODY:", req.body);

    const { subject, difficulty, count } = req.body;

    if (!subject || !difficulty || !count) {
      return res.status(400).json({
        error: "Missing fields",
        received: req.body
      });
    }

    const prompt = `
Generate ${count} UPSC Prelims MCQs.

Subject: ${subject}
Difficulty: ${difficulty}

Strict format:

Q1. Question
A) Option
B) Option
C) Option
D) Option
Correct Answer: A
Explanation: Short explanation
`;

    const quiz = await callGroq(prompt);
    res.json({ quiz });

  } catch (err) {
    console.error("QUIZ ERROR FULL:", err.message);

    res.status(500).json({
      error: "Quiz generation failed",
      details: err.message
    });
  }
});

// --------------------
// Server Start
// --------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
