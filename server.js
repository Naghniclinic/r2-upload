server.js
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
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    await s3.send(
      new PutObjectCommand({
        Bucket: "naghini-storage",
        Key: file.originalname,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.listen(3000, () => console.log("Running"));
