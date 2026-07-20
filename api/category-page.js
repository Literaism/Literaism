// api/category-page.js
// Halaman kategori/segmen server-rendered untuk /kategori/:key (lihat vercel.json).
// Isinya daftar artikel per segmen, dirender di server biar Google bisa
// nge-index tiap kategori sebagai halaman tersendiri (bukan cuma lewat SPA hash-route).

const { fetchArticles } = require("./_lib/sheet");

const SEGMENTS = {
  "sastra": { name: "Sastra", desc: "Review, kajian, dan analisis novel, cerpen, maupun puisi." },
  "sejarah": { name: "Sejarah", desc: "Tulisan mengenai sejarah Eropa, Indonesia, Amerika, dan lainnya." },
  "modern-culture": { name: "Modern Culture", desc: "Tulisan mengenai fenomena sosial, isu Gen Z, dan pop culture." },
  "film": { name: "Film", desc: "Review film/series, analisis atau kajian film." },
  "game": { name: "Game", desc: "Ulasan rekomendasi game, sejarah game, dan seputar game terbaru." },
  "musik": { name: "Musik", desc: "Ulasan band-band, genre, lagu, lirik-lirik, dan lainnya." }
};

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[s]);
}

function formatDate(dateVal) {
  const parts = String(dateVal || "").slice(0, 10).split("-");
  if (parts.length !== 3) return String(dateVal || "");
  return `${parseInt(parts[2], 10)} ${BULAN[parseInt(parts[1], 10) - 1] || ""} ${parts[0]}`;
}

function notFoundPage(res) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.end(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
<title>Kategori Tidak Ditemukan — Literaism</title>
<meta name="robots" content="noindex">
</head><body style="font-family:sans-serif;background:#f3ece1;color:#2b2318;padding:60px 24px;text-align:center;">
<h1>404</h1><p>Kategori ini nggak ketemu.</p>
<a href="/" style="color:#7a4f14;">← Kembali ke Literaism</a>
</body></html>`);
}

module.exports = async function handler(req, res) {
  const key = req.query.key;
  const segment = SEGMENTS[key];
  if (!key || !segment) return notFoundPage(res);

  try {
    const host = req.headers.host;
    const rows = await fetchArticles();
    const articles = rows
      .filter(r => r.id && r.title && r.segment === key)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const canonicalUrl = `https://${host}/kategori/${key}`;
    const title = `${segment.name} — Literaism`;
    const description = segment.desc;

    const cardsHtml = articles.map(a => {
      return `<a class="card" href="/artikel/${encodeURIComponent(a.id)}">
        <div class="card-thumb"><img src="${escapeHtml(a.cover || "")}" alt="" loading="lazy"></div>
        <div class="card-body">
          <span class="card-tag">${escapeHtml(segment.name)}</span>
          <h2 class="card-title">${escapeHtml(a.title)}</h2>
          <p class="card-excerpt">${escapeHtml(a.excerpt || "")}</p>
          <div class="card-meta">${escapeHtml(a.authorname || "Kontributor")} · ${escapeHtml(formatDate(a.date))}</div>
        </div>
      </a>`;
    }).join("\n");

    const itemListLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `${segment.name} — Literaism`,
      "itemListElement": articles.slice(0, 20).map((a, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `https://${host}/artikel/${encodeURIComponent(a.id)}`,
        "name": a.title
      }))
    };

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Literaism">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonicalUrl}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<script type="application/ld+json">${JSON.stringify(itemListLd)}</script>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;800&family=Inter:wght@400;500;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;}
  body{background:#f3ece1;color:#2b2318;font-family:Inter,sans-serif;margin:0;line-height:1.6;-webkit-font-smoothing:antialiased;}
  a{color:inherit;text-decoration:none;}
  .wrap{max-width:1040px;margin:0 auto;padding:28px 24px 100px;}
  header.site-header{border-bottom:1px solid rgba(28,22,16,0.12);margin-bottom:8px;}
  header.site-header .inner{max-width:1040px;margin:0 auto;padding:16px 24px;}
  .logo{font-family:Fraunces,serif;font-style:italic;font-weight:600;font-size:1.3rem;}
  .logo span{color:#e8b923;font-style:normal;}
  .back-link{font-family:"Space Mono",monospace;font-size:0.78rem;color:#6b6355;display:inline-block;margin:24px 0 8px;}
  .back-link:hover{color:#7a4f14;}
  h1{font-family:Fraunces,serif;font-weight:800;font-size:2.2rem;margin:0 0 10px;letter-spacing:-0.01em;}
  .desc{font-size:1rem;color:#6b6355;max-width:60ch;margin-bottom:36px;}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
  .card{display:block;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 18px -10px rgba(0,0,0,0.25);}
  .card-thumb{aspect-ratio:16/10;background:#e8ddc9;}
  .card-thumb img{width:100%;height:100%;object-fit:cover;}
  .card-body{padding:14px 16px 18px;}
  .card-tag{font-family:"Space Mono",monospace;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.04em;color:#8a3521;}
  .card-title{font-family:Fraunces,serif;font-weight:700;font-size:1.05rem;margin:6px 0;line-height:1.3;}
  .card-excerpt{font-size:0.85rem;color:#6b6355;margin:0 0 10px;}
  .card-meta{font-family:"Space Mono",monospace;font-size:0.7rem;color:#8a7f6a;}
  .empty-note{font-family:"Space Mono",monospace;font-size:0.9rem;color:#6b6355;}
  @media (max-width:860px){ .grid{grid-template-columns:repeat(2,1fr);} }
  @media (max-width:560px){ .grid{grid-template-columns:1fr;} }
</style>
</head>
<body>
  <header class="site-header">
    <div class="inner"><a class="logo" href="/">Litera<span>ism</span></a></div>
  </header>
  <div class="wrap">
    <a class="back-link" href="/">← Kembali ke Beranda Literaism</a>
    <h1>${escapeHtml(segment.name)}</h1>
    <p class="desc">${escapeHtml(segment.desc)}</p>
    ${articles.length
      ? `<div class="grid">${cardsHtml}</div>`
      : `<p class="empty-note">Belum ada tulisan di kategori ini. Cek lagi minggu depan!</p>`}
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    return res.status(200).send(html);
  } catch (err) {
    console.error("category-page error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end("<h1>Terjadi kesalahan</h1><p>Gagal memuat kategori. Coba refresh.</p>");
  }
};
