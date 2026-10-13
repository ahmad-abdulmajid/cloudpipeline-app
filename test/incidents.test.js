const { test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");

test("GET /incidents returns the sample incident", async () => {
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/incidents`);
    const incidents = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(incidents));
    assert.equal(incidents.length, 1);
    assert.deepEqual(incidents[0], {
      id: 1,
      title: "Application health check failing",
      description: "The demo application is not responding as expected.",
      severity: "High",
      status: "Open",
      resolution: ""
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
});
