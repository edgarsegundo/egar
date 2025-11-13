// IndexedDB Manager para Templates PDF
// Armazena PDFs e suas configurações no navegador do usuário

const DB_NAME = 'PDFTemplatesDB';
const DB_VERSION = 2; // Incrementado para criar nova store
const TEMPLATES_STORE = 'templates';
const CONFIGS_STORE = 'configs';

// Abre/cria o banco de dados
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Cria o object store de templates se não existir
            if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
                const objectStore = db.createObjectStore(TEMPLATES_STORE, { keyPath: 'name' });
                objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                objectStore.createIndex('size', 'size', { unique: false });
            }
            
            // Cria o object store de configs se não existir
            if (!db.objectStoreNames.contains(CONFIGS_STORE)) {
                const configStore = db.createObjectStore(CONFIGS_STORE, { keyPath: 'templateName' });
                configStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };
    });
}

// Salvar template no IndexedDB
async function saveTemplateToIndexedDB(pdfFile, templateName) {
    try {
        const db = await openDB();
        
        // Lê o arquivo como ArrayBuffer (binário puro, mais eficiente que Base64)
        const arrayBuffer = await pdfFile.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        
        const sizeInMB = (pdfFile.size / (1024 * 1024)).toFixed(2);
        
        // Prepara o objeto para salvar
        const template = {
            name: templateName,
            pdf: blob,
            createdAt: new Date().toISOString(),
            size: parseFloat(sizeInMB),
            originalName: pdfFile.name
        };
        
        // Salva no IndexedDB
        const transaction = db.transaction([TEMPLATES_STORE], 'readwrite');
        const objectStore = transaction.objectStore(TEMPLATES_STORE);
        const request = objectStore.put(template);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve({ 
                    success: true, 
                    size: sizeInMB,
                    name: templateName
                });
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Erro ao salvar no IndexedDB:', error);
        throw error;
    }
}

// Carregar template do IndexedDB
async function loadTemplateFromIndexedDB(templateName) {
    try {
        const db = await openDB();
        const transaction = db.transaction([TEMPLATES_STORE], 'readonly');
        const objectStore = transaction.objectStore(TEMPLATES_STORE);
        const request = objectStore.get(templateName);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const template = request.result;
                if (template && template.pdf) {
                    // Converte Blob para URL que pode ser usado pelo PDF.js
                    const url = URL.createObjectURL(template.pdf);
                    resolve({ url, template });
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Erro ao carregar do IndexedDB:', error);
        throw error;
    }
}

// Listar todos os templates do IndexedDB
async function listIndexedDBTemplates() {
    try {
        const db = await openDB();
        const transaction = db.transaction([TEMPLATES_STORE], 'readonly');
        const objectStore = transaction.objectStore(TEMPLATES_STORE);
        const request = objectStore.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const templates = request.result.map(t => ({
                    name: t.name,
                    size: t.size,
                    createdAt: t.createdAt,
                    originalName: t.originalName
                }));
                resolve(templates);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Erro ao listar IndexedDB:', error);
        return [];
    }
}

// Deletar template do IndexedDB
async function deleteTemplateFromIndexedDB(templateName) {
    try {
        const db = await openDB();
        const transaction = db.transaction([TEMPLATES_STORE], 'readwrite');
        const objectStore = transaction.objectStore(TEMPLATES_STORE);
        const request = objectStore.delete(templateName);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve({ success: true });
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Erro ao deletar do IndexedDB:', error);
        throw error;
    }
}

// Verificar se template existe no IndexedDB
async function templateExistsInIndexedDB(templateName) {
    try {
        const db = await openDB();
        const transaction = db.transaction([TEMPLATES_STORE], 'readonly');
        const objectStore = transaction.objectStore(TEMPLATES_STORE);
        const request = objectStore.get(templateName);
        
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => resolve(false);
        });
    } catch (error) {
        return false;
    }
}

// Obter tamanho total usado no IndexedDB
async function getIndexedDBSize() {
    try {
        const templates = await listIndexedDBTemplates();
        const totalMB = templates.reduce((sum, t) => sum + t.size, 0);
        return {
            totalMB: totalMB.toFixed(2),
            count: templates.length
        };
    } catch (error) {
        return { totalMB: 0, count: 0 };
    }
}

// ============================================
// Funções para gerenciar CONFIGURAÇÕES (configs)
// ============================================

