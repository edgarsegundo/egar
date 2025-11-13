// IndexedDB Manager para Templates PDF
// Armazena PDFs no navegador do usuário

const DB_NAME = 'PDFTemplatesDB';
const DB_VERSION = 1;
const STORE_NAME = 'templates';

// Abre/cria o banco de dados
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Cria o object store se não existir
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'name' });
                objectStore.createIndex('createdAt', 'createdAt', { unique: false });
                objectStore.createIndex('size', 'size', { unique: false });
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
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
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
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
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
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
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
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
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
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
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
