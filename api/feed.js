// api/feed.js
// RSS 2.0 feed — dipanggil lewat rewrite /feed.xml di vercel.json.
// Berguna buat RSS reader (Feedly, dll) dan sinyal tambahan buat search engine.

const { fetchArticles } = require("./_lib/sheet");

const SEGMENTS = {
  "sastra": "Sastra",
  "sejarah": "Sejarah",
  "modern-culture": "Modern Culture",
  "film": "Film",
  "game": "Game",
  "musik": "Musik"
};

function escapeXml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  })[s]);
}

function toRfc822(dateStr) {
  const d = /^\d{4}-\d{2}-\d{2}/.test(String(dateStr))
    ? new Date(String(dateStr).slice(0, 10) + "T00:00:00+07:00")
    : new Date();
  return d.toUTCString();
}

module.exports = async function handler(req, res) {
  const host = req.headers.host;
  try {
    const rows = await fetchArticles();

    const items = rows
      .filter(r => r.id && r.title)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 30)
      .map(r => {
        const link = `https://${host}/artikel/${encodeURIComponent(r.id)}`;
        const segmentName = SEGMENTS[r.segment] || r.segment || "Umum";
        return `  <item>
    <title>${escapeXml(r.title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <pubDate>${toRfc822(r.date)}</pubDate>
    <category>${escapeXml(segmentName)}</category>
    <description>${escapeXml(r.excerpt || "")}</description>
    ${r.authorname ? `<dc:creator>${escapeXml(r.authorname)}</dc:creator>` : ""}
  </item>`;
      }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Literaism</title>
  <link>https://${host}/</link>
  <atom:link href="https://${host}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Sastra, sejarah, dan budaya pop buat Gen Z — media dan blog literasi kontemporer.</description>
  <language>id-ID</language>
${items}
</channel>
</rss>`;

    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("feed error:", err);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Literaism</title>
  <link>https://${host}/</link>
  <description>Sastra, sejarah, dan budaya pop buat Gen Z.</description>
</channel></rss>`;
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    return res.status(200).send(fallback);
  }
};
