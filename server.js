import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use(express.json());

app.post("/upload", upload.single("pdf"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");
  res.json({ filename: req.file.filename, original: req.file.originalname });
});

app.get("/pdf/:filename", (req, res) => {
  const filePath = path.resolve("uploads", req.params.filename);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send("File not found");
});

app.get("/pdf-templates/list", (req, res) => {
  const templatesDir = path.resolve("pdf-files");
  if (!fs.existsSync(templatesDir)) {
    return res.json([]);
  }
  const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.pdf'));
  res.json(files);
});

app.get("/pdf-templates/:filename", (req, res) => {
  const filePath = path.resolve("pdf-files", req.params.filename);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send("Template not found");
});

// Get template configuration
app.get("/template-config/:templateName", (req, res) => {
  const configPath = path.resolve("template-configs", `${req.params.templateName}.json`);
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    res.json(config);
  } else {
    res.json({ fields: [] }); // Return empty config if none exists
  }
});

// Save template configuration
app.post("/template-config/:templateName", (req, res) => {
  const configDir = path.resolve("template-configs");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const configPath = path.resolve(configDir, `${req.params.templateName}.json`);
  fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
