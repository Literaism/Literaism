// api/sitemap.js
// Sitemap dinamis — dipanggil lewat rewrite /sitemap.xml di vercel.json.
// Beda dari sitemap.xml statis, ini otomatis nambahin URL tiap artikel yang
// dipublish lewat halaman #editor, tanpa perlu diedit manual tiap ada tulisan baru.

module.exports = async function handler(req, res) {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const apiRes = await fetch(`${protocol}://${host}/api/articles`);
    const rawRows = await apiRes.json();

    const ids = (Array.isArray(rawRows) ? rawRows : [])
      .map(raw => {
        const row = {};
        Object.keys(raw).forEach(k => { row[k.trim().toLowerCase()] = raw[k]; });
        return row.id;
      })
      .filter(Boolean);

    const articleUrls = ids.map(id => `  <url>
    <loc>https://${host}/artikel/${encodeURIComponent(id)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${host}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${articleUrls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("sitemap error:", err);
    // Kalau gagal ambil data artikel, tetap kasih sitemap minimal (beranda doang)
    // biar Search Console nggak error total.
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${req.headers.host}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    return res.status(200).send(fallback);
  }
};
