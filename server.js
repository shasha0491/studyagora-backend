import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// ─────────────────────────────
// Middleware
// ─────────────────────────────
app.use(cors());
app.use(express.json());

// ─────────────────────────────
// Health Check
// ─────────────────────────────
app.get("/", (req, res) => {
  res.send("StudyAgora backend running 🚀");
});

// ─────────────────────────────
// Evaluate Answer (Groq)
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
          temperature: 0.4,
          max_tokens: 1000
        })
      }
    );

    // ❌ Groq HTTP error
    if (!response.ok) {
      const text = await response.text();
      console.error("Groq HTTP error:", text);
      return res.status(500).json({
        error: "Groq API failed"
      });
    }

    const data = await response.json();

    // 🔍 Debug once (remove later)
    console.log("GROQ RESPONSE:", JSON.stringify(data, null, 2));

    // ❌ Invalid AI response
    if (!data.choices || !data.choices.length) {
      console.error("Groq invalid response:", data);
      return res.status(500).json({
        error: "AI response invalid",
        details: data.error?.message || "No choices returned"
      });
    }

    // ✅ SUCCESS
    res.json({
      evaluation: data.choices[0].message.content
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Evaluation failed"
    });
  }
});

// ─────────────────────────────
// Server Start
// ─────────────────────────────
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
