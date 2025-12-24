import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";

/* =========================
   APP INIT
========================= */
const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   RATE LIMITERS
========================= */

// Expensive endpoint (AI evaluation)
const evaluatorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                 // 10 evaluations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Evaluation limit reached. Please try again later."
  }
});

// Quiz generation (moderate cost)
const quizLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,                 // 30 quizzes per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Quiz limit reached. Please try again later."
  }
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("StudyAgora backend running 🚀 (No Auth Mode)");
});

/* =========================
   QUIZ GENERATOR
========================= */
app.post("/quiz", quizLimiter, async (req, res) => {
  try {
    const { subject, difficulty, count } = req.body;

    if (!subject || !count) {
      return res.status(400).json({ error: "Missing quiz parameters" });
    }

    const prompt = `
Generate ${count} UPSC Prelims MCQs.

Subject: ${subject}
Difficulty: ${difficulty || "moderate"}

Format strictly as:
Q1. Question
A) Option
B) Option
C) Option
D) Option
Correct Answer: A
Explanation: Short explanation
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": \`Bearer \${process.env.GROQ_API_KEY}\`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6
        })
      }
    );

    const data = await response.json();
    res.json({ quiz: data.choices[0].message.content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Quiz generation failed" });
  }
});

/* =========================
   UPSC ANSWER EVALUATOR
========================= */
app.post("/evaluate", evaluatorLimiter, async (req, res) => {
  try {
    const {
      paper,
      optional,
      marks,
      language,
      question,
      answer
    } = req.body;

    if (!question || !answer || !marks) {
      return res.status(400).json({ error: "Missing evaluation input" });
    }

    const prompt = `
You are a UPSC Mains examiner.

Evaluate the answer strictly as per UPSC standards.
Be neutral, critical, and concise. Do NOT motivate.

Paper: ${paper}
Optional Subject: ${optional || "N/A"}
Marks: ${marks}
Language: ${language}

QUESTION:
${question}

ANSWER:
${answer}

Evaluate on:
1. Structure (intro, body, conclusion)
2. Content depth & relevance
3. Use of examples / thinkers / case laws
4. Language & clarity

Return STRICT JSON ONLY in this format:
{
  "structure": { "score": number, "feedback": "string" },
  "content": { "score": number, "feedback": "string" },
  "examples": { "score": number, "feedback": "string" },
  "language": { "score": number, "feedback": "string" },
  "overall": { "score": number, "remark": "string" },
  "mentor": "one crisp improvement advice"
}
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": \`Bearer \${process.env.GROQ_API_KEY}\`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      }
    );

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content;

    if (!rawText) {
      return res.status(500).json({ error: "Empty AI response" });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      console.error("AI JSON parse error:", rawText);
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("StudyAgora backend running on port", PORT);
});
