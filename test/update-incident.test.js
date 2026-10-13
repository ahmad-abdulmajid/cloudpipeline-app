const { test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");

test("PATCH /incidents updates status and requires a resolution note", async () => {
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    async function updateIncident(id, body) {
      return fetch(`${baseUrl}/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    const investigating = await updateIncident(1, {
      status: "Investigating"
    });
    assert.equal(investigating.status, 200);
    assert.equal((await investigating.json()).status, "Investigating");

    const missingNote = await updateIncident(1, {
      status: "Resolved"
    });
    assert.equal(missingNote.status, 400);

    const listResponse = await fetch(`${baseUrl}/incidents`);
    const incidents = await listResponse.json();
    assert.equal(incidents.find((item) => item.id === 1).status, "Investigating");

    const resolved = await updateIncident(1, {
      status: "Resolved",
      resolution: "Rolled back to the previous working image."
    });
    assert.equal(resolved.status, 200);

    const updated = await resolved.json();
    assert.equal(updated.status, "Resolved");
    assert.equal(
      updated.resolution,
      "Rolled back to the previous working image."
    );

    const invalidStatus = await updateIncident(1, { status: "Unknown" });
    assert.equal(invalidStatus.status, 400);

    const notFound = await updateIncident(999, { status: "Open" });
    assert.equal(notFound.status, 404);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
});
