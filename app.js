// Denne fil styrer hvad der sker i browseren.
// - Henter input fra HTML
// - Sender det til backend
// - Viser svaret i brugergrænsefladen

const BACKEND_URL = "http://localhost:3000/api/chat";

// Hent elementer
const form = document.getElementById("plan-form");

const topicsInput = document.getElementById("topics");
const difficultTopicsInput = document.getElementById("difficult-topics");
const deadlinesInput = document.getElementById("deadlines");
const weeksInput = document.getElementById("weeks");
const hoursInput = document.getElementById("hours");
const additionalInformationInput = document.getElementById(
  "additionalInformation"
);

let lastDifficultTopics = [];

const statusEl = document.getElementById("status");
const outputEmpty = document.getElementById("output-empty");
const planOutput = document.getElementById("plan-output");

const overviewEl = document.getElementById("overview");
const deadlinesOutEl = document.getElementById("deadlines-output");
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
    statusEl.textContent = "Loaded saved AI-generated study plan.";
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
    '  "deadlines": [\n' +
    '    { "date": "YYYY-MM-DD", "title": string, "week": number }\n' +
    "  ],\n" +
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
    "INTERPRETATION RULES:\n" +
    "- The field 'Hours per week' is the MAXIMUM number of hours the student can study in any single week.\n" +
    "- You MUST NOT exceed this maximum in any week.\n" +
    "- For each week: 0 <= 'hours_planned' <= Hours per week.\n" +
    "- You MAY vary hours across weeks, but always stay within the maximum.\n" +
    "- The sum of all 'hours_planned' MUST equal 'overview.total_hours'.\n" +
    "- 'overview.total_hours' MUST be <= (weeks * Hours per week).\n" +
    "- If deadlines make it difficult to stay within the maximum, keep the cap and add a clear item in 'risk_flags'.\n" +
    "- If there is not enough capacity (weeks * Hours per week), reduce total_hours and explain why in risk_flags.\n\n" +
    "- If 'Difficult topics (student flagged)' is not empty, you MUST allocate more study time to those topics than to other topics.\n" +
    "- Use a simple weighting rule: difficult topics should receive about 2x attention compared to normal topics (unless a deadline forces otherwise).\n" +
    "- Ensure difficult topics appear earlier and/or more frequently in 'focus_topics' across the weekly_schedule.\n" +
    "- In 'topic_priorities', difficult topics should generally be 'high' or 'medium' and the reason must mention that the student finds it difficult.\n" +
    "- You MUST include every input deadline in the 'deadlines' array.\n" +
    "- 'week' must be between 1 and total_weeks and reflect when the deadline occurs.\n" +
    "- You MUST include each deadline as a milestone in the relevant week using the format:\n" +
    "  'Deadline: <title> (<date>)'.\n\n" +
    "DATA:\n" +
    "- Topics: " +
    JSON.stringify(data.topics) +
    "\n" +
    "- Difficult topics (student flagged): " +
    JSON.stringify(data.difficultTopics) +
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
    "- Extra additionalInformation: " +
    JSON.stringify(data.additionalInformation) +
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

  // deadlines
  deadlinesOutEl.innerHTML = "";
  if (plan.deadlines && plan.deadlines.length > 0) {
    const ulD = document.createElement("ul");

    plan.deadlines.forEach(function (d) {
      const li = document.createElement("li");
      li.innerHTML =
        "<strong>" +
        d.date +
        "</strong>: " +
        d.title +
        " (Week " +
        d.week +
        ")";
      ulD.appendChild(li);
    });

    deadlinesOutEl.appendChild(ulD);
  } else {
    deadlinesOutEl.textContent = "No deadlines were returned by the model.";
  }

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

  // week-by-week (accordion)
  renderWeeklyScheduleAsAccordion(plan);

  // risiko
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
        console.error("Could not parse JSON after cutting:", innerErr, cut);
      }
    }

    throw new Error("Could not read JSON.");
  }
}

