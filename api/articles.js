// api/articles.js
// Proxy ke Google Apps Script — request dari browser cuma nyentuh domain situs sendiri
// (literaism.my.id/api/articles), jadi nggak kena blokir ad-blocker & nggak ada masalah CORS.

// GANTI URL di bawah ini dengan URL Web App Apps Script kamu (yang sama seperti
// yang sebelumnya kamu taruh di SHEET_CONFIG.url pada index.html).
const APPS_SCRIPT_URL = "GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT_LO";

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const r = await fetch(APPS_SCRIPT_URL);
      const data = await r.json();
      res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate");
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const r = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(req.body)
      });
      const text = await r.text();
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(text);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Gagal menghubungi Google Sheet", detail: String(err) });
  }
}
