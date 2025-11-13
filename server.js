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
    const templatesDir = path.resolve("template-files");
    if (!fs.existsSync(templatesDir)) {
        return res.json([]);
    }
    const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.pdf'));
    res.json(files);
});

app.get("/pdf-templates/:filename", (req, res) => {
    const filePath = path.resolve("template-files", req.params.filename);
    if (fs.existsSync(filePath)) res.sendFile(filePath);
    else res.status(404).send("Template not found");
});

app.get("/generated-pdf-files/list", (req, res) => {
    const templatesDir = path.resolve("generated-pdf-files");
    if (!fs.existsSync(templatesDir)) {
        return res.json([]);
    }
    const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.pdf'));
    res.json(files);
});

app.get("/generated-pdf-files/:filename", (req, res) => {
    const filePath = path.resolve("generated-pdf-files", req.params.filename);
    if (fs.existsSync(filePath)) res.sendFile(filePath);
    else res.status(404).send("Generated file not found");
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
    const { to, fields, from } = req.body;
    console.log('REQ BODY /create-config-file:', req.body);
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
        // Adiciona a informação do template original
        const configData = {
            derivedFrom: from || null,
            fields: fields
        };
        
        fs.writeFile(destPath, JSON.stringify(configData, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: "Erro ao salvar novo arquivo de configuração." });
            }
            return res.json({ success: true, saved: true, file: to });
        });
    } else {
        return res.status(400).json({ error: "Nome do arquivo e campos são obrigatórios." });
    }
});

// Criar novo template (upload PDF + config vazio)
app.post('/create-template', upload.single('pdf'), (req, res) => {
    const { templateName } = req.body;
    if (!req.file || !templateName) {
        return res.status(400).json({ error: 'Arquivo PDF e nome do template são obrigatórios.' });
    }
    const templatesDir = path.resolve('template-files');
    const configsDir = path.resolve('template-configs');
    if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
    if (!fs.existsSync(configsDir)) fs.mkdirSync(configsDir, { recursive: true });
    const pdfDest = path.join(templatesDir, templateName);
    const configDest = path.join(configsDir, templateName + '.json');
    try {
        // Move o PDF
        fs.copyFileSync(req.file.path, pdfDest);
        fs.unlinkSync(req.file.path);
        // Cria config vazio
        const configData = { fields: [] };
        fs.writeFileSync(configDest, JSON.stringify(configData, null, 2));
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: 'Erro ao salvar template.' });
    }
});