function splitTopicsAcrossDaysWeighted(
  focusTopics,
  difficultTopics,
  hoursSplit
) {
  const days = hoursSplit.length;
  const dayTopics = Array.from({ length: days }, function () {
    return [];
  });

  const topics = Array.isArray(focusTopics) ? focusTopics.slice() : [];
  const difficult = Array.isArray(difficultTopics)
    ? difficultTopics.slice()
    : [];

  if (topics.length === 0) return dayTopics;

  // Normaliser til match (case-insensitive)
  const difficultSet = new Set(
    difficult.map(function (t) {
      return String(t).trim().toLowerCase();
    })
  );

  const difficultInWeek = topics.filter(function (t) {
    return difficultSet.has(String(t).trim().toLowerCase());
  });

  const normalInWeek = topics.filter(function (t) {
    return !difficultSet.has(String(t).trim().toLowerCase());
  });

  // Sortér dag-indekser så de højeste timer kommer først
  const dayOrder = hoursSplit
    .map(function (h, i) {
      return { h: h, i: i };
    })
    .sort(function (a, b) {
      return b.h - a.h;
    })
    .map(function (x) {
      return x.i;
    });

  // Slots: én topic “tag” pr. dag (kan gentage for at give svære mere plads)
  const slots = [];

  difficultInWeek.forEach(function (t) {
    slots.push(t);
  });
  normalInWeek.forEach(function (t) {
    slots.push(t);
  });

  const targetDifficultDays =
    difficultInWeek.length > 0 ? Math.max(3, Math.ceil(days * 0.6)) : 0;

  while (slots.length < days) {
    const difficultCount = slots.filter(function (t) {
      return difficultSet.has(String(t).trim().toLowerCase());
    }).length;

    if (difficultInWeek.length > 0 && difficultCount < targetDifficultDays) {
      slots.push(difficultInWeek[slots.length % difficultInWeek.length]);
    } else {
      slots.push(topics[slots.length % topics.length]);
    }
  }

  // Tildel slots til dage (prioritér høj-timers dage først)
  for (let s = 0; s < slots.length; s++) {
    const dayIndex = dayOrder[s % dayOrder.length];
    const topic = slots[s];

    if (dayTopics[dayIndex].indexOf(topic) === -1) {
      dayTopics[dayIndex].push(topic);
    }
  }

  return dayTopics;
}

function enforceWeeklyHourCap(plan, maxHoursPerWeek) {
  if (!plan || !Array.isArray(plan.weekly_schedule)) return plan;

  let hadCap = false;
  let surplus = 0;

  plan.weekly_schedule.forEach(function (w) {
    const hours = Number(w.hours_planned) || 0;

    if (hours > maxHoursPerWeek) {
      hadCap = true;
      surplus += hours - maxHoursPerWeek;
      w.hours_planned = maxHoursPerWeek;
    } else if (hours < 0) {
      w.hours_planned = 0;
    } else {
      w.hours_planned = hours;
    }
  });

  // Forsøg at omfordele overskydende timer til uger med plads
  if (surplus > 0) {
    for (let i = 0; i < plan.weekly_schedule.length && surplus > 0; i++) {
      const w = plan.weekly_schedule[i];
      const room = maxHoursPerWeek - w.hours_planned;

      if (room > 0) {
        const add = Math.min(room, surplus);
        w.hours_planned += add;
        surplus -= add;
      }
    }
  }

  // Opdatér total_hours så den matcher summen (UI bliver konsistent)
  const sum = plan.weekly_schedule.reduce(function (acc, w) {
    return acc + (Number(w.hours_planned) || 0);
  }, 0);

  plan.overview = plan.overview || {};
  plan.overview.total_hours = sum;

  // Risk flag hvis modellen brød cap (eller der ikke var kapacitet nok)
  plan.risk_flags = Array.isArray(plan.risk_flags) ? plan.risk_flags : [];

  if (hadCap) {
    plan.risk_flags.unshift({
      type: "Constraint violation",
      description:
        "One or more weeks exceeded your maximum of " +
        maxHoursPerWeek +
        " hours/week. The plan was adjusted to respect the cap.",
      suggestion:
        "Increase weeks, reduce scope, or adjust deadlines if the workload is too tight.",
    });
  }

  if (surplus > 0) {
    plan.risk_flags.unshift({
      type: "Capacity limit",
      description:
        "Not all hours could be redistributed without exceeding " +
        maxHoursPerWeek +
        " hours/week. Total hours were reduced to fit the cap.",
      suggestion:
        "Increase weeks or hours/week, or reduce topics to avoid overload.",
    });
  }

  return plan;
}

