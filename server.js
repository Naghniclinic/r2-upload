import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

app.get("/", (req, res) => {
  res.send("R2 upload API is running");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: "naghini-storage",
        Key: req.file.originalname,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      })
    );

    return res.json({
      success: true,
      filename: req.file.originalname
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
