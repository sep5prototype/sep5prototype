// Denne fil er vores backend.
// Den modtager data fra frontend, sender det videre til AI, og returnerer AI'ens svar.
// Vi bruger Express, CORS og JSON til at gøre det simpelt.

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Gør det muligt at frontend må snakke med serveren
app.use(cors());
// Gør så vi kan læse JSON der bliver sendt i request body
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Et simpelt test-endpoint så vi kan se om serveren kører.
app.get("/", function (req, res) {
  res.send("Backend kører ✔️");
});

// Dette endpoint bruges når vi vil generere en studieplan.
// Her henter vi data fra frontend, og sender det videre til Groq AI.
app.post("/api/chat", function (req, res) {
  var messages = req.body.messages;

  // Simpelt tjek for at sikre korrekt dataformat
  if (!Array.isArray(messages)) {
    return res.status(400).json({
      error: "Body skal indeholde 'messages' som array",
    });
  }

  // Her sender vi en POST-request til Groq API'et med fetch.
  // Vi sender modelnavn, beskeder og API-nøgle i headers.
  fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: messages,
      temperature: 0.5,
    }),
  })
    // Her konverterer vi Groqs svar til JavaScript objekt
    .then(function (response) {
      return response.json();
    })
    // Her finder vi selve AI teksten i svarstrukturen og sender den retur til frontend
    .then(function (data) {
      var content = "";

      if (
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content
      ) {
        content = data.choices[0].message.content;
      }

      res.json({ content: content });
    })
    // Hvis AI services fejler eller ikke svarer, sender vi en fejl tilbage
    .catch(function () {
      res.status(500).json({ error: "Fejl fra Groq API" });
    });
});

// Til sidst starter vi serveren, så den kører på localhost:3000
app.listen(PORT, function () {
  console.log("Server kører på http://localhost:" + PORT);
});