// Salvar configuração de template no IndexedDB
async function saveTemplateConfigToIndexedDB(templateName, config) {
    try {
        const db = await openDB();
        
        const configData = {
            templateName: templateName,
            fields: config.fields || [],
            updatedAt: new Date().toISOString()
        };
        
        const transaction = db.transaction([CONFIGS_STORE], 'readwrite');
        const objectStore = transaction.objectStore(CONFIGS_STORE);
        const request = objectStore.put(configData);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log(`✅ Config salva no IndexedDB: ${templateName}`);
                resolve({ success: true });
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Erro ao salvar config no IndexedDB:', error);
        throw error;
    }
}

// Carregar configuração de template do IndexedDB
async function loadTemplateConfigFromIndexedDB(templateName) {
    try {
        const db = await openDB();
        const transaction = db.transaction([CONFIGS_STORE], 'readonly');
        const objectStore = transaction.objectStore(CONFIGS_STORE);
        const request = objectStore.get(templateName);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const config = request.result;
                if (config) {
                    console.log(`✅ Config carregada do IndexedDB: ${templateName}`, config);
                    resolve({ fields: config.fields || [] });
                } else {
                    console.log(`⚠️ Nenhuma config encontrada no IndexedDB: ${templateName}`);
                    resolve({ fields: [] });
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Erro ao carregar config do IndexedDB:', error);
        return { fields: [] };
    }
}

// Deletar configuração de template do IndexedDB
async function deleteTemplateConfigFromIndexedDB(templateName) {
    try {
        const db = await openDB();
        const transaction = db.transaction([CONFIGS_STORE], 'readwrite');
        const objectStore = transaction.objectStore(CONFIGS_STORE);
        const request = objectStore.delete(templateName);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log(`🗑️ Config deletada do IndexedDB: ${templateName}`);
                resolve({ success: true });
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Erro ao deletar config do IndexedDB:', error);
        throw error;
    }
}

// Verificar se configuração existe no IndexedDB
async function templateConfigExistsInIndexedDB(templateName) {
    try {
        const db = await openDB();
        const transaction = db.transaction([CONFIGS_STORE], 'readonly');
        const objectStore = transaction.objectStore(CONFIGS_STORE);
        const request = objectStore.get(templateName);
        
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => resolve(false);
        });
    } catch (error) {
        return false;
    }
}

// Renomear template e sua configuração no IndexedDB
async function renameTemplateInIndexedDB(oldName, newName) {
    try {
        const db = await openDB();
        
        // 1. Carregar o template antigo
        const templateResult = await loadTemplateFromIndexedDB(oldName);
        if (!templateResult) {
            throw new Error(`Template '${oldName}' não encontrado`);
        }
        
        // 2. Carregar a configuração antiga (se existir)
        const config = await loadTemplateConfigFromIndexedDB(oldName);
        
        // 3. Buscar dados completos do template
        const templateTransaction = db.transaction([TEMPLATES_STORE], 'readonly');
        const templateStore = templateTransaction.objectStore(TEMPLATES_STORE);
        const getTemplateRequest = templateStore.get(oldName);
        
        const oldTemplateData = await new Promise((resolve, reject) => {
            getTemplateRequest.onsuccess = () => resolve(getTemplateRequest.result);
            getTemplateRequest.onerror = () => reject(getTemplateRequest.error);
        });
        
        if (!oldTemplateData) {
            throw new Error(`Dados do template '${oldName}' não encontrados`);
        }
        
        // 4. Criar novo template com o novo nome
        const newTemplateData = {
            ...oldTemplateData,
            name: newName
        };
        
        // 5. Salvar novo template
        const saveTransaction = db.transaction([TEMPLATES_STORE], 'readwrite');
        const saveStore = saveTransaction.objectStore(TEMPLATES_STORE);
        const putRequest = saveStore.put(newTemplateData);
        
        await new Promise((resolve, reject) => {
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        });
        
        // 6. Salvar configuração com novo nome (se havia configuração)
        if (config && config.fields && config.fields.length > 0) {
            await saveTemplateConfigToIndexedDB(newName, config);
        }
        
        // 7. Deletar template antigo
        await deleteTemplateFromIndexedDB(oldName);
        
        // 8. Deletar configuração antiga
        await deleteTemplateConfigFromIndexedDB(oldName);
        
        console.log(`✅ Template renomeado de '${oldName}' para '${newName}' no IndexedDB`);
        return { success: true };
        
    } catch (error) {
        console.error('Erro ao renomear template no IndexedDB:', error);
        throw error;
    }
}
