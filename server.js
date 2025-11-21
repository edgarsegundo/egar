import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { openai } from './openai-client.js'; // adjust path as needed
import dotenv from "dotenv";
import { extractFields } from "./pdf-fields-extractor.js";

// 🔧 Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// 🔒 Verifica se está em modo PRODUÇÃO
const IS_PRODUCTION = process.env.PROD === 'true';
console.log(`🔒 Modo de proteção: ${IS_PRODUCTION ? 'PRODUÇÃO (proteções ATIVAS)' : 'DESENVOLVIMENTO (proteções DESATIVADAS)'}`);

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use(express.json({ limit: '50mb' })); // Aumenta limite para aceitar PDFs grandes
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 🔒 LISTA NEGRA - Templates protegidos do servidor que não podem ser excluídos ou renomeados
const PROTECTED_SERVER_TEMPLATES = [
    'FormMexico.pdf',
    'FormMexicod.pdf',
    // Adicione aqui outros templates críticos que devem ser protegidos
];

// 🔒 Middleware para verificar se um template do servidor está protegido
function isServerTemplateProtected(filename) {
    // 🔓 BYPASS: Se não estiver em produção, permite tudo
    if (!IS_PRODUCTION) {
        return {
            isProtected: false,
            existsInServer: false,
            isInBlacklist: false
        };
    }
    
    // Verifica se o arquivo existe na pasta template-files (servidor)
    const serverTemplatePath = path.resolve('template-files', filename);
    const existsInServer = fs.existsSync(serverTemplatePath);
    
    // Verifica se está na lista negra
    const isInBlacklist = PROTECTED_SERVER_TEMPLATES.includes(filename);
    
    return {
        isProtected: existsInServer || isInBlacklist,
        existsInServer,
        isInBlacklist
    };
}

app.post("/api/upload", upload.single("pdf"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");
  res.json({ filename: req.file.filename, original: req.file.originalname });
});

app.get("/api/pdf/:filename", (req, res) => {
    const filePath = path.resolve("uploads", req.params.filename);
    if (fs.existsSync(filePath)) res.sendFile(filePath);
    else res.status(404).send("File not found");
});

app.get("/api/pdf-templates/list", (req, res) => {
    const templatesDir = path.resolve("template-files");
    if (!fs.existsSync(templatesDir)) {
        return res.json([]);
    }
    const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.pdf'));
    res.json(files);
});

app.get("/api/pdf-templates/:filename", (req, res) => {
    const filePath = path.resolve("template-files", req.params.filename);
    if (fs.existsSync(filePath)) res.sendFile(filePath);
    else res.status(404).send("Template not found");
});

app.get("/api/generated-pdf-files/list", (req, res) => {
    const templatesDir = path.resolve("generated-pdf-files");
    if (!fs.existsSync(templatesDir)) {
        return res.json([]);
    }
    const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.pdf'));
    res.json(files);
});

app.get("/api/generated-pdf-files/:filename", (req, res) => {
    const filePath = path.resolve("generated-pdf-files", req.params.filename);
    if (fs.existsSync(filePath)) res.sendFile(filePath);
    else res.status(404).send("Generated file not found");
});

// Get template configuration
app.get("/api/template-config/:templateName", (req, res) => {
    const configPath = path.resolve("template-configs", `${req.params.templateName}.json`);
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        res.json(config);
    } else {
        res.json({ fields: [] }); // Return empty config if none exists
    }
});

// Save template configuration
app.post("/api/template-config/:templateName", (req, res) => {
    const configDir = path.resolve("template-configs");
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    const configPath = path.resolve(configDir, `${req.params.templateName}.json`);
    fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
});

