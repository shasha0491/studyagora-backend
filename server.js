import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("StudyAgora backend running 🚀");
});

// ✅ DIRECT POST ROUTE (NO ROUTER FILE)
app.post("/evaluate", async (req, res) => {
  try {
    const { paper, subject, marks, question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const prompt = `
You are a strict UPSC examiner.

Paper: ${paper}
Subject: ${subject}
Marks: ${marks}

Question:
${question}

Answer:
${answer}

Evaluate strictly and give feedback + marks.
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
