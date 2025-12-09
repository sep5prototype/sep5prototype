// Denne fil styrer hvad der sker i browseren.
// - Henter input fra HTML
// - Sender det til backend
// - Viser svaret i brugergrænsefladen

const BACKEND_URL = "http://localhost:3000/api/chat";

// Hent elementer
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

// IIFE function - kører instant så snart script er loaded - restore saved plan
(function restoreSavedPlan() {
  try {
    const saved = localStorage.getItem("studyPlan");
    if (!saved) return;

    const plan = JSON.parse(saved);
    renderPlan(plan);
    statusEl.textContent = "Loaded saved study plan.";
  } catch (err) {
    console.error("Could not restore saved study plan from localStorage:", err);
  }
})();

// byg prompt -> dette sender vi til backend
function buildPrompt(data) {
  return (
    "Create a study plan and respond ONLY with valid JSON (no ```).\n" +
    "Use exactly this structure:\n\n" +
    "{\n" +
    '  "overview": {\n' +
    '    "total_weeks": number,\n' +
    '    "total_hours": number,\n' +
    '    "topic_count": number,\n' +
    '    "summary": string\n' +
    "  },\n" +
    '  "topic_priorities": [\n' +
    '    { "topic": string, "priority": "high" | "medium" | "low", "reason": string }\n' +
    "  ],\n" +
    '  "prerequisites": [\n' +
    '    { "topic": string, "depends_on": [string] }\n' +
    "  ],\n" +
    '  "weekly_schedule": [\n' +
    "    {\n" +
    '      "week": number,\n' +
    '      "focus_topics": [string],\n' +
    '      "hours_planned": number,\n' +
    '      "milestones": [string]\n' +
    "    }\n" +
    "  ],\n" +
    '  "risk_flags": [\n' +
    '    { "type": string, "description": string, "suggestion": string }\n' +
    "  ]\n" +
    "}\n\n" +
    "DATA:\n" +
    "- Topics: " +
    JSON.stringify(data.topics) +
    "\n" +
    "- Deadlines: " +
    JSON.stringify(data.deadlines) +
    "\n" +
    "- Weeks: " +
    data.weeks +
    "\n" +
    "- Hours per week: " +
    data.hoursPerWeek +
    "\n" +
    "- Extra context: " +
    JSON.stringify(data.context) +
    "\n\n" +
    "Return only valid JSON."
  );
}

// Fetch til backend
function callBackend(prompt) {
  return fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are creating a study plan." },
        { role: "user", content: prompt },
      ],
    }),
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      return data.content;
    });
}

