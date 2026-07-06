// api/upload-image.js
// Upload foto ke Vercel Blob Storage — hasilnya jadi URL di bawah domain Vercel sendiri
// (bukan domain pihak ketiga kayak ImgBB), jadi nggak berisiko diblokir ISP.
//
// Cara setup:
// 1. Buka dashboard Vercel → project kamu → tab "Storage" → Create Database → pilih "Blob"
// 2. Connect Blob store itu ke project kamu (Vercel otomatis nambahin env var yang dibutuhkan)
// 3. Di folder project (lokal), jalankan: npm install @vercel/blob
// 4. Deploy ulang (vercel --prod)

const { put } = require("@vercel/blob");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({ success: false, error: "Field 'image' kosong" });
    }

    const matches = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ success: false, error: "Format gambar nggak valid (harus data URL base64)" });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    const ext = mimeType.split("/")[1] || "jpg";
    const filename = "literaism-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;

    const blob = await put(filename, buffer, {
      access: "public",
      contentType: mimeType
    });

    return res.status(200).json({ success: true, url: blob.url });
  } catch (err) {
    console.error("Vercel Blob upload error:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
};
