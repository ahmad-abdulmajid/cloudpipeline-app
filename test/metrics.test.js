const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const path = require("node:path");

const appPath = path.resolve(__dirname, "../app.js");

async function testMetricsEndpoint(enabled, expectedStatus) {
  const script = `
    const app = require(${JSON.stringify(appPath)});

    const server = app.listen(0, "127.0.0.1", async () => {
      try {
        const port = server.address().port;
        const response = await fetch(
          "http://127.0.0.1:" + port + "/metrics"
        );

        if (response.status !== ${expectedStatus}) {
          console.error("Expected ${expectedStatus}, got", response.status);
          process.exitCode = 1;
        }

        server.close();
      } catch (error) {
        console.error(error);
        server.close();
        process.exitCode = 1;
      }
    });
  `;

  const child = spawn(process.execPath, ["-e", script], {
    env: {
      ...process.env,
      ENABLE_METRICS: enabled ? "true" : "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";

  child.stdout.on("data", (data) => {
    output += data.toString();
  });

  child.stderr.on("data", (data) => {
    output += data.toString();
  });

  const [exitCode] = await once(child, "exit");

  assert.equal(exitCode, 0, output);
}

test("/metrics returns 404 when monitoring is disabled", async () => {
  await testMetricsEndpoint(false, 404);
});

test("/metrics returns 200 when monitoring is enabled", async () => {
  await testMetricsEndpoint(true, 200);
});
