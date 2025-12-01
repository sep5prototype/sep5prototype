// ====== KONFIGURATION ======
// Ingen API-key her – frontend taler kun med vores egen backend.
const BACKEND_URL = "http://localhost:3000/api/chat";
// ====== DOM ELEMENTER ======
const form = document.getElementById("plan-form");
const topicsInput = document.getElementById("topics");
const deadlinesInput = document.getElementById("deadlines");
const weeksInput = document.getElementById("weeks");
const hoursInput = document.getElementById("hours");
const contextInput = document.getElementById("context");
const statusEl = document.getElementById("status");
const outputEmpty = document.getElementById("output-empty");
const planOutput = document.getElementById("plan-output");
const overviewEl = document.getElementById("overview");
const prioritiesEl = document.getElementById("priorities");
const prereqEl = document.getElementById("prerequisites");
const weeklyEl = document.getElementById("weekly-schedule");
const riskEl = document.getElementById("risk-flags");
// ====== HJÆLPEFUNKTION: byg prompt ======
function buildPrompt(data) {
  // Vi beder modellen svare i ren JSON, så det er nemt at vise pænt bagefter.
  return `
Du er en studiecoach, der hjælper universitetsstuderende med at lave en realistisk, evidensbaseret studieplan.
Du skal bruge principper for tidsstyring, emneprioritering og reduktion af akademisk stress.
INPUT (fra studenten):
- Emner: ${JSON.stringify(data.topics)}
- Deadlines: ${JSON.stringify(data.deadlines)}
- Studiemåneder/uger: ${data.weeks}
- Timer til rådighed pr. uge: ${data.hoursPerWeek}
- Ekstra kontekst: ${JSON.stringify(data.context)}
KRAV TIL PLANEN:
1. Respekter antal timer pr. uge. Fordel timer realistisk.
2. Del store opgaver op i mindre trin.
3. Planlæg i uger (uge 1, uge 2, ... uge N).
4. Prioritér emner efter vigtighed og sværhedsgrad.
5. Fremhæv risici (fx meget tæt på deadline, svært pensum, for mange timer).
SVARSFORMAT:
Returnér KUN gyldig JSON (ingen forklarende tekst udenfor JSON), med denne struktur:
{
  "overview": {
    "total_weeks": number,
    "total_hours": number,
    "topic_count": number,
    "summary": string
  },
  "topic_priorities": [
    { "topic": string, "priority": "high" | "medium" | "low", "reason": string }
  ],
  "prerequisites": [
    { "topic": string, "depends_on": [string] }
  ],
  "weekly_schedule": [
    {
      "week": number,
      "focus_topics": [string],
      "hours_planned": number,
      "milestones": [string]
    }
  ],
  "risk_flags": [
    { "type": string, "description": string, "suggestion": string }
  ]
}
`.trim();
}
// ====== KALD BACKEND (som kalder Groq) ======
async function callGroq(prompt) {
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "Du er en hjælpsom studieassistent, der laver realistiske, velstrukturerede studieplaner til universitetsstuderende.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error("Backend-fejl:", text);
    throw new Error("Fejl ved kontakt til backend");
  }
  const data = await response.json();
  const content = data.content;
  return content;
}
// ====== VIS PLAN I UI ======
function renderPlan(plan) {
  outputEmpty.classList.add("hidden");
  planOutput.classList.remove("hidden");
  // Overview
  overviewEl.innerHTML = `
    <p><strong>Uger i planen:</strong> ${plan.overview.total_weeks}</p>
    <p><strong>Samlet antal timer:</strong> ${plan.overview.total_hours}</p>
    <p><strong>Antal emner:</strong> ${plan.overview.topic_count}</p>
    <p>${plan.overview.summary}</p>
  `;
  // Priorities
  prioritiesEl.innerHTML = "";
  if (Array.isArray(plan.topic_priorities) && plan.topic_priorities.length) {
    const list = document.createElement("ul");
    plan.topic_priorities.forEach((item) => {
      const li = document.createElement("li");
      const badgeClass =
        item.priority === "high"
          ? "badge-high"
          : item.priority === "medium"
          ? "badge-medium"
          : "badge-low";
      li.innerHTML = `
        <strong>${item.topic}</strong>
        <span class="tag ${badgeClass}">${item.priority}</span>
        <br>
        <span>${item.reason}</span>
      `;
      list.appendChild(li);
    });
    prioritiesEl.appendChild(list);
  } else {
    prioritiesEl.textContent = "Ingen prioriteringer tilgængelige.";
  }
  // Prerequisites
  prereqEl.innerHTML = "";
  if (Array.isArray(plan.prerequisites) && plan.prerequisites.length) {
    const list = document.createElement("ul");
    plan.prerequisites.forEach((item) => {
      const deps =
        item.depends_on && item.depends_on.length
          ? item.depends_on.join(", ")
          : "Ingen";
      const li = document.createElement("li");
      li.innerHTML = `<strong>${item.topic}</strong> (afhænger af: ${deps})`;
      list.appendChild(li);
    });
    prereqEl.appendChild(list);
  } else {
    prereqEl.textContent = "Ingen forudsætninger angivet.";
  }
  // Weekly schedule – nu som TABLE
  weeklyEl.innerHTML = "";
  if (Array.isArray(plan.weekly_schedule) && plan.weekly_schedule.length) {
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "0.5rem";
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th style="border-bottom:1px solid #444; padding:8px; text-align:left;">Uge</th>
        <th style="border-bottom:1px solid #444; padding:8px; text-align:left;">Fokus-emner</th>
        <th style="border-bottom:1px solid #444; padding:8px; text-align:left;">Timer</th>
        <th style="border-bottom:1px solid #444; padding:8px; text-align:left;">Milepæle</th>
      </tr>
    `;
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    plan.weekly_schedule.forEach((week) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="padding:8px; border-bottom:1px solid #333;">${week.week}</td>
        <td style="padding:8px; border-bottom:1px solid #333;">${week.focus_topics.join(
          ", "
        )}</td>
        <td style="padding:8px; border-bottom:1px solid #333;">${
          week.hours_planned
        }</td>
        <td style="padding:8px; border-bottom:1px solid #333;">
          <ul style="margin:0; padding-left:1.2rem;">
            ${week.milestones.map((m) => `<li>${m}</li>`).join("")}
          </ul>
        </td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    weeklyEl.appendChild(table);
  } else {
    weeklyEl.textContent = "Ingen ugeplan tilgængelig.";
  }
  // Risk flags
  riskEl.innerHTML = "";
  if (Array.isArray(plan.risk_flags) && plan.risk_flags.length) {
    const list = document.createElement("ul");
    plan.risk_flags.forEach((risk) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${risk.type}:</strong> ${risk.description}
        <br>
        <em>Forslag:</em> ${risk.suggestion}
      `;
      list.appendChild(li);
    });
    riskEl.appendChild(list);
  } else {
    riskEl.textContent = "Ingen særlige risici registreret.";
  }
}
// ====== FORM-HÅNDTERING ======
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "";
  const btn = document.getElementById("generate-btn");
  btn.disabled = true;
  const topics = topicsInput.value
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
  const deadlines = deadlinesInput.value
    .split("\n")
    .map((d) => d.trim())
    .filter(Boolean);
  const data = {
    topics,
    deadlines,
    weeks: Number(weeksInput.value),
    hoursPerWeek: Number(hoursInput.value),
    context: contextInput.value.trim(),
  };
  try {
    statusEl.textContent = "Genererer studieplan via Groq…";
    const prompt = buildPrompt(data);
    const raw = await callGroq(prompt);
    let plan;
    try {
      // Rens evt. ```json ... ``` indpakning væk
      const cleaned = raw
        .trim()
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "");
      plan = JSON.parse(cleaned);
    } catch (e) {
      console.warn("Kunne ikke parse JSON, viser rå tekst i oversigt.", e);
      overviewEl.textContent = raw;
      prioritiesEl.textContent = "";
      prereqEl.textContent = "";
      weeklyEl.textContent = "";
      riskEl.textContent = "";
      outputEmpty.classList.add("hidden");
      planOutput.classList.remove("hidden");
      statusEl.textContent =
        "Plan modtaget, men ikke i korrekt JSON-format (vises som rå tekst).";
      return;
    }
    renderPlan(plan);
    statusEl.textContent = "Studieplan genereret 🎉";
  } catch (error) {
    console.error(error);
    statusEl.textContent =
      "Der skete en fejl – tjek din internetforbindelse eller om backend kører.";
  } finally {
    btn.disabled = false;
  }
});
