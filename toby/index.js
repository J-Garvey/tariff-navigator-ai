/**
 * Load environment variables from .env (must run before using process.env).
 */
require("dotenv").config();

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.warn("Warning: API_KEY is not set in .env");
}

// Use your API key when calling an API, e.g.:
// fetch("https://api.example.com/data", {
//   headers: { "Authorization": `Bearer ${apiKey}` }
// });

console.log("API key loaded:", apiKey ? "***" + apiKey.slice(-4) : "(missing)");
