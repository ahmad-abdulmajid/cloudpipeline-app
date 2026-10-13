const express = require("express");

const app = express();

app.use(express.json());

const incidents = [
  {
    id: 1,
    title: "Application health check failing",
    description: "The demo application is not responding as expected.",
    severity: "High",
    status: "Open",
    resolution: ""
  }
];

let nextId = 2;
const severities = ["Low", "Medium", "High"];

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/incidents", (req, res) => {
  res.status(200).json(incidents);
});

app.post("/incidents", (req, res) => {
  const { title, description = "", severity } = req.body || {};

  if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
    return res.status(400).json({
      error: "Title must contain between 1 and 120 characters."
    });
  }

  if (typeof description !== "string" || description.length > 2000) {
    return res.status(400).json({
      error: "Description must be text of at most 2000 characters."
    });
  }

  if (!severities.includes(severity)) {
    return res.status(400).json({
      error: "Severity must be Low, Medium, or High."
    });
  }

  const incident = {
    id: nextId++,
    title: title.trim(),
    description: description.trim(),
    severity,
    status: "Open",
    resolution: ""
  };

  incidents.push(incident);

  res.status(201).json(incident);
});


app.patch("/incidents/:id", (req, res) => {
  const id = Number(req.params.id);
  const incident = incidents.find((item) => item.id === id);

  if (!incident) {
    return res.status(404).json({ error: "Incident not found." });
  }

  const { status, resolution = "" } = req.body || {};
  const statuses = ["Open", "Investigating", "Resolved"];

  if (!statuses.includes(status)) {
    return res.status(400).json({
      error: "Status must be Open, Investigating, or Resolved."
    });
  }

  if (typeof resolution !== "string" || resolution.length > 2000) {
    return res.status(400).json({
      error: "Resolution must be text of at most 2000 characters."
    });
  }

  if (status === "Resolved" && !resolution.trim()) {
    return res.status(400).json({
      error: "A resolution note is required when resolving an incident."
    });
  }

  incident.status = status;
  incident.resolution = resolution.trim();

  res.status(200).json(incident);
});

module.exports = app;