// Copiar configuração de template para novo nome
app.post("/api/create-config-file", (req, res) => {
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
app.post('/api/create-template', upload.single('pdf'), (req, res) => {
    // 🔒 PROTEÇÃO: Não permite criar templates no servidor se estiver em produção
    if (IS_PRODUCTION) {
        return res.status(403).json({ 
            success: false,
            error: 'Operação não permitida em produção',
            message: 'Não é permitido adicionar novos templates ao servidor em modo produção.'
        });
    }
    
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
app.post('/api/save-pdf', (req, res) => {
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
app.post('/api/sync-to-origin', (req, res) => {
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
app.post('/api/clone-file', async (req, res) => {
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
app.post("/api/rename-template", (req, res) => {
    try {
        const { oldName, newName } = req.body;
        
        if (!oldName || !newName) {
            return res.status(400).json({ error: "oldName e newName são obrigatórios" });
        }
        
        // 🔒 PROTEÇÃO: Verifica se o template do servidor está protegido
        const protection = isServerTemplateProtected(oldName);
        if (protection.isProtected) {
            return res.status(403).json({ 
                success: false,
                error: 'Template protegido',
                message: protection.isInBlacklist 
                    ? `O template '${oldName}' está na lista de proteção e não pode ser renomeado.`
                    : `Templates do servidor não podem ser renomeados.`,
                isInBlacklist: protection.isInBlacklist,
                existsInServer: protection.existsInServer
            });
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

// 🔒 Endpoint para validar exclusão de template
// 🔒 Endpoint para validar e executar exclusão de template
app.delete("/api/template/:filename", (req, res) => {
    const filename = req.params.filename;
    
    // 🔒 PROTEÇÃO: Verifica se o template do servidor está protegido
    const protection = isServerTemplateProtected(filename);
    if (protection.isProtected) {
        return res.status(403).json({ 
            success: false,
            error: 'Template protegido',
            message: protection.isInBlacklist 
                ? `O template '${filename}' está na lista de proteção e não pode ser excluído.`
                : `Templates do servidor não podem ser excluídos. Apenas templates armazenados no navegador podem ser removidos.`,
            isInBlacklist: protection.isInBlacklist,
            existsInServer: protection.existsInServer
        });
    }
    
    // Se o arquivo existe no servidor (mas não está protegido), exclui
    const pdfPath = path.resolve('template-files', filename);
    const configPath = path.resolve('template-configs', `${filename}.json`);
    
    if (fs.existsSync(pdfPath)) {
        try {
            // Exclui o PDF
            fs.unlinkSync(pdfPath);
            console.log(`✅ PDF excluído: ${filename}`);
            
            // Exclui o config se existir
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
                console.log(`✅ Config excluído: ${filename}.json`);
            }
            
            return res.json({ 
                success: true,
                message: `Template '${filename}' excluído com sucesso do servidor.`,
                deletedFromServer: true
            });
        } catch (error) {
            console.error('Erro ao excluir template do servidor:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao excluir arquivo',
                message: `Erro ao excluir template: ${error.message}`
            });
        }
    }
    
    // Se chegou aqui, é um template do usuário (IndexedDB)
    // O servidor não precisa fazer nada, pois está no IndexedDB do navegador
    res.json({ 
        success: true, 
        message: 'Exclusão autorizada (arquivo do navegador)',
        deletedFromServer: false
    });
});

// 🔒 Endpoint para validar preenchimento de template
app.post("/api/validate-fill/:filename", (req, res) => {
    const filename = req.params.filename;
    
    // 🔒 PROTEÇÃO: Verifica se o template do servidor está protegido
    const protection = isServerTemplateProtected(filename);
    if (protection.existsInServer) {
        return res.status(403).json({ 
            success: false,
            error: 'Preenchimento não permitido',
            message: `Templates do servidor não podem ser preenchidos diretamente. Por favor, clone o template primeiro.`,
            existsInServer: true
        });
    }
    
    // Se chegou aqui, pode preencher
    res.json({ 
        success: true, 
        message: 'Preenchimento autorizado' 
    });
});

// 🔒 Endpoint para validar ativação do modo de edição
app.post("/api/validate-edit-mode/:filename", (req, res) => {
    const filename = req.params.filename;
    
    // 🔒 PROTEÇÃO: Verifica se o template do servidor está protegido
    const protection = isServerTemplateProtected(filename);
    if (protection.existsInServer) {
        return res.status(403).json({ 
            success: false,
            error: 'Edição não permitida',
            message: `Templates do servidor não podem ser editados diretamente. Por favor, clone o template primeiro para poder editá-lo.`,
            existsInServer: true
        });
    }
    
    // Se chegou aqui, pode editar
    res.json({ 
        success: true, 
        message: 'Edição autorizada' 
    });
});

// 🔒 Endpoint para verificar se está em modo produção
app.get("/api/is-production", (req, res) => {
    res.json({ 
        isProduction: IS_PRODUCTION,
        message: IS_PRODUCTION ? 'Modo PRODUÇÃO ativo' : 'Modo DESENVOLVIMENTO ativo'
    });
});

// 🤖 POST endpoint para extrair campos aproximados de um PDF (com IA)
app.post('/api/extract-pdf-fields', express.raw({ type: 'image/png', limit: '20mb' }), async (req, res) => {
    try {
        console.log('📥 Requisição recebida em /extract-pdf-fields');

        console.log('📦 Content-Type:', req.headers['content-type']);
        console.log('📦 Body type:', typeof req.body);
        console.log('📦 Body is Buffer?:', Buffer.isBuffer(req.body));

        let pngBuffer = req.body;
        if (!Buffer.isBuffer(pngBuffer) || !pngBuffer.length) {
            return res.status(400).json({ 
                success: false, 
                error: 'Nenhuma imagem PNG foi enviada. Envie o arquivo como body binário.' 
            });
        }
        console.log('�️ PNG Buffer validado com tamanho:', pngBuffer.length);

        // Chama a função que extrai campos com IA
        const fields = await extractFields(openai, pngBuffer);

        if (!fields || fields.length === 0) {
            return res.json({
                success: true,
                fields: []
            });
        }

        console.log(`✅ Extraídos ${fields.length} campos com sucesso`);

        return res.json({
            success: true,
            fields: fields
        });

    } catch (error) {
        console.error('❌ Erro em /extract-pdf-fields:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro interno ao processar o PDF: ' + error.message
        });
    }
});

const PORT = 3000;
// app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));


// Add process error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process, just log the error
});

// Start Express server on IPv4 localhost
const server = app.listen(PORT, '0.0.0.0', () => {
    // const server = app.listen(PORT, '::', () => {
    console.log(`msitesapp api server running on 0.0.0.0:${PORT} (IPv4 + IPv6 if system supports)`);
});

// Aumenta timeout para 3 minutos (180000 ms)
server.setTimeout(180000);
