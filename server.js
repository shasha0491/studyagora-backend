import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

const app = express();

/* =========================
   CONFIG
========================= */
const JWT_SECRET = process.env.JWT_SECRET || "studyagora_secret_key";

/* =========================
   MIDDLEWARE
========================= */
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("StudyAgora backend running 🚀");
});

/* =========================
   AUTH: SEND OTP (DEV MODE)
========================= */
app.post("/auth/send-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone required" });
  }

  // DEV OTP (fixed)
  const otp = "123456";

  // In real prod → send SMS
  console.log("DEV OTP for", phone, ":", otp);

  res.json({
    success: true,
    message: "OTP sent (DEV mode)",
    otp // DEV only (remove in prod)
  });
});

/* =========================
   AUTH: VERIFY OTP
========================= */
app.post("/auth/verify-otp", (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone & OTP required" });
  }

  // DEV OTP check
  if (otp !== "123456") {
    return res.status(401).json({ error: "Invalid OTP" });
  }

  const token = jwt.sign(
    { phone, role: "user" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "none",
    secure: true
  });

  res.json({
    success: true,
    user: { phone }
  });
});

/* =========================
   AUTH: CURRENT USER
========================= */
app.get("/me", (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ user });
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
});

/* =========================
   AUTH: LOGOUT
========================= */
app.post("/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

/* =========================
   LOGIN MIDDLEWARE
========================= */
function requireLogin(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Login required" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
}

/* =========================
   GROQ HELPER
========================= */
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

  const data = await response.json();
  return data.choices[0].message.content;
}

/* =========================
   QUIZ (LOCKED)
========================= */
app.post("/quiz", requireLogin, async (req, res) => {
  const { subject, difficulty, count } = req.body;

  if (!subject || !difficulty || !count) {
    return res.status(400).json({ error: "Missing fields" });
  }

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

  try {
    const quiz = await callGroq(prompt);
    res.json({ quiz });
  } catch (err) {
    res.status(500).json({ error: "Quiz failed" });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
