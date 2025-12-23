import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import admin from "firebase-admin";

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   FIREBASE ADMIN INIT
========================= */
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  )
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("StudyAgora backend running 🚀");
});

/* =========================
   AUTH VERIFY (CRITICAL)
========================= */
app.post("/auth/verify", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "Missing ID token" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    // ✅ user verified
    res.json({
      uid: decoded.uid,
      phone: decoded.phone_number,
      status: "authenticated"
    });

  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

/* =========================
   QUIZ (PROTECTED)
========================= */
app.post("/quiz", async (req, res) => {
  try {
    const { subject, difficulty, count } = req.body;

    const prompt = `
Generate ${count} UPSC Prelims MCQs.

Subject: ${subject}
Difficulty: ${difficulty}

Format:
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
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
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
    res.status(500).json({ error: "Quiz failed" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Backend running on", PORT);
});
