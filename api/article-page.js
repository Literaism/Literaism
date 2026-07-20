// api/article-page.js
// Halaman artikel LENGKAP untuk /artikel/:id (lihat vercel.json).
// Isi tulisan di-render di server (jadi Google & mesin pencari bisa baca
// langsung tanpa jalanin JS), DITAMBAH fitur interaktif (like, komentar,
// share, sitasi APA) yang aktif lewat script kecil di bagian bawah halaman.
//
// Like & komentar disimpan di localStorage (per-browser pengunjung) — belum
// ada backend komentar bersama. Kalau nanti mau semua pengunjung lihat
// komentar yang sama, perlu ditambah kolom/sheet baru buat komentar.

const { fetchArticles } = require("./_lib/sheet");

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

function escapeJs(str) {
  return String(str == null ? "" : str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
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
      return `<h3 class="subhead">${inlineMarkdown(p.slice(4))}</h3>`;
    }
    if (p.startsWith("## ")) {
      return `<h2 class="subhead-lg">${inlineMarkdown(p.slice(3))}</h2>`;
    }
    if (p.startsWith("> ")) {
      return `<blockquote class="quote">${inlineMarkdown(p.slice(2))}</blockquote>`;
    }
    const imgMatch = p.match(/^!\[(.*?)\]\((.+?)\)$/);
    if (imgMatch) {
      const caption = imgMatch[1] ? `<figcaption>${escapeHtml(imgMatch[1])}</figcaption>` : "";
      return `<figure class="inline-image"><img src="${escapeHtml(imgMatch[2])}" alt="${escapeHtml(imgMatch[1])}" loading="lazy">${caption}</figure>`;
    }
    return `<p>${inlineMarkdown(p)}</p>`;
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
    const host = req.headers.host;
    const rows = await fetchArticles();
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
    const year = dparts[0] || new Date().getFullYear();

    const paragraphs = String(article.paragraphs || "").split("|||").map(p => p.trim()).filter(Boolean);
    const bodyHtml = renderBody(paragraphs);
    const canonicalUrl = `https://${host}/artikel/${encodeURIComponent(id)}`;
    const citationText = `${authorName}. (${year}). ${title}. Literaism. ${canonicalUrl}`;

    // Tulisan lain buat rekomendasi bawah (acak, exclude tulisan ini sendiri)
    const others = rows
      .filter(r => r.id && r.id !== id && r.title)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const othersHtml = others.map(o => {
      const oSeg = SEGMENTS[o.segment] || o.segment || "Umum";
      return `<a class="other-card" href="/artikel/${encodeURIComponent(o.id)}">
        <div class="other-thumb"><img src="${escapeHtml(o.cover || "")}" alt="" loading="lazy"></div>
        <div class="other-tag">${escapeHtml(oSeg)}</div>
        <div class="other-title">${escapeHtml(o.title)}</div>
      </a>`;
    }).join("");

    const waText = encodeURIComponent(`${title} — ${canonicalUrl}`);
    const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`;

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
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": title,
  "description": excerpt,
  "image": cover ? [cover] : undefined,
  "datePublished": /^\d{4}-\d{2}-\d{2}$/.test(String(dateVal)) ? `${dateVal}T00:00:00+07:00` : undefined,
  "author": { "@type": "Person", "name": authorName },
  "publisher": {
    "@type": "Organization",
    "name": "Literaism",
    "logo": { "@type": "ImageObject", "url": `https://${host}/assets/logo.png` }
  },
  "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl },
  "articleSection": segmentName
})}
</script>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;800&family=Inter:wght@400;500;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;}
  body{background:#f3ece1;color:#2b2318;font-family:Inter,sans-serif;margin:0;line-height:1.65;-webkit-font-smoothing:antialiased;}
  a{color:inherit;}
  .wrap{max-width:720px;margin:0 auto;padding:28px 24px 100px;}
  header.site-header{border-bottom:1px solid rgba(28,22,16,0.12);margin-bottom:8px;}
  header.site-header .inner{max-width:720px;margin:0 auto;padding:16px 24px;}
  .logo{font-family:Fraunces,serif;font-style:italic;font-weight:600;font-size:1.3rem;text-decoration:none;}
  .logo span{color:#e8b923;font-style:normal;}
  .back-link{font-family:"Space Mono",monospace;font-size:0.78rem;color:#6b6355;text-decoration:none;display:inline-block;margin:24px 0;}
  .back-link:hover{color:#7a4f14;}
  .eyebrow{font-family:"Space Mono",monospace;font-size:0.76rem;text-transform:uppercase;letter-spacing:0.08em;color:#7a4f14;display:block;margin-bottom:14px;text-decoration:none;}
  h1{font-family:Fraunces,serif;font-weight:800;font-size:2rem;line-height:1.15;margin:0 0 22px;letter-spacing:-0.01em;}
  .byline{display:flex;align-items:center;gap:12px;padding:18px 0;border-top:1px solid rgba(28,22,16,0.12);border-bottom:1px solid rgba(28,22,16,0.12);margin-bottom:18px;}
  .byline img{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#e8ddc9;}
  .byline-name{font-weight:700;font-size:0.94rem;}
  .byline-meta{font-family:"Space Mono",monospace;font-size:0.7rem;color:#6b6355;text-transform:uppercase;margin-top:2px;}
  .action-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:30px;}
  .btn{font-family:"Space Mono",monospace;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;border:1px solid rgba(28,22,16,0.25);color:#2b2318;padding:8px 14px;background:#fff;text-decoration:none;cursor:pointer;border-radius:4px;display:inline-block;}
  .btn:hover{border-color:#7a4f14;color:#7a4f14;}
  .citation-box{display:none;margin:-14px 0 30px;padding:16px;border:1px dashed rgba(28,22,16,0.3);font-family:"Space Mono",monospace;font-size:0.8rem;background:#fff;border-radius:6px;}
  .citation-box p{margin:0 0 10px;word-break:break-word;}
  .cover{width:100%;border-radius:10px;margin-bottom:30px;display:block;}
  .body-text{font-size:1.05rem;text-align:justify;}
  .body-text p{margin-bottom:20px;}
  .body-text p:first-of-type::first-letter{font-family:Fraunces,serif;font-weight:800;font-size:3rem;float:left;line-height:0.8;padding:6px 8px 0 0;color:#7a4f14;}
  .subhead{font-family:Fraunces,serif;font-weight:800;font-size:1.3rem;margin:32px 0 14px;}
  .subhead-lg{font-family:Fraunces,serif;font-weight:800;font-size:1.7rem;margin:38px 0 16px;}
  .quote{margin:28px 0;padding:2px 0 2px 22px;border-left:3px solid #7a4f14;font-style:italic;font-size:1.15rem;}
  .inline-image{margin:26px 0;}
  .inline-image img{width:100%;border-radius:8px;display:block;}
  .inline-image figcaption{font-family:"Space Mono",monospace;font-size:0.78rem;color:#6b6355;margin-top:8px;}
  .engagement{margin-top:48px;padding-top:32px;border-top:1px solid rgba(28,22,16,0.12);}
  .like-btn{font-family:"Space Mono",monospace;font-size:0.8rem;text-transform:uppercase;background:#fff;border:1px solid rgba(28,22,16,0.25);color:#2b2318;padding:10px 16px;cursor:pointer;border-radius:4px;}
  .like-btn.liked{background:#8a3521;border-color:#8a3521;color:#fff;}
  .comments{margin-top:32px;}
  .comments h4{font-family:Fraunces,serif;font-weight:800;font-size:1.15rem;margin-bottom:16px;}
  .comment-form{display:flex;flex-direction:column;gap:10px;margin-bottom:24px;max-width:480px;}
  .comment-form input,.comment-form textarea{background:#fff;border:1px solid rgba(28,22,16,0.25);color:#2b2318;font-family:Inter,sans-serif;font-size:0.9rem;padding:11px;border-radius:4px;}
  .comment-form textarea{min-height:76px;resize:vertical;}
  .comment-list{display:flex;flex-direction:column;gap:14px;}
  .comment-item{padding:14px;background:#fff;border-left:2px solid #8a3521;border-radius:4px;}
  .comment-item strong{display:block;font-size:0.88rem;margin-bottom:4px;}
  .comment-item p{margin:0;font-size:0.88rem;color:#6b6355;}
  .empty-note{font-family:"Space Mono",monospace;font-size:0.82rem;color:#6b6355;}
  .other-reads{margin-top:56px;padding-top:36px;border-top:1px solid rgba(28,22,16,0.12);}
  .other-reads h3{font-family:Fraunces,serif;font-weight:800;font-size:1.3rem;margin-bottom:20px;}
  .other-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
  .other-card{display:block;text-decoration:none;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 8px 18px -10px rgba(0,0,0,0.3);}
  .other-thumb{aspect-ratio:16/10;background:#e8ddc9;}
  .other-thumb img{width:100%;height:100%;object-fit:cover;}
  .other-tag{font-family:"Space Mono",monospace;font-size:0.62rem;text-transform:uppercase;color:#8a3521;padding:10px 10px 0;}
  .other-title{font-family:Fraunces,serif;font-weight:700;font-size:0.86rem;padding:4px 10px 12px;line-height:1.3;}
  @media (max-width:600px){ .other-grid{grid-template-columns:1fr;} }
</style>
</head>
<body>
  <header class="site-header">
    <div class="inner"><a class="logo" href="/">Litera<span>ism</span></a></div>
  </header>
  <div class="wrap">
    <a class="back-link" href="/">← Kembali ke Beranda Literaism</a>
    <a class="eyebrow" href="/kategori/${segmentKey}">${escapeHtml(segmentName)}</a>
    <h1>${escapeHtml(title)}</h1>
    <div class="byline">
      ${authorPhoto ? `<img src="${escapeHtml(authorPhoto)}" alt="${escapeHtml(authorName)}">` : ""}
      <div>
        <div class="byline-name">${escapeHtml(authorName)}</div>
        <div class="byline-meta">${escapeHtml(segmentName)} · ${escapeHtml(String(readTime))} menit baca · ${escapeHtml(formattedDate)}</div>
      </div>
    </div>

    <div class="action-row">
      <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${waText}">WhatsApp</a>
      <button class="btn" onclick="shareInstagramStory()">IG Story</button>
      <a class="btn" target="_blank" rel="noopener" href="${fbShare}">Facebook</a>
      <button class="btn" onclick="toggleCitation()">Sitasi (APA)</button>
    </div>
    <div class="citation-box" id="citation-box">
      <p id="citation-text">${escapeHtml(citationText)}</p>
      <button class="btn" onclick="copyCitation()">Salin Sitasi</button>
    </div>

    ${cover ? `<img class="cover" src="${escapeHtml(cover)}" alt="${escapeHtml(title)}">` : ""}
    <div class="body-text">${bodyHtml}</div>

    <div class="engagement">
      <button class="like-btn" id="like-btn" onclick="toggleLike()">♡ <span id="like-count">0</span> Suka</button>
      <div class="comments">
        <h4>Komentar (<span id="comment-count">0</span>)</h4>
        <form class="comment-form" onsubmit="event.preventDefault(); addComment();">
          <input type="text" id="comment-name" placeholder="Nama kamu" required>
          <textarea id="comment-text" placeholder="Tulis pendapat kamu soal tulisan ini..." required></textarea>
          <button type="submit" class="btn">Kirim Komentar</button>
        </form>
        <div class="comment-list" id="comment-list"></div>
      </div>
    </div>

    ${others.length ? `<div class="other-reads">
      <h3>Baca Tulisan Kami Lainnya</h3>
      <div class="other-grid">${othersHtml}</div>
    </div>` : ""}
  </div>

<script>
(function(){
  var ARTICLE_ID = '${escapeJs(id)}';
  var STORAGE_KEY = 'literaism_engagement_' + ARTICLE_ID;

  function getEngagement(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { likes: 0, liked: false, comments: [] };
    } catch(e) { return { likes: 0, liked: false, comments: [] }; }
  }
  function saveEngagement(data){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
  }
  function escapeHtmlClient(str){
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }
  function renderEngagement(){
    var e = getEngagement();
    document.getElementById('like-count').textContent = e.likes;
    document.getElementById('like-btn').classList.toggle('liked', e.liked);
    document.getElementById('comment-count').textContent = e.comments.length;
    var list = document.getElementById('comment-list');
    list.innerHTML = e.comments.length
      ? e.comments.map(function(c){
          return '<div class="comment-item"><strong>' + escapeHtmlClient(c.name) + '</strong><p>' + escapeHtmlClient(c.text) + '</p></div>';
        }).join('')
      : '<p class="empty-note">Belum ada komentar. Jadi yang pertama!</p>';
  }
  window.toggleLike = function(){
    var e = getEngagement();
    e.liked = !e.liked;
    e.likes += e.liked ? 1 : -1;
    saveEngagement(e);
    renderEngagement();
  };
  window.addComment = function(){
    var nameEl = document.getElementById('comment-name');
    var textEl = document.getElementById('comment-text');
    var name = nameEl.value.trim();
    var text = textEl.value.trim();
    if(!name || !text) return;
    var e = getEngagement();
    e.comments.push({ name: name, text: text });
    saveEngagement(e);
    nameEl.value = '';
    textEl.value = '';
    renderEngagement();
  };
  window.toggleCitation = function(){
    var box = document.getElementById('citation-box');
    box.style.display = box.style.display === 'none' || !box.style.display ? 'block' : 'none';
  };
  window.copyCitation = function(){
    var text = document.getElementById('citation-text').textContent;
    navigator.clipboard.writeText(text).then(function(){ alert('Sitasi disalin ke clipboard!'); });
  };
  window.shareInstagramStory = function(){
    var url = location.href;
    var W = 1080, H = 1920;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');

    function drawAndShare(coverImg){
      var grad = ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0, '#14192b');
      grad.addColorStop(1, '#0b0e19');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,W,H);

      if(coverImg){
        var coverH = H * 0.58;
        var scale = Math.max(W / coverImg.width, coverH / coverImg.height);
        var drawW = coverImg.width * scale, drawH = coverImg.height * scale;
        var dx = (W - drawW) / 2, dy = (coverH - drawH) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0,0,W,coverH);
        ctx.clip();
        ctx.drawImage(coverImg, dx, dy, drawW, drawH);
        ctx.restore();
        var overlay = ctx.createLinearGradient(0, coverH*0.4, 0, coverH);
        overlay.addColorStop(0, 'rgba(11,14,25,0)');
        overlay.addColorStop(1, 'rgba(11,14,25,1)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0,0,W,coverH);
      }

      var padX = 80, y = H * 0.66;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#e8b923';
      ctx.font = '700 34px Inter, sans-serif';
      ctx.fillText('${escapeJs(segmentName.toUpperCase())}', padX, y);
      y += 60;

      ctx.fillStyle = '#f6f1e4';
      ctx.font = '800 62px Inter, sans-serif';
      var maxWidth = W - padX*2;
      var words = '${escapeJs(title)}'.split(' ');
      var line = '', lines = [];
      words.forEach(function(word){
        var test = line ? line + ' ' + word : word;
        if(ctx.measureText(test).width > maxWidth && line){ lines.push(line); line = word; }
        else { line = test; }
      });
      if(line) lines.push(line);
      lines.slice(0,4).forEach(function(l){ ctx.fillText(l, padX, y); y += 74; });

      y += 30;
      ctx.font = '600 34px Inter, sans-serif';
      ctx.fillStyle = '#8892b0';
      ctx.fillText('oleh ${escapeJs(authorName)}', padX, y);

      ctx.font = 'italic 700 44px Inter, sans-serif';
      ctx.fillStyle = '#f6f1e4';
      ctx.fillText('Literaism', padX, H - 120);

      canvas.toBlob(function(blob){
        if(!blob) return;
        var file = new File([blob], 'literaism-story.jpg', { type: 'image/jpeg' });
        if(navigator.canShare && navigator.canShare({ files: [file] })){
          navigator.share({ files: [file], title: '${escapeJs(title)}', text: '${escapeJs(title)} — Literaism' }).catch(function(){});
          return;
        }
        var dlUrl = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = dlUrl; a.download = 'literaism-story.jpg';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(dlUrl);
        navigator.clipboard.writeText(url).catch(function(){});
        alert('Gambar Story ke-download! Buka Instagram, Story baru, upload gambar ini. Link tulisan juga udah disalin.');
      }, 'image/jpeg', 0.92);
    }

    var coverUrl = '${escapeJs(cover)}';
    if(coverUrl){
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function(){ drawAndShare(img); };
      img.onerror = function(){ drawAndShare(null); };
      img.src = coverUrl;
    } else {
      drawAndShare(null);
    }
  };

  renderEngagement();
})();
</script>
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
