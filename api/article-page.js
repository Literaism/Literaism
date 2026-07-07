// api/article-page.js
// Halaman artikel versi server-rendered — dipanggil lewat rewrite /artikel/:id di vercel.json.
// Tujuannya: Google & mesin pencari lain bisa lihat judul, deskripsi, dan isi tulisan
// yang BENERAN ada di HTML (bukan disuntik JS kayak versi SPA di index.html), jadi
// tiap artikel bisa keindeks sebagai halaman tersendiri, bukan cuma beranda doang.

const SEGMENTS = {
  "sastra": "Sastra",
  "sejarah": "Sejarah",
  "modern-culture": "Modern Culture",
  "film": "Film",
  "game": "Game",
  "musik": "Musik"
};

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[s]);
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function renderBody(paragraphs) {
  return paragraphs.map(raw => {
    const p = raw.trim();
    if (p.startsWith("### ")) {
      return `<h3 style="font-family:Georgia,serif;font-weight:800;font-size:1.3rem;margin:32px 0 14px;">${inlineMarkdown(p.slice(4))}</h3>`;
    }
    if (p.startsWith("## ")) {
      return `<h2 style="font-family:Georgia,serif;font-weight:800;font-size:1.7rem;margin:38px 0 16px;">${inlineMarkdown(p.slice(3))}</h2>`;
    }
    if (p.startsWith("> ")) {
      return `<blockquote style="margin:28px 0;padding:2px 0 2px 22px;border-left:3px solid #7a4f14;font-style:italic;font-size:1.15rem;color:#2b2318;">${inlineMarkdown(p.slice(2))}</blockquote>`;
    }
    const imgMatch = p.match(/^!\[(.*?)\]\((.+?)\)$/);
    if (imgMatch) {
      const caption = imgMatch[1] ? `<figcaption style="font-family:monospace;font-size:0.78rem;color:#6b6355;margin-top:8px;">${escapeHtml(imgMatch[1])}</figcaption>` : "";
      return `<figure style="margin:26px 0;"><img src="${escapeHtml(imgMatch[2])}" alt="${escapeHtml(imgMatch[1])}" style="width:100%;border-radius:8px;display:block;">${caption}</figure>`;
    }
    return `<p style="margin-bottom:20px;">${inlineMarkdown(p)}</p>`;
  }).join("");
}

