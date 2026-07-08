// api/_lib/sheet.js
// Helper bersama buat ambil data artikel LANGSUNG dari Google Apps Script.
// Dipakai oleh api/articles.js, api/sitemap.js, dan api/article-page.js.
//
// PENTING: file yang diawali underscore (_lib) di dalam folder api/ TIDAK
// dianggap route/endpoint sendiri oleh Vercel — aman dipakai sebagai modul
// biasa yang di-require oleh file lain di folder api/.
//
// Kenapa disatuin di sini? Supaya sitemap.js dan article-page.js nggak perlu
// "manggil balik" endpoint /api/articles lewat HTTP (yang nambahin loncatan,
// bikin lambat, dan kadang timeout pas dicek Google Search Console).

const APPS_SCRIPT_URL = "GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT_LO";

async function fetchRawRows() {
  const res = await fetch(APPS_SCRIPT_URL);
  return res.json();
}

// Baris mentah dari Sheet, dengan nama kolom dinormalisasi jadi huruf kecil
// semua (biar "authorName" atau "AuthorName" dsb tetap kebaca konsisten).
async function fetchArticles() {
  const rawRows = await fetchRawRows();
  return (Array.isArray(rawRows) ? rawRows : []).map(raw => {
    const row = {};
    Object.keys(raw).forEach(k => { row[k.trim().toLowerCase()] = raw[k]; });
    return row;
  });
}

module.exports = { fetchRawRows, fetchArticles, APPS_SCRIPT_URL };
