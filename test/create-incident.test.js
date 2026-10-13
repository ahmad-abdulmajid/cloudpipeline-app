const { test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");

test("POST /incidents creates valid incidents and rejects invalid input", async () => {
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    async function createIncident(body) {
      return fetch(`${baseUrl}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    const response = await createIncident({
      title: "Deployment failed",
      description: "The new container did not start.",
      severity: "High"
    });

    assert.equal(response.status, 201);

    const created = await response.json();
    assert.ok(Number.isInteger(created.id));
    assert.equal(created.title, "Deployment failed");
    assert.equal(created.severity, "High");
    assert.equal(created.status, "Open");

    const listResponse = await fetch(`${baseUrl}/incidents`);
    const incidents = await listResponse.json();
    assert.ok(incidents.some((incident) => incident.id === created.id));

    const invalidTitle = await createIncident({
      title: "   ",
      severity: "High"
    });
    assert.equal(invalidTitle.status, 400);

    const invalidSeverity = await createIncident({
      title: "Deployment failed",
      severity: "Critical"
    });
    assert.equal(invalidSeverity.status, 400);

    const finalResponse = await fetch(`${baseUrl}/incidents`);
    const finalIncidents = await finalResponse.json();
    assert.equal(finalIncidents.length, incidents.length);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
});