function notFoundPage(res) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.end(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
<title>Artikel Tidak Ditemukan — Literaism</title>
<meta name="robots" content="noindex">
</head><body style="font-family:sans-serif;background:#f3ece1;color:#2b2318;padding:60px 24px;text-align:center;">
<h1>404</h1><p>Artikel ini nggak ketemu atau udah dihapus.</p>
<a href="/" style="color:#7a4f14;">← Kembali ke Literaism</a>
</body></html>`);
}

module.exports = async function handler(req, res) {
  const id = req.query.id;
  if (!id) return notFoundPage(res);

  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const apiRes = await fetch(`${protocol}://${host}/api/articles`);
    const rawRows = await apiRes.json();

    const rows = (Array.isArray(rawRows) ? rawRows : []).map(raw => {
      const row = {};
      Object.keys(raw).forEach(k => { row[k.trim().toLowerCase()] = raw[k]; });
      return row;
    });

    const article = rows.find(r => String(r.id) === String(id));
    if (!article || !article.title) return notFoundPage(res);

    const title = article.title;
    const excerpt = article.excerpt || "";
    const authorName = article.authorname || "Kontributor";
    const authorPhoto = article.authorphoto || "";
    const segmentKey = article.segment || "";
    const segmentName = SEGMENTS[segmentKey] || segmentKey || "Umum";
    const cover = article.cover || "";
    const readTime = article.readtime || 4;

    let dateVal = article.date || "";
    if (typeof dateVal === "string" && dateVal.includes("T")) dateVal = dateVal.slice(0, 10);
    const dparts = String(dateVal).split("-");
    const formattedDate = dparts.length === 3
      ? `${parseInt(dparts[2], 10)} ${BULAN[parseInt(dparts[1], 10) - 1] || ""} ${dparts[0]}`
      : String(dateVal);

    const paragraphs = String(article.paragraphs || "").split("|||").map(p => p.trim()).filter(Boolean);
    const bodyHtml = renderBody(paragraphs);
    const canonicalUrl = `https://${host}/artikel/${encodeURIComponent(id)}`;

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} — Literaism</title>
<meta name="description" content="${escapeHtml(excerpt)}">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Literaism">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(excerpt)}">
<meta property="og:url" content="${canonicalUrl}">
${cover ? `<meta property="og:image" content="${escapeHtml(cover)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(excerpt)}">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;800&family=Inter:wght@400;500;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;}
  body{background:#f3ece1;color:#2b2318;font-family:Inter,sans-serif;margin:0;line-height:1.65;-webkit-font-smoothing:antialiased;}
  a{color:inherit;}
  .wrap{max-width:720px;margin:0 auto;padding:36px 24px 100px;}
  .back-link{font-family:monospace;font-size:0.78rem;color:#6b6355;text-decoration:none;display:inline-block;margin-bottom:28px;}
  .back-link:hover{color:#7a4f14;}
  .eyebrow{font-family:monospace;font-size:0.76rem;text-transform:uppercase;letter-spacing:0.08em;color:#7a4f14;display:block;margin-bottom:14px;}
  h1{font-family:Fraunces,serif;font-weight:800;font-size:2rem;line-height:1.15;margin:0 0 22px;letter-spacing:-0.01em;}
  .byline{display:flex;align-items:center;gap:12px;padding:18px 0;border-top:1px solid rgba(28,22,16,0.12);border-bottom:1px solid rgba(28,22,16,0.12);margin-bottom:30px;}
  .byline img{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#e8ddc9;}
  .byline-name{font-weight:700;font-size:0.94rem;}
  .byline-meta{font-family:monospace;font-size:0.7rem;color:#6b6355;text-transform:uppercase;margin-top:2px;}
  .cover{width:100%;border-radius:10px;margin-bottom:30px;display:block;}
  .body-text{font-size:1.05rem;text-align:justify;}
  .body-text p:first-of-type::first-letter{font-family:Fraunces,serif;font-weight:800;font-size:3rem;float:left;line-height:0.8;padding:6px 8px 0 0;color:#7a4f14;}
  .cta{margin-top:56px;padding:26px;border:1px solid rgba(28,22,16,0.14);border-radius:12px;text-align:center;background:#fff;}
  .cta p{margin:0 0 14px;font-size:0.92rem;color:#6b6355;}
  .cta a{display:inline-block;background:#e8b923;color:#1c1610;font-weight:700;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:0.88rem;}
</style>
</head>
<body>
  <div class="wrap">
    <a class="back-link" href="/">← Kembali ke Beranda Literaism</a>
    <span class="eyebrow">${escapeHtml(segmentName)}</span>
    <h1>${escapeHtml(title)}</h1>
    <div class="byline">
      ${authorPhoto ? `<img src="${escapeHtml(authorPhoto)}" alt="${escapeHtml(authorName)}">` : ""}
      <div>
        <div class="byline-name">${escapeHtml(authorName)}</div>
        <div class="byline-meta">${escapeHtml(segmentName)} · ${escapeHtml(String(readTime))} menit baca · ${escapeHtml(formattedDate)}</div>
      </div>
    </div>
    ${cover ? `<img class="cover" src="${escapeHtml(cover)}" alt="${escapeHtml(title)}">` : ""}
    <div class="body-text">${bodyHtml}</div>
    <div class="cta">
      <p>Mau like, komentar, atau baca tulisan lain? Buka tampilan interaktif lengkapnya di Literaism.</p>
      <a href="/#artikel-${encodeURIComponent(id)}">Buka Tampilan Interaktif →</a>
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).send(html);
  } catch (err) {
    console.error("article-page error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end("<h1>Terjadi kesalahan</h1><p>Gagal memuat artikel. Coba refresh.</p>");
  }
};
