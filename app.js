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

// byg prompt -> dette sender vi til backend
function buildPrompt(data) {
  return (
    "Du skal lave en studieplan og svare KUN med gyldig JSON uden ```.\n" +
    "Brug præcis denne struktur og feltnavne:\n\n" +
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
    "- Emner: " +
    JSON.stringify(data.topics) +
    "\n" +
    "- Deadlines: " +
    JSON.stringify(data.deadlines) +
    "\n" +
    "- Uger: " +
    data.weeks +
    "\n" +
    "- Timer pr uge: " +
    data.hoursPerWeek +
    "\n" +
    "- Ekstra info: " +
    JSON.stringify(data.context) +
    "\n\n" +
    "Returnér kun gyldig JSON."
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
        { role: "system", content: "Du laver en studieplan." },
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

  // oversigt
  overviewEl.innerHTML = "";

  var p1 = document.createElement("p");
  p1.innerHTML = "<strong>Uger i planen:</strong> " + plan.overview.total_weeks;
  overviewEl.appendChild(p1);

  var p2 = document.createElement("p");
  p2.innerHTML =
    "<strong>Samlet antal timer:</strong> " + plan.overview.total_hours;
  overviewEl.appendChild(p2);

  var p3 = document.createElement("p");
  p3.innerHTML = "<strong>Antal emner:</strong> " + plan.overview.topic_count;
  overviewEl.appendChild(p3);

  var p4 = document.createElement("p");
  p4.textContent = plan.overview.summary;
  overviewEl.appendChild(p4);

  // prioriteter
  prioritiesEl.innerHTML = "";

  if (plan.topic_priorities && plan.topic_priorities.length > 0) {
    var ul = document.createElement("ul");

    plan.topic_priorities.forEach(function (item) {
      var li = document.createElement("li");

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
    var ul2 = document.createElement("ul");

    plan.prerequisites.forEach(function (item) {
      var li = document.createElement("li");

      li.innerHTML =
        "<strong>" + item.topic + "</strong> → " + item.depends_on.join(", ");

      ul2.appendChild(li);
    });

    prereqEl.appendChild(ul2);
  }

  // ugentlig tabel
  weeklyEl.innerHTML = "";

  if (plan.weekly_schedule && plan.weekly_schedule.length > 0) {
    var table = document.createElement("table");

    // Tabel header
    var thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Uge</th>
        <th>Fokus</th>
        <th>Timer</th>
        <th>Milepæle</th>
      </tr>
    `;
    table.appendChild(thead);

    var tbody = document.createElement("tbody");

    // forEach pr. uge i planen
    plan.weekly_schedule.forEach(function (week) {
      var tr = document.createElement("tr");

      // en celle pr. information
      var td1 = document.createElement("td");
      td1.textContent = week.week;
      tr.appendChild(td1);

      var td2 = document.createElement("td");
      td2.textContent = week.focus_topics.join(", ");
      tr.appendChild(td2);

      var td3 = document.createElement("td");
      td3.textContent = week.hours_planned;
      tr.appendChild(td3);

      var td4 = document.createElement("td");
      var ulMiles = document.createElement("ul");

      // Milepæle inde i hver uge
      week.milestones.forEach(function (m) {
        var li = document.createElement("li");
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
    var ul3 = document.createElement("ul");

    plan.risk_flags.forEach(function (risk) {
      var li = document.createElement("li");

      li.innerHTML =
        "<strong>" +
        risk.type +
        "</strong>: " +
        risk.description +
        "<br><em>Forslag:</em> " +
        risk.suggestion;

      ul3.appendChild(li);
    });

    riskEl.appendChild(ul3);
  }
}

// Form submit - vi sender data når man klikker på knappen
form.addEventListener("submit", function (event) {
  event.preventDefault(); 

  statusEl.textContent = "Genererer studieplan…";

  var topics = [];
  topicsInput.value.split("\n").forEach(function (line) {
    var trimmed = line.trim();
    if (trimmed !== "") {
      topics.push(trimmed);
    }
  });

  var deadlines = [];
  deadlinesInput.value.split("\n").forEach(function (line) {
    var trimmed = line.trim();
    if (trimmed !== "") {
      deadlines.push(trimmed);
    }
  });

  var data = {
    topics: topics,
    deadlines: deadlines,
    weeks: Number(weeksInput.value),
    hoursPerWeek: Number(hoursInput.value),
    context: contextInput.value.trim(),
  };

  // Lav prompt tekst
  var prompt = buildPrompt(data);

  // Kald backend (fetch)
  callBackend(prompt)
    .then(function (raw) {
      var plan;

      // Først prøv at parse direkte som JSON
      try {
        plan = JSON.parse(raw);
      } catch (err) {
        // Hvis det fejler
        var start = raw.indexOf("{");
        var end = raw.lastIndexOf("}");

        if (start !== -1 && end !== -1) {
          var cut = raw.slice(start, end + 1);
          plan = JSON.parse(cut);
        } else {
          statusEl.textContent = "Kunne ikke læse JSON.";
          return;
        }
      }

      // Hvis det lykkes, så vis planen
      renderPlan(plan);
      statusEl.textContent = "Studieplan genereret";
    })
    .catch(function () {
      statusEl.textContent = "Fejl: backend svarer ikke.";
    });
});
