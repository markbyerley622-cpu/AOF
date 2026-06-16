// Vercel serverless function — same-origin config store (no CORS for the browser).
// The browser only ever talks to /api/config on your own domain.
// This function talks to the backing store server-side, with retries for reliability.
// CommonJS + global fetch (Node 18+, pinned to 20 via package.json).

const STORE = "https://jsonblob.com/api/jsonBlob/019ed1a0-3143-73dd-b4a1-1bce7f2c6573";

async function storeGet() {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(STORE, { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch (e) { /* retry */ }
  }
  return null;
}

async function storePut(cfg) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(STORE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (r.ok) return true;
    } catch (e) { /* retry */ }
  }
  return false;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const data = await storeGet();
      // On failure return an error (NOT empty) so clients keep their last good config.
      if (!data) return res.status(502).json({ error: "store unreachable" });
      return res.status(200).json({ ca: String(data.ca || ""), chart: String(data.chart || "") });
    }

    if (req.method === "POST" || req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; } }
      body = body || {};
      const cfg = { ca: String(body.ca || ""), chart: String(body.chart || "") };
      const ok = await storePut(cfg);
      return res.status(ok ? 200 : 502).json(ok ? cfg : { error: "store write failed" });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
};
