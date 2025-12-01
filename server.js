// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Vi bruger Node's indbyggede fetch (v25 har det indbygget)
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.warn("⚠️ GROQ_API_KEY mangler i .env-filen");
}

// Simpelt health-check endpoint (til test i browser)
app.get("/", (req, res) => {
  res.send("Study Helper backend kører ✅");
});

// Proxy-endpoint til Groq
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res
        .status(400)
        .json({ error: "Body skal indeholde 'messages' som array." });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.5,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Groq API-fejl:", text);
      return res
        .status(500)
        .json({ error: "Fejl fra Groq API", details: text });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    res.json({ content });
  } catch (err) {
    console.error("Serverfejl:", err);
    res.status(500).json({ error: "Intern serverfejl" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend kører på http://localhost:${PORT}`);
});
