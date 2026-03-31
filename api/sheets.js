/**
 * Vercel Serverless Proxy — api/sheets.js
 * ─────────────────────────────────────────────────────────────
 * Place this file at: api/sheets.js  (project root level)
 *
 * Set this in Vercel environment variables:
 *   APPS_SCRIPT_URL = https://script.google.com/macros/s/YOUR_ID/exec
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  if (!APPS_SCRIPT_URL) {
    res.status(500).json({ error: "APPS_SCRIPT_URL environment variable is not set in Vercel" });
    return;
  }

  try {
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body:    JSON.stringify(req.body),
      redirect: "follow",
    });
    const data = await upstream.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
