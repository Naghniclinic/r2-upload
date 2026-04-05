import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const app = express();
const upload = multer();

const s3 = new S3Client({
  region: "auto",
  endpoint: "https://5f38f21fd535e1c8161e2a1965e99cb6.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
});

app.get("/", (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; padding: 40px;">
        <h2>R2 Upload Test</h2>
        <form action="/upload" method="post" enctype="multipart/form-data">
          <input type="file" name="file" />
          <button type="submit">Upload</button>
        </form>
      </body>
    </html>
  `);
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const key = `${Date.now()}-${req.file.originalname}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: "naghini-storage",
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      })
    );

    const url = `https://pub-f58f4b291dc445b590ff93e74cfca7e1.r2.dev/${key}`;
    return res.json({ success: true, key, url });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).send(`Upload failed: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
