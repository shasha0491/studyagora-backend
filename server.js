import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(cors());
app.use(express.json());

// ─────────────────────────────
// Health Check
// ─────────────────────────────
app.get("/", (req, res) => {
  res.send("StudyAgora backend running 🚀");
});

// ─────────────────────────────
// Helper: Safe Groq Call
// ─────────────────────────────
async function callGroq(prompt, maxTokens = 1000, temperature = 0.5) {
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error("Groq HTTP error: " + text);
  }

  const data = await response.json();

  // 🔐 SAFETY CHECK
  if (!data.choices || !Array.isArray(data.choices) || !data.choices[0]) {
    throw new Error("Invalid Groq response: " + JSON.stringify(data));
  }

  return data.choices[0].message?.content || "No content generated.";
}

// ─────────────────────────────
// Answer Evaluator
// ─────────────────────────────
app.post("/evaluate", async (req, res) => {
  try {
    const { paper, subject, marks, question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const prompt = `
You are a strict UPSC examiner.

Paper: ${paper || "N/A"}
Subject: ${subject || "N/A"}
Marks: ${marks || "N/A"}

Question:
${question}

Answer:
${answer}

Evaluate strictly and give feedback with marks.
`;

    const evaluation = await callGroq(prompt, 1000, 0.4);
    res.json({ evaluation });

  } catch (err) {
    console.error("EVALUATE ERROR:", err.message);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

// ─────────────────────────────
// Quiz Generator
// ─────────────────────────────
app.post("/quiz", async (req, res) => {
  try {
    const { subject, difficulty, count } = req.body;

    if (!subject || !difficulty || !count) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const prompt = `
Generate ${count} UPSC Prelims MCQs.

Subject: ${subject}
Difficulty: ${difficulty}

Format strictly:

Q1. Question
A) Option
B) Option
C) Option
D) Option
Correct Answer: A
Explanation: Short explanation
`;

    const quiz = await callGroq(prompt, 1200, 0.6);
    res.json({ quiz });

  } catch (err) {
    console.error("QUIZ ERROR:", err.message);
    res.status(500).json({ error: "Quiz generation failed" });
  }
});

// ─────────────────────────────
// Server Start
// ─────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
