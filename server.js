import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import evaluateRoute from "./routes/evaluate.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/evaluate", evaluateRoute);

app.get("/", (req, res) => {
    res.send("StudyAgora Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("Backend running on port " + PORT);
});