// Salvar PDF preenchido no servidor
app.post('/save-pdf', (req, res) => {
    const { filename, pdfData } = req.body;
    if (!filename || !pdfData) {
        return res.status(400).json({ error: "Nome do arquivo e dados do PDF são obrigatórios." });
    }
    const outputDir = path.resolve('generated-pdf-files');
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

// Sincronizar posições do arquivo original para o arquivo derivado atual
app.post('/sync-to-origin', (req, res) => {
    const { currentFile, derivedFrom, fields } = req.body;
    
    if (!derivedFrom) {
        return res.status(400).json({ error: "Este arquivo não tem origem definida (derivedFrom)." });
    }
    
    const configDir = path.resolve("template-configs");
    const originConfigPath = path.join(configDir, `${derivedFrom}.json`);
    const currentConfigPath = path.join(configDir, `${currentFile}.json`);
    
    // Verifica se o arquivo original existe
    if (!fs.existsSync(originConfigPath)) {
        return res.status(404).json({ error: `Arquivo de origem não encontrado: ${derivedFrom}.json` });
    }
    
    try {
        // Lê a configuração original
        const originConfig = JSON.parse(fs.readFileSync(originConfigPath, 'utf-8'));
        
        // Cria um mapa dos campos originais por nome
        const originFieldsMap = {};
        originConfig.fields.forEach(field => {
            originFieldsMap[field.name] = field;
        });
        
        // Atualiza apenas as posições dos campos correspondentes no arquivo atual
        let updatedCount = 0;
        fields.forEach(currentField => {
            const originField = originFieldsMap[currentField.name];
            if (originField) {
                // Atualiza apenas x, y, page, width, height, fontSize do original para o atual
                currentField.x = originField.x;
                currentField.y = originField.y;
                currentField.page = originField.page;
                if (originField.width !== undefined) currentField.width = originField.width;
                if (originField.height !== undefined) currentField.height = originField.height;
                if (originField.fontSize !== undefined) currentField.fontSize = originField.fontSize;
                updatedCount++;
            }
        });
        
        // Salva o arquivo atual atualizado (mantém derivedFrom e values atuais)
        const updatedConfig = {
            derivedFrom: derivedFrom,
            fields: fields
        };
        fs.writeFileSync(currentConfigPath, JSON.stringify(updatedConfig, null, 2));
        
        res.json({ 
            success: true, 
            message: `${updatedCount} campos sincronizados de ${derivedFrom}.json para ${currentFile}`,
            updatedCount 
        });
    } catch (error) {
        console.error('Erro ao sincronizar:', error);
        res.status(500).json({ error: "Erro ao processar sincronização." });
    }
});

// Clonar arquivo (PDF + config)
app.post('/clone-file', async (req, res) => {
    const { sourceFile, targetFile, sourceType } = req.body;
    
    if (!sourceFile || !targetFile) {
        return res.status(400).json({ error: "Nome do arquivo de origem e destino são obrigatórios." });
    }
    
    try {
        // Define os diretórios baseado no tipo de origem
        const sourcePdfDir = sourceType === 'generated' 
            ? path.resolve('generated-pdf-files')
            : path.resolve('template-files');
        const targetPdfDir = path.resolve('generated-pdf-files');
        const configDir = path.resolve('template-configs');
        
        // Paths dos arquivos
        const sourcePdfPath = path.join(sourcePdfDir, sourceFile);
        const targetPdfPath = path.join(targetPdfDir, targetFile);
        const sourceConfigPath = path.join(configDir, `${sourceFile}.json`);
        const targetConfigPath = path.join(configDir, `${targetFile}.json`);
        
        // Verifica se o PDF de origem existe
        if (!fs.existsSync(sourcePdfPath)) {
            return res.status(404).json({ error: `PDF de origem não encontrado: ${sourceFile}` });
        }
        
        // Cria os diretórios se não existirem
        if (!fs.existsSync(targetPdfDir)) {
            fs.mkdirSync(targetPdfDir, { recursive: true });
        }
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Copia o PDF
        fs.copyFileSync(sourcePdfPath, targetPdfPath);
        console.log(`PDF copiado: ${sourcePdfPath} -> ${targetPdfPath}`);
        
        // Copia ou cria o config
        if (fs.existsSync(sourceConfigPath)) {
            const sourceConfig = JSON.parse(fs.readFileSync(sourceConfigPath, 'utf-8'));
            
            // Mantém o derivedFrom original se existir, senão usa o sourceFile como origem
            const clonedConfig = {
                derivedFrom: sourceConfig.derivedFrom || sourceFile,
                fields: sourceConfig.fields || []
            };
            
            fs.writeFileSync(targetConfigPath, JSON.stringify(clonedConfig, null, 2));
            console.log(`Config copiado: ${sourceConfigPath} -> ${targetConfigPath}`);
        } else {
            // Se não tem config, cria um vazio mas com derivedFrom
            const newConfig = {
                derivedFrom: sourceFile,
                fields: []
            };
            fs.writeFileSync(targetConfigPath, JSON.stringify(newConfig, null, 2));
            console.log(`Config criado: ${targetConfigPath}`);
        }
        
        res.json({ 
            success: true, 
            message: `Arquivo clonado com sucesso: ${targetFile}`,
            sourcePdf: sourcePdfPath,
            targetPdf: targetPdfPath
        });
    } catch (error) {
        console.error('Erro ao clonar arquivo:', error);
        res.status(500).json({ error: `Erro ao clonar arquivo: ${error.message}` });
    }
});

// Renomear template do servidor (PDF + config)
app.post("/rename-template", (req, res) => {
    try {
        const { oldName, newName } = req.body;
        
        if (!oldName || !newName) {
            return res.status(400).json({ error: "oldName e newName são obrigatórios" });
        }
        
        // Paths dos arquivos antigos
        const oldPdfPath = path.resolve('template-files', oldName);
        const oldConfigPath = path.resolve('template-configs', `${oldName}.json`);
        
        // Paths dos arquivos novos
        const newPdfPath = path.resolve('template-files', newName);
        const newConfigPath = path.resolve('template-configs', `${newName}.json`);
        
        // Verifica se o arquivo antigo existe
        if (!fs.existsSync(oldPdfPath)) {
            return res.status(404).json({ error: `Template '${oldName}' não encontrado` });
        }
        
        // Verifica se o novo nome já existe
        if (fs.existsSync(newPdfPath)) {
            return res.status(409).json({ error: `Template '${newName}' já existe` });
        }
        
        // Renomeia o PDF
        fs.renameSync(oldPdfPath, newPdfPath);
        console.log(`PDF renomeado: ${oldName} -> ${newName}`);
        
        // Renomeia o config se existir
        if (fs.existsSync(oldConfigPath)) {
            fs.renameSync(oldConfigPath, newConfigPath);
            console.log(`Config renomeado: ${oldName}.json -> ${newName}.json`);
        }
        
        res.json({ 
            success: true, 
            message: `Template renomeado de '${oldName}' para '${newName}'`
        });
    } catch (error) {
        console.error('Erro ao renomear template:', error);
        res.status(500).json({ error: `Erro ao renomear template: ${error.message}` });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
