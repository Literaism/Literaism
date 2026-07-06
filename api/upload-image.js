// api/upload-image.js
// Proxy upload foto ke ImgBB (hosting gambar gratis) — API key disimpan aman di server,
// nggak pernah kelihatan di kode publik. Frontend cuma kirim base64, dapat balik URL pendek.
//
// Cara setup:
// 1. Daftar gratis di https://api.imgbb.com/ (cukup email, nggak perlu kartu kredit)
// 2. Copy API key yang dikasih
// 3. Ganti IMGBB_KEY di bawah ini dengan API key kamu
// 4. Deploy ulang ke Vercel

const IMGBB_KEY = "GANTI_DENGAN_API_KEY_IMGBB_LO";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!IMGBB_KEY || IMGBB_KEY.startsWith("GANTI")) {
    return res.status(503).json({ success: false, error: "IMGBB_KEY belum diisi di api/upload-image.js" });
  }

  try {
    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({ success: false, error: "Field 'image' kosong" });
    }

    // ImgBB minta base64 tanpa prefix "data:image/...;base64,"
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const params = new URLSearchParams();
    params.append("key", IMGBB_KEY);
    params.append("image", base64Data);

    const uploadRes = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: params
    });
    const data = await uploadRes.json();

    if (data && data.success && data.data && data.data.url) {
      return res.status(200).json({ success: true, url: data.data.url });
    }

    console.error("ImgBB gagal:", data);
    return res.status(500).json({ success: false, error: data });
  } catch (err) {
    console.error("Upload proxy error:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
};
