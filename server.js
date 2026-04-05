import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const app = express();
const upload = multer();

const s3 = new S3Client({
  region: "auto",
  endpoint: "https://5f38f21fd535e1c8161e2a1965e9c6b.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
});

const BUCKET = "naghini-storage";


// 🔐 AUTH SUPABASE
async function requireSupabaseAuth(req, res, next) {
  const auth = req.headers.authorization || "";

  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const jwt = auth.slice("Bearer ".length);

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`
      }
    });

    if (!response.ok) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await response.json();
    req.user = user;

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Auth validation failed" });
  }
}


// 📤 UPLOAD
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const key = `${Date.now()}-${req.file.originalname}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      })
    );

    return res.json({ success: true, key });

  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).send(`Upload failed: ${err.message}`);
  }
});


// 📥 DOWNLOAD AUTENTICADO
app.get("/download/:key", requireSupabaseAuth, async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);

    const result = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key
      })
    );

    if (result.ContentType) {
      res.setHeader("Content-Type", result.ContentType);
    }

    res.setHeader("Cache-Control", "private, max-age=60");

    if (!result.Body) {
      return res.status(404).json({ error: "File not found" });
    }

    result.Body.pipe(res);

  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).json({ error: "Download failed" });
  }
});


// 🌐 TESTE
app.get("/", (req, res) => {
  res.send("API running");
});


// 🚀 SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});nst PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
