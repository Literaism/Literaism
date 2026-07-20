// api/sitemap.js
// Sitemap dinamis — dipanggil lewat rewrite /sitemap.xml di vercel.json.
// Sekarang ambil data langsung lewat api/_lib/sheet.js (nggak fetch balik ke
// /api/articles lewat HTTP lagi), biar lebih cepat & nggak gampang timeout
// pas dicek Google Search Console.

const { fetchArticles } = require("./_lib/sheet");

const SEGMENT_KEYS = ["sastra", "sejarah", "modern-culture", "film", "game", "musik"];

module.exports = async function handler(req, res) {
  const host = req.headers.host;
  try {
    const rows = await fetchArticles();
    const ids = rows.map(r => r.id).filter(Boolean);

    const articleUrls = ids.map(id => `  <url>
    <loc>https://${host}/artikel/${encodeURIComponent(id)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n");

    const categoryUrls = SEGMENT_KEYS.map(key => `  <url>
    <loc>https://${host}/kategori/${key}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${host}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${categoryUrls}
${articleUrls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("sitemap error:", err);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${host}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    return res.status(200).send(fallback);
  }
};
