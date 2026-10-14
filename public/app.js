const incidentList = document.getElementById("incident-list");
const feedback = document.getElementById("feedback");

async function loadIncidents() {
  feedback.textContent = "Loading incidents…";

  try {
    const response = await fetch("/incidents");

    if (!response.ok) {
      throw new Error("Could not load incidents. Refresh the page to retry.");
    }

    const incidents = await response.json();

    incidentList.replaceChildren();

    if (incidents.length === 0) {
      const message = document.createElement("p");
      message.textContent = "No incidents reported yet.";
      incidentList.append(message);
    }

    for (const incident of incidents) {
      const article = document.createElement("article");

      const heading = document.createElement("h3");
      heading.textContent = `#${incident.id}: ${incident.title}`;

      const details = document.createElement("p");
      details.textContent =
        `Severity: ${incident.severity} | Status: ${incident.status}`;

      const description = document.createElement("p");
      description.textContent = incident.description;

      article.append(heading, details, description);

      if (incident.resolution) {
        const resolution = document.createElement("p");
        resolution.textContent = `Resolution: ${incident.resolution}`;
        article.append(resolution);
      }


      const updateForm = document.createElement("form");

      const statusLabel = document.createElement("label");
      statusLabel.htmlFor = `status-${incident.id}`;
      statusLabel.textContent = "Status";

      const statusSelect = document.createElement("select");
      statusSelect.id = `status-${incident.id}`;

      for (const status of ["Open", "Investigating", "Resolved"]) {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        statusSelect.append(option);
      }

      statusSelect.value = incident.status;

      const resolutionLabel = document.createElement("label");
      resolutionLabel.htmlFor = `resolution-${incident.id}`;
      resolutionLabel.textContent = "Resolution note (required when resolved)";

      const resolutionInput = document.createElement("textarea");
      resolutionInput.id = `resolution-${incident.id}`;
      resolutionInput.maxLength = 2000;
      resolutionInput.rows = 3;
      resolutionInput.value = incident.resolution;

      function updateRequirement() {
        resolutionInput.required = statusSelect.value === "Resolved";
      }

      statusSelect.addEventListener("change", updateRequirement);
      updateRequirement();

      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.textContent = "Save update";

      const updateFeedback = document.createElement("p");
      updateFeedback.setAttribute("role", "status");

      updateForm.append(
        statusLabel,
        statusSelect,
        document.createElement("br"),
        resolutionLabel,
        document.createElement("br"),
        resolutionInput,
        document.createElement("br"),
        saveButton,
        updateFeedback
      );

      updateForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        saveButton.disabled = true;
        saveButton.textContent = "Saving…";
        updateFeedback.textContent = "";

        let saved = false;

        try {
          const response = await fetch(`/incidents/${incident.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: statusSelect.value,
              resolution: resolutionInput.value.trim()
            })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Could not update the incident.");
          }

          saved = true;
        } catch (error) {
          updateFeedback.textContent =
            `${error.message} Your entries are kept.`;
        } finally {
          saveButton.disabled = false;
          saveButton.textContent = "Save update";
        }

        if (saved) {
          await loadIncidents();
          feedback.textContent =
            `Incident #${incident.id} updated. ${feedback.textContent}`;
        }
      });

      article.append(updateForm);

      incidentList.append(article);
    }

    feedback.textContent = `${incidents.length} incident(s) loaded.`;
  } catch (error) {
    feedback.textContent = error.message;
  }
}

loadIncidents();

const incidentForm = document.getElementById("incident-form");
const createButton = incidentForm.querySelector('button[type="submit"]');

createButton.disabled = false;

incidentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  createButton.disabled = true;
  createButton.textContent = "Creating…";
  feedback.textContent = "Saving incident…";

  let created;

  try {
    const response = await fetch("/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim(),
        severity: document.getElementById("severity").value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not create the incident.");
    }

    created = data;
    incidentForm.reset();
  } catch (error) {
    feedback.textContent =
      `${error.message} Your entries are kept. Check the list before retrying.`;
  } finally {
    createButton.disabled = false;
    createButton.textContent = "Create incident";
  }

  if (created) {
    await loadIncidents();
    feedback.textContent =
      `Incident #${created.id} created. ${feedback.textContent}`;
  }
});
