import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ===============================
   FIREBASE ADMIN INIT
================================ */
import serviceAccount from "./firebase-admin.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/* ===============================
   AUTH MIDDLEWARE
================================ */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.send("StudyAgora backend running 🚀");
});

/* ===============================
   AUTH ROUTES
================================ */
app.post("/auth/login", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token missing" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    res.json({
      uid: decoded.uid,
      phone: decoded.phone_number,
      plan: "free"
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

app.get("/auth/me", requireAuth, (req, res) => {
  res.json({
    uid: req.user.uid,
    phone: req.user.phone_number,
    plan: "free"
  });
});

/* ===============================
   GROQ HELPER
================================ */
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
  if (!response.ok) throw new Error(text);

  const data = JSON.parse(text);
  return data.choices[0].message.content;
}

/* ===============================
   QUIZ (PROTECTED)
================================ */
app.post("/quiz", requireAuth, async (req, res) => {
  try {
    const { subject, difficulty, count } = req.body;

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
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   SERVER START
================================ */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("StudyAgora backend running on port", PORT);
});
