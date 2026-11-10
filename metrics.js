const {
  Registry,
  Counter,
  Histogram,
  collectDefaultMetrics
} = require("@prometheus-io/client");

const register = new Registry();

collectDefaultMetrics({ register });

const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register]
});

const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [register]
});

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDuration
};