function splitHoursAcrossDays(totalHours, dayCount) {
  const base = Math.floor(totalHours / dayCount);
  let remainder = totalHours % dayCount;

  const arr = [];
  for (let i = 0; i < dayCount; i++) {
    const add = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder--;
    arr.push(base + add);
  }
  return arr;
}

function renderWeeklyScheduleAsAccordion(plan) {
  const weeklyEl = document.getElementById("weekly-schedule");
  weeklyEl.innerHTML = "";

  if (
    !plan ||
    !Array.isArray(plan.weekly_schedule) ||
    plan.weekly_schedule.length === 0
  ) {
    weeklyEl.textContent = "No weekly schedule was returned.";
    return;
  }

  plan.weekly_schedule.forEach(function (w) {
    const weekNum = Number(w.week) || 0;
    const hours = Number(w.hours_planned) || 0;

    const focusTopics = Array.isArray(w.focus_topics) ? w.focus_topics : [];
    const milestones = Array.isArray(w.milestones) ? w.milestones : [];

    const details = document.createElement("details");
    details.className = "week-card";

    const summary = document.createElement("summary");
    summary.className = "week-card__summary";

    const summaryText = document.createElement("span");
    summaryText.className = "week-card__title";
    summaryText.textContent =
      "Week " +
      weekNum +
      " | " +
      hours +
      " hours" +
      (focusTopics.length ? " | " + focusTopics.join(", ") : "");

    summary.appendChild(summaryText);

    const body = document.createElement("div");
    body.className = "week-card__body";

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const split = splitHoursAcrossDays(hours, days.length);

    const difficultTopics =
      plan._meta && plan._meta.difficultTopics
        ? plan._meta.difficultTopics
        : [];

    const dayTopicSplit = splitTopicsAcrossDaysWeighted(
      focusTopics,
      difficultTopics,
      split
    );

    const dayLabel = document.createElement("p");
    dayLabel.className = "week-card__label";
    dayLabel.textContent = "Daily allocation (suggested)";
    body.appendChild(dayLabel);

    const dayList = document.createElement("ul");
    dayList.className = "day-list";

    days.forEach(function (d, i) {
      const li = document.createElement("li");

      const strong = document.createElement("strong");
      strong.textContent = d + ": ";
      li.appendChild(strong);

      li.appendChild(document.createTextNode(split[i] + "h"));

      if (dayTopicSplit[i] && dayTopicSplit[i].length > 0) {
        const topicSpan = document.createElement("span");
        topicSpan.className = "day-topics";
        topicSpan.textContent = " | " + dayTopicSplit[i].join(", ");
        li.appendChild(topicSpan);
      }

      dayList.appendChild(li);
    });

    body.appendChild(dayList);

    const msLabel = document.createElement("p");
    msLabel.className = "week-card__label";
    msLabel.textContent = "Milestones";
    body.appendChild(msLabel);

    if (milestones.length) {
      const msList = document.createElement("ul");
      msList.className = "milestone-list";

      milestones.forEach(function (m) {
        const li = document.createElement("li");
        li.textContent = m;
        msList.appendChild(li);
      });

      body.appendChild(msList);
    } else {
      const empty = document.createElement("p");
      empty.className = "week-card__muted";
      empty.textContent = "No milestones provided.";
      body.appendChild(empty);
    }

    details.appendChild(summary);
    details.appendChild(body);
    weeklyEl.appendChild(details);
  });
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

  const difficultTopics = [];
  difficultTopicsInput.value.split("\n").forEach(function (line) {
    const trimmed = line.trim();
    if (trimmed !== "") {
      difficultTopics.push(trimmed);
    }
  });

  lastDifficultTopics = difficultTopics;

  const data = {
    topics: topics,
    difficultTopics: difficultTopics,
    deadlines: deadlines,
    weeks: Number(weeksInput.value),
    hoursPerWeek: Number(hoursInput.value),
    additionalInformation: additionalInformationInput.value.trim(),
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

      plan = enforceWeeklyHourCap(plan, data.hoursPerWeek);
      plan._meta = { difficultTopics: lastDifficultTopics };

      // If parse was successful, render plan
      renderPlan(plan);
      statusEl.textContent = "Study plan has been generated";
    })
    .catch(function (err) {
      console.error("Error: backend not responding or network error:", err);
      statusEl.textContent = "Error: backend is not responding.";
    });
});
