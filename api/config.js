// Vercel serverless function — same-origin config store (no CORS issues).
// The browser only ever talks to /api/config on your own domain.
// This function talks to the backing store server-side, where CORS does not apply.

const STORE = "https://jsonblob.com/api/jsonBlob/019ed1a0-3143-73dd-b4a1-1bce7f2c6573";
const EMPTY = { ca: "", chart: "" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const r = await fetch(STORE, { cache: "no-store" });
      const data = r.ok ? await r.json() : EMPTY;
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(200).json(data);
    }

    if (req.method === "POST" || req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; } }
      body = body || {};
      const cfg = { ca: String(body.ca || ""), chart: String(body.chart || "") };
      const r = await fetch(STORE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      return res.status(r.ok ? 200 : 502).json(r.ok ? cfg : { error: "store write failed" });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