// Vis plan
function renderPlan(plan) {
  outputEmpty.classList.add("hidden");
  planOutput.classList.remove("hidden");

  // Save the latest plan in localStorage
  try {
    localStorage.setItem("studyPlan", JSON.stringify(plan));
  } catch (err) {
    console.error("Could not save study plan to localStorage:", err);
  }

  // oversigt
  overviewEl.innerHTML = "";

  const p1 = document.createElement("p");
  p1.innerHTML =
    "<strong>Weeks in the plan:</strong> " + plan.overview.total_weeks;
  overviewEl.appendChild(p1);

  const p2 = document.createElement("p");
  p2.innerHTML = "<strong>Total hours:</strong> " + plan.overview.total_hours;
  overviewEl.appendChild(p2);

  const p3 = document.createElement("p");
  p3.innerHTML = "<strong>Topics:</strong> " + plan.overview.topic_count;
  overviewEl.appendChild(p3);

  const p4 = document.createElement("p");
  p4.textContent = plan.overview.summary;
  overviewEl.appendChild(p4);

  // prioriteter
  prioritiesEl.innerHTML = "";

  if (plan.topic_priorities && plan.topic_priorities.length > 0) {
    const ul = document.createElement("ul");

    plan.topic_priorities.forEach(function (item) {
      const li = document.createElement("li");

      li.innerHTML =
        "<strong>" +
        item.topic +
        "</strong> " +
        '<span class="tag badge-' +
        item.priority +
        '">' +
        item.priority +
        "</span><br>" +
        item.reason;

      ul.appendChild(li);
    });

    prioritiesEl.appendChild(ul);
  }

  // forudsætninger
  prereqEl.innerHTML = "";

  if (plan.prerequisites && plan.prerequisites.length > 0) {
    const ul2 = document.createElement("ul");

    plan.prerequisites.forEach(function (item) {
      const li = document.createElement("li");

      li.innerHTML =
        "<strong>" + item.topic + "</strong> → " + item.depends_on.join(", ");

      ul2.appendChild(li);
    });

    prereqEl.appendChild(ul2);
  }

  // ugentlig tabel
  weeklyEl.innerHTML = "";

  if (plan.weekly_schedule && plan.weekly_schedule.length > 0) {
    const table = document.createElement("table");

    // Tabel header
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Week</th>
        <th>Focus</th>
        <th>Hours</th>
        <th>Milestones</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    // forEach pr. uge i planen
    plan.weekly_schedule.forEach(function (week) {
      const tr = document.createElement("tr");

      // en celle pr. information
      const td1 = document.createElement("td");
      td1.textContent = week.week;
      tr.appendChild(td1);

      const td2 = document.createElement("td");
      td2.textContent = week.focus_topics.join(", ");
      tr.appendChild(td2);

      const td3 = document.createElement("td");
      td3.textContent = week.hours_planned;
      tr.appendChild(td3);

      const td4 = document.createElement("td");
      const ulMiles = document.createElement("ul");

      // Milepæle inde i hver uge
      week.milestones.forEach(function (m) {
        const li = document.createElement("li");
        li.textContent = m;
        ulMiles.appendChild(li);
      });

      td4.appendChild(ulMiles);
      tr.appendChild(td4);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    weeklyEl.appendChild(table);
  }

  // Risiko
  // Viser fx hvis der er for mange timer i en uge
  riskEl.innerHTML = "";

  if (plan.risk_flags && plan.risk_flags.length > 0) {
    const ul3 = document.createElement("ul");

    plan.risk_flags.forEach(function (risk) {
      const li = document.createElement("li");

      li.innerHTML =
        "<strong>" +
        risk.type +
        "</strong>: " +
        risk.description +
        "<br><em>Suggestion:</em> " +
        risk.suggestion;

      ul3.appendChild(li);
    });

    riskEl.appendChild(ul3);
  }
}

/**
 * JSON parsing helper:
 * - First tries direct JSON.parse
 * - Then tries to cut out the JSON part between first { and last }
 * - Throws an error if it still fails
 */
function parsePlan(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Could not parse JSON directly:", err, raw);

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start !== -1 && end !== -1) {
      const cut = raw.slice(start, end + 1);
      try {
        return JSON.parse(cut);
      } catch (innerErr) {
        console.error("Could not parse JSON after slicing:", innerErr, cut);
      }
    }

    throw new Error("Could not read JSON.");
  }
}

// Form submit - vi sender data når man klikker på knappen
form.addEventListener("submit", function (event) {
  event.preventDefault();

  // Reset visning og status ved nyt submit
  statusEl.textContent = "Generating study plan…";
  outputEmpty.classList.remove("hidden");
  planOutput.classList.add("hidden");

  // Saml emner
  const topics = [];
  topicsInput.value.split("\n").forEach(function (line) {
    const trimmed = line.trim();
    if (trimmed !== "") {
      topics.push(trimmed);
    }
  });

  const deadlines = [];
  deadlinesInput.value.split("\n").forEach(function (line) {
    const trimmed = line.trim();
    if (trimmed !== "") {
      deadlines.push(trimmed);
    }
  });

  const data = {
    topics: topics,
    deadlines: deadlines,
    weeks: Number(weeksInput.value),
    hoursPerWeek: Number(hoursInput.value),
    context: contextInput.value.trim(),
  };

  // Client-side validering
  if (data.topics.length === 0) {
    statusEl.textContent = "Enter at least one course or topic.";
    return;
  }

  if (!data.weeks || data.weeks <= 0) {
    statusEl.textContent = "Enter a valid number of weeks.";
    return;
  }

  if (!data.hoursPerWeek || data.hoursPerWeek <= 0) {
    statusEl.textContent = "Enter a valid number of hours per week.";
    return;
  }

  // Lav prompt tekst
  const prompt = buildPrompt(data);

  // Kald backend (fetch)
  callBackend(prompt)
    .then(function (raw) {
      let plan;

      try {
        plan = parsePlan(raw);
      } catch (err) {
        console.error("parsePlan failed:", err);
        statusEl.textContent = "Could not read JSON.";
        return;
      }

      // If parse was successful, render plan
      renderPlan(plan);
      statusEl.textContent = "Study plan has been generated";
    })
    .catch(function (err) {
      console.error("Error: backend not responding or network error:", err);
      statusEl.textContent = "Error: backend is not responding.";
    });
});
