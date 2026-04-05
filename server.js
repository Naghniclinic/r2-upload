import express from "express";
import multer from "multer";
import cors from "cors";
import jwt from "jsonwebtoken";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";

const app = express();
const upload = multer();

const allowedOrigins = [
  "https://id-preview--4f008034-6312-4ab3-bab8-b03bb60c75a2.lovable.app",
  process.env.FRONTEND_PROD_ORIGIN
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = auth.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const key = `${crypto.randomUUID()}-${req.file.originalname}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));

    return res.json({
      success: true,
      key
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/file/:key", requireAuth, async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);

    const result = await s3.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key
    }));

    if (!result.Body) {
      return res.status(404).json({ error: "File not found" });
    }

    const filename = key.split("/").pop() || "file";

    res.setHeader("Content-Type", result.ContentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${filename.replace(/"/g, "")}"`);
    res.setHeader("Cache-Control", "private, max-age=900");

    if (result.ContentLength != null) {
      res.setHeader("Content-Length", String(result.ContentLength));
    }

    result.Body.pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).json({ error: "Download failed" });
  }
});

app.get("/", (_req, res) => {
  res.send("API running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
