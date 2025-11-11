import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use(express.json({ limit: '50mb' })); // Aumenta limite para aceitar PDFs grandes
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Copiar configuração de template para novo nome
app.post("/create-config-file", (req, res) => {
    const { to, fields } = req.body;
    console.log('REQ BODY /template-config/create:', req.body);
    const configDir = path.resolve("template-configs");
    // Verifica se o campo 'to' é válido
    if (!to || typeof to !== 'string' || !to.endsWith('.json')) {
        return res.status(400).json({ error: "O campo 'to' deve ser um nome de arquivo válido terminando com .json." });
    }
    const destPath = path.join(configDir, to);

    // Garante que o diretório existe
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    if (fields && Array.isArray(fields)) {
        fs.writeFile(destPath, JSON.stringify({ fields }, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: "Erro ao salvar novo arquivo de configuração." });
        }
        return res.json({ success: true, saved: true, file: to });
        });
    } else {
        return res.status(400).json({ error: "Nome do arquivo e campos são obrigatórios." });
    }
});

// Salvar PDF preenchido no servidor
app.post('/save-pdf', (req, res) => {
    const { filename, pdfData } = req.body;
    if (!filename || !pdfData) {
        return res.status(400).json({ error: "Nome do arquivo e dados do PDF são obrigatórios." });
    }
    const outputDir = path.resolve('generated-pdfs');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(outputDir, filename);
    const buffer = Buffer.from(pdfData);
    fs.writeFile(filePath, buffer, (err) => {
        if (err) {
            return res.status(500).json({ error: "Erro ao salvar PDF no servidor." });
        }
        return res.json({ success: true, path: filePath, message: `PDF salvo em: ${filePath}` });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
