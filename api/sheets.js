/**
 * Vercel Serverless Proxy — api/sheets.js
 * ─────────────────────────────────────────────────────────────
 * Place this file at: api/sheets.js  (project root level)
 *
 * Set this in Vercel environment variables:
 * APPS_SCRIPT_URL = https://script.google.com/macros/s/YOUR_ID/exec
 */

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight and reject non-POST requests
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }

  // Check for the environment variable
  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  if (!APPS_SCRIPT_URL) {
    res.status(500).json({ error: "APPS_SCRIPT_URL environment variable is not set in Vercel" });
    return;
  }

  try {
    // FIX 1: Prevent double-stringification if the frontend sent text/plain
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Forward the request to Google Apps Script
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body:    payload,
      redirect: "follow",
    });

    // FIX 2: Catch non-200 responses (like Google Apps Script HTML error pages)
    if (!upstream.ok) {
      const errorText = await upstream.text();
      throw new Error(`GAS Error ${upstream.status}: ${errorText.substring(0, 100)}...`);
    }

    // Parse and return the successful JSON response
    const data = await upstream.json();
    res.status(200).json(data);
    
  } catch (err) {
    // Return a clean 500 error if anything fails
    res.status(500).json({ success: false, error: err.message });
  }
}
