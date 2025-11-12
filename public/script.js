
// Contador global para ids únicos sequenciais dos campos
let inputFieldIdCount = 0;
let uploadedFile = null;
let inputData = [];
let currentPdfUrl = null;
let currentTemplate = null;
let isEditorMode = false;
let templateFields = [];
// Guarda referências dos campos criados
let createdFields = [];

// Referências aos elementos do DOM
const pdfContainer = document.getElementById('pdfContainer');
const downloadBtn = document.getElementById('downloadBtn');
const uploadForm = document.getElementById('uploadForm');
const toggleModeBtn = document.getElementById('toggleModeBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const clearFieldsBtn = document.getElementById('clearFieldsBtn');
const syncToOriginBtn = document.getElementById('syncToOriginBtn');
const actionBar = document.getElementById('actionBar');
const currentMode = document.getElementById('currentMode');
const modeDescription = document.getElementById('modeDescription');
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggleSidebar');
const showSidebar = document.getElementById('showSidebar');
const templatesList = document.getElementById('templatesList');
const generatedFilesList = document.getElementById('generatedFilesList');

// Configuração do templateConfig
let templateConfig = { fields: [] };

// Criação do botão "Preencher Form" e modal
const fillFormBtn = document.createElement('button');
fillFormBtn.textContent = 'Preencher Form';
fillFormBtn.className = 'fixed bottom-8 right-8 z-50 px-6 py-3 bg-blue-700 text-white rounded-lg shadow-lg hover:bg-blue-800 transition-all duration-200';
document.body.appendChild(fillFormBtn);

// Modal e overlay
const overlay = document.createElement('div');
overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 opacity-0 pointer-events-none backdrop-blur-sm';
overlay.style.display = 'none';

const modal = document.createElement('div');
modal.className = 'bg-white rounded-xl shadow-2xl flex flex-col w-[800px] h-[100vh] max-h-screen p-0 overflow-y-auto relative transition-transform duration-300 scale-95';
modal.style.maxWidth = '100vw';
modal.style.margin = '0 auto';

// Header com botões
const modalHeader = document.createElement('div');
modalHeader.className = 'flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white sticky top-0 z-10';

const updateBtn = document.createElement('button');
updateBtn.textContent = 'Atualizar';
updateBtn.className = 'px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold transition';

const cancelBtn = document.createElement('button');
cancelBtn.textContent = 'Cancelar';
cancelBtn.className = 'px-5 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 font-semibold transition';

modalHeader.appendChild(updateBtn);
modalHeader.appendChild(cancelBtn);
modal.appendChild(modalHeader);

// Container para os campos
const modalFieldsContainer = document.createElement('div');
modalFieldsContainer.className = 'flex flex-col gap-4 px-8 py-8';
modal.appendChild(modalFieldsContainer);

overlay.appendChild(modal);
document.body.appendChild(overlay);


function setMode(editor) {
  isEditorMode = editor;
  if (isEditorMode) {
    toggleModeBtn.textContent = 'Voltar Modo Preenchimento';
    saveConfigBtn.classList.remove('hidden');
    clearFieldsBtn.classList.remove('hidden');
    modeDescription.textContent = 'Arraste, adicione ou exclua campos';
  } else {
    toggleModeBtn.textContent = 'Ativar Modo Edição';
    saveConfigBtn.classList.add('hidden');
    clearFieldsBtn.classList.add('hidden');
    modeDescription.textContent = 'Preencha os campos';
  }
}

// Função para abrir o modal e preencher campos
function openFillModal() {
    // Antes de abrir o modal, sincroniza os valores dos inputs do containerpdf para o templateConfig
    const pdfInputs = document.querySelectorAll('#pdfContainer input[type="text"]');
    pdfInputs.forEach((input, idx) => {
        if (templateConfig.fields[idx]) {
            templateConfig.fields[idx].value = input.value;
        }
    });

    // Limpa campos antigos
    modalFieldsContainer.innerHTML = '';
    // Cria um input para cada campo do templateConfig
    templateConfig.fields.forEach((field, idx) => {
        // Wrapper para label animada
        const wrapper = document.createElement('div');
        wrapper.className = 'relative flex flex-col';

        // Label (sempre visível)
        const label = document.createElement('span');
        label.textContent = field.name || `Campo ${idx+1}`;
        label.className = 'absolute left-2 top-2 text-xs text-blue-700 font-semibold pointer-events-none';
        label.style.transform = 'translateY(-70%)';
        wrapper.appendChild(label);

        // Input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = field.value || '';
        input.className = 'w-full border border-blue-300 rounded px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition';
        input.dataset.idx = idx;

        wrapper.appendChild(input);
        modalFieldsContainer.appendChild(wrapper);
    });
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100');
        modal.classList.remove('scale-95');
        modal.classList.add('scale-100');
    }, 10);
}

// Função para fechar o modal
function closeFillModal() {
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0', 'pointer-events-none');
    modal.classList.remove('scale-100');
    modal.classList.add('scale-95');
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

// Botão para abrir modal
fillFormBtn.addEventListener('click', openFillModal);

// Botão cancelar
cancelBtn.addEventListener('click', closeFillModal);

// Botão atualizar
updateBtn.addEventListener('click', () => {
    // Atualiza os valores dos campos no templateConfig e no containerpdf
    const inputs = modalFieldsContainer.querySelectorAll('input');
    inputs.forEach(input => {
        const idx = parseInt(input.dataset.idx, 10);
        templateConfig.fields[idx].value = input.value;
    });
    // Atualiza os inputs visuais do PDF
    document.querySelectorAll('#pdfContainer input[type="text"]').forEach((input, idx) => {
        if (templateConfig.fields[idx]) {
            input.value = templateConfig.fields[idx].value;
        }
    });
    closeFillModal();
});

// Load templates on page load
async function loadTemplates() {
    try {
        const res = await fetch("/pdf-templates/list");
        const templates = await res.json();

        if (templates.length === 0) {
            templatesList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum template encontrado</p>';
        } else {
            templatesList.innerHTML = templates.map(template => `
                <button 
                    class="template-btn w-full text-left px-3 py-2 rounded hover:bg-blue-50 border border-gray-200 text-sm transition-colors"
                    data-template="${template}"
                    data-source="templates"
                >
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                        </svg>
                        <span class="truncate">${template}</span>
                    </div>
                </button>
            `).join('');

            document.querySelectorAll('.template-btn[data-source="templates"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const template = btn.dataset.template;
                    loadTemplate(template, 'templates');
                });
            });
        }
    } catch (error) {
        console.error("Error loading templates:", error);
        templatesList.innerHTML = '<p class="text-red-500 text-sm">Erro ao carregar templates</p>';
    }
}

async function loadGeneratedFiles() {
    try {
        const res = await fetch("/generated-pdf-files/list");
        const files = await res.json();

        if (files.length === 0) {
            generatedFilesList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum arquivo gerado</p>';
        } else {
            generatedFilesList.innerHTML = files.map(file => `
                <button 
                    class="template-btn w-full text-left px-3 py-2 rounded hover:bg-green-50 border border-gray-200 text-sm transition-colors"
                    data-template="${file}"
                    data-source="generated"
                >
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                        </svg>
                        <span class="truncate">${file}</span>
                    </div>
                </button>
            `).join('');

            document.querySelectorAll('.template-btn[data-source="generated"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const template = btn.dataset.template;
                    loadTemplate(template, 'generated');
                });
            });
        }
    } catch (error) {
        console.error("Error loading generated files:", error);
        generatedFilesList.innerHTML = '<p class="text-red-500 text-sm">Erro ao carregar arquivos</p>';
    }
}

async function loadTemplate(templateName, source = 'templates', keepMode = false) {
    currentTemplate = templateName;
    inputData = [];
    try {
        const res = await fetch(`/template-config/${templateName}`);
        templateConfig = await res.json();
        
        // Se for um arquivo gerado e tiver derivedFrom, usa o PDF original
        if (source === 'generated' && templateConfig.derivedFrom) {
            const url = `/pdf-templates/${templateConfig.derivedFrom}`;
            currentPdfUrl = url;
            console.log(`Carregando arquivo gerado '${templateName}' usando template original '${templateConfig.derivedFrom}'`);
        } else {
            // Se for um template normal, usa o próprio arquivo
            const url = source === 'generated' 
                ? `/generated-pdf-files/${templateName}` 
                : `/pdf-templates/${templateName}`;
            currentPdfUrl = url;
        }
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        templateConfig = { fields: [] };
        // Fallback: tenta ler o config mesmo com erro para pegar o derivedFrom
        // Se não conseguir, usa o PDF clicado
        const url = source === 'generated' 
            ? `/generated-pdf-files/${templateName}` 
            : `/pdf-templates/${templateName}`;
        currentPdfUrl = url;
    }

    actionBar.classList.remove('hidden');
    await renderPDF(currentPdfUrl);
    if (!keepMode) setMode(false);

    toggleFieldEditButtons(isEditorMode);
    
    // Mostra o botão de sincronização apenas se o arquivo tiver derivedFrom
    if (templateConfig.derivedFrom) {
        syncToOriginBtn.classList.remove('hidden');
    } else {
        syncToOriginBtn.classList.add('hidden');
    }
}

// Sidebar toggle
toggleSidebar.addEventListener('click', () => {
    sidebar.classList.add('hidden');
    showSidebar.classList.remove('hidden');
});

showSidebar.addEventListener('click', () => {
    sidebar.classList.remove('hidden');
    showSidebar.classList.add('hidden');
});

uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("pdfFile");
    if (!fileInput.files.length) return alert("Select a PDF first!");

    const formData = new FormData();
    formData.append("pdf", fileInput.files[0]);

    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();

    uploadedFile = data.filename;
    currentPdfUrl = `/pdf/${uploadedFile}`;
    inputData = [];
    renderPDF(currentPdfUrl);
});

// Mode toggle
toggleModeBtn.addEventListener('click', (event) => {
    event.preventDefault();
    isEditorMode = !isEditorMode;
    setMode(isEditorMode);
    toggleFieldEditButtons(isEditorMode);
    saveConfigBtn.classList.toggle('hidden', !isEditorMode);
});

// Save configuration
saveConfigBtn.addEventListener('click', async () => {
    if (!currentTemplate) return;

    // Preserva o derivedFrom se existir
    const config = { fields: templateConfig.fields };
    if (templateConfig.derivedFrom) {
        config.derivedFrom = templateConfig.derivedFrom;
    }

    console.log('Salvando configuração:', config);

    try {
        const response = await fetch(`/template-config/${currentTemplate}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const result = await response.json();
        console.log('Resposta do servidor:', result);
        alert('Configuração salva com sucesso!');
    } catch (error) {
        console.error('Error saving config:', error);
        alert('Erro ao salvar configuração');
    }
});

// Clear fields
clearFieldsBtn.addEventListener('click', () => {
    if (confirm('Limpar todos os campos?')) {
        templateConfig.fields = [];
        if (currentTemplate) {
            loadTemplate(currentTemplate);
        }
    }
});

// Sync to origin
syncToOriginBtn.addEventListener('click', async () => {
    if (!currentTemplate) {
        alert('Nenhum template carregado.');
        return;
    }
    
    if (!templateConfig.derivedFrom) {
        alert('Este arquivo não tem origem definida. Apenas arquivos gerados podem sincronizar com a origem.');
        return;
    }
    
    const confirmMsg = `Deseja sincronizar as posições (x, y, page, width, height, fontSize) do template original "${templateConfig.derivedFrom}" para este arquivo?\n\nIsso irá SUBSTITUIR as posições atuais pelas posições do arquivo original, mantendo os valores preenchidos.`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
        const response = await fetch('/sync-to-origin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentFile: currentTemplate,
                derivedFrom: templateConfig.derivedFrom,
                fields: templateConfig.fields
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Sucesso!\n\n${result.message}\n\nRecarregando o arquivo...`);
            // Recarrega o template para mostrar as novas posições
            await loadTemplate(currentTemplate, 'generated', true);
        } else {
            alert(`❌ Erro: ${result.error}`);
        }
    } catch (error) {
        console.error('Erro ao sincronizar:', error);
        alert('Erro ao sincronizar com origem.');
    }
});

// Load templates when page loads
loadTemplates();
loadGeneratedFiles();

async function renderPDF(url) {
    pdfContainer.innerHTML = "";
    const pdf = await pdfjsLib.getDocument(url).promise;
    const numPages = pdf.numPages;
    const scale = 1.5;
    pdfContainer.style.position = "relative";

    let pageWrappers = [];
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const pageWrapper = document.createElement('div');
        pageWrapper.style.position = 'relative';
        pageWrapper.style.marginBottom = '24px';
        pageWrapper.dataset.pageNumber = pageNum;
        pdfContainer.appendChild(pageWrapper);
        pageWrappers.push(pageWrapper);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.display = 'block';
        canvas.dataset.pageNumber = pageNum;
        pageWrapper.appendChild(canvas);
        await page.render({ canvasContext: ctx, viewport }).promise;

        canvas.onclick = (e) => {
            if (!isEditorMode) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            let fieldName = prompt("Digite o nome do campo:", "");
            // Se o usuário cancelar ou não digitar nada, não cria o campo
            if (!fieldName || fieldName.trim() === '') return;
            // Sempre salva a página do campo
            templateConfig.fields.push({ x, y, name: fieldName, value: '', page: pageNum, fontSize: 16 });
            createInputField(x, y, fieldName, '', isEditorMode, templateConfig.fields.length - 1, pageNum);
        };
    }

    downloadBtn.classList.remove("hidden");

    createdFields.forEach(fieldObj => {
        fieldObj.listeners.forEach(({ target, type, handler }) => {
            target.removeEventListener(type, handler);
        });
        if (fieldObj.wrapper && fieldObj.wrapper.parentNode) {
            fieldObj.wrapper.parentNode.removeChild(fieldObj.wrapper);
        }
    });
    createdFields = [];

    // Normaliza campos para garantir que todos tenham fontSize
    templateConfig.fields.forEach(field => {
        if (!field.fontSize) field.fontSize = 16;
    });

    templateConfig.fields.forEach((field, idx) => {
        const inputWrapper = createInputField(field.x, field.y, field.name, field.value, isEditorMode, idx, field.page || 1);
        // Após criar o input, adiciona listener para salvar alterações no templateConfig e refletir no modal
        if (inputWrapper) {
            const inputEl = inputWrapper.querySelector('input[type="text"]');
            if (inputEl) {
                inputEl.addEventListener('input', async (e) => {
                    // Verifica se o índice ainda é válido antes de atualizar
                    if (templateConfig.fields[idx]) {
                        templateConfig.fields[idx].value = inputEl.value;
                    }
                    // Atualiza o campo correspondente no modal, se estiver aberto
                    const modalInput = modalFieldsContainer.querySelector(`input[data-idx='${idx}']`);
                    if (modalInput) {
                        modalInput.value = inputEl.value;
                    }
                    // Salva automaticamente no backend
                    if (currentTemplate) {
                        try {
                            // Preserva o derivedFrom se existir
                            const configToSave = { fields: templateConfig.fields };
                            if (templateConfig.derivedFrom) {
                                configToSave.derivedFrom = templateConfig.derivedFrom;
                            }
                            
                            await fetch(`/template-config/${currentTemplate}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(configToSave)
                            });
                        } catch (err) {
                            // Silencioso, mas pode logar se quiser
                            console.error('Erro ao salvar config automaticamente', err);
                            alert('Erro ao salvar configuração automaticamente');
                        }
                    }
                });
            }
        }
    });

    function createInputField(x, y, name, value, editorMode, idx, page = 1) {
        const pageWrapper = pdfContainer.querySelector(`div[data-page-number='${page}']`);
        if (!pageWrapper) return;

        const wrapper = document.createElement("div");
        wrapper.className = "absolute group";
        wrapper.style.left = `${x}px`;
        wrapper.style.top = `${y}px`;
        wrapper.style.cursor = editorMode ? 'move' : 'text';
        wrapper.style.zIndex = 10;
        wrapper.style.pointerEvents = 'auto';
        wrapper.style.position = 'absolute';
        const uniqueId = `inputfield-${inputFieldIdCount++}`;
        wrapper.id = uniqueId;
        pageWrapper.appendChild(wrapper);

        // Listeners para limpeza
        const listeners = [];

        // Drag handle (círculo maior e mais próximo do input)
        const dragHandle = document.createElement('div');
        dragHandle.style.width = '18px';
        dragHandle.style.height = '18px';
        dragHandle.style.background = '#fff';
        dragHandle.style.border = '2px solid #888';
        dragHandle.style.borderRadius = '50%';
        dragHandle.style.position = 'absolute';
        dragHandle.style.left = '50%';
        dragHandle.style.top = '-6px';
        dragHandle.style.transform = 'translate(-50%, 0)';
        dragHandle.style.cursor = 'grab';
        dragHandle.style.zIndex = '10000';
        dragHandle.title = 'Arraste para mover';
        let offsetX, offsetY, dragging = false;

        const onMouseDown = function (e) {
            e.stopPropagation();
            dragging = true;
            const rect = wrapper.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            document.body.style.userSelect = 'none';
            dragHandle.style.cursor = 'grabbing';

            function onMouseMove(ev) {
                if (!dragging) return;
                const rect = pageWrapper.getBoundingClientRect();
                let newX = ev.clientX - rect.left - offsetX;
                let newY = ev.clientY - rect.top - offsetY;
                newX = Math.max(0, Math.min(newX, pageWrapper.offsetWidth - wrapper.offsetWidth));
                newY = Math.max(0, Math.min(newY, pageWrapper.offsetHeight - wrapper.offsetHeight));
                wrapper.style.left = `${newX}px`;
                wrapper.style.top = `${newY}px`;
                // Verifica se o índice ainda é válido antes de atualizar
                if (templateConfig.fields[idx]) {
                    templateConfig.fields[idx].x = newX;
                    templateConfig.fields[idx].y = newY;
                }
                // Atualiza também o dataset do input para manter sincronizado
                const inputEl = wrapper.querySelector('input[type="text"]');
                if (inputEl) {
                    inputEl.dataset.x = newX;
                    inputEl.dataset.y = newY;
                }
            }

            function onMouseUp() {
                if (dragging) {
                    dragging = false;
                    document.body.style.userSelect = '';
                    dragHandle.style.cursor = 'grab';
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            listeners.push({ target: document, type: 'mousemove', handler: onMouseMove });
            listeners.push({ target: document, type: 'mouseup', handler: onMouseUp });
        };

        dragHandle.addEventListener('mousedown', onMouseDown);
        listeners.push({ target: dragHandle, type: 'mousedown', handler: onMouseDown });

        // Handle de redimensionamento (canto inferior direito)
        const resizeHandle = document.createElement('div');
        resizeHandle.style.width = '16px';
        resizeHandle.style.height = '16px';
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.right = '-10px';
        resizeHandle.style.bottom = '-10px';
        resizeHandle.style.cursor = 'nwse-resize';
        resizeHandle.style.zIndex = '10001';
        resizeHandle.title = 'Arraste para redimensionar';
        resizeHandle.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 14L14 2M10 2h4v4" stroke="#1e40af" stroke-width="2" fill="none"/></svg>`;
        let resizing = false, startX, startY, startWidth, startHeight;
        const onResizeMouseDown = function (e) {
            e.stopPropagation();
            resizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = input.offsetWidth;
            startHeight = input.offsetHeight;
            document.body.style.userSelect = 'none';
            function onResizeMouseMove(ev) {
                if (!resizing) return;
                let newWidth = Math.max(30, startWidth + (ev.clientX - startX));
                let newHeight = Math.max(18, startHeight + (ev.clientY - startY));
                input.style.width = newWidth + 'px';
                input.style.height = newHeight + 'px';
                // Salva no config (verifica se o índice ainda é válido)
                if (templateConfig.fields[idx]) {
                    templateConfig.fields[idx].width = newWidth;
                    templateConfig.fields[idx].height = newHeight;
                }
            }
            function onResizeMouseUp() {
                if (resizing) {
                    resizing = false;
                    document.body.style.userSelect = '';
                    document.removeEventListener('mousemove', onResizeMouseMove);
                    document.removeEventListener('mouseup', onResizeMouseUp);
                }
            }
            document.addEventListener('mousemove', onResizeMouseMove);
            document.addEventListener('mouseup', onResizeMouseUp);
            listeners.push({ target: document, type: 'mousemove', handler: onResizeMouseMove });
            listeners.push({ target: document, type: 'mouseup', handler: onResizeMouseUp });
        };
        resizeHandle.addEventListener('mousedown', onResizeMouseDown);
        listeners.push({ target: resizeHandle, type: 'mousedown', handler: onResizeMouseDown });

        // Handle de ajuste de fonte (canto superior esquerdo com flecha vertical dupla)
        const fontSizeHandle = document.createElement('div');
        fontSizeHandle.style.width = '18px';
        fontSizeHandle.style.height = '18px';
        fontSizeHandle.style.position = 'absolute';
        fontSizeHandle.style.left = '-10px';
        fontSizeHandle.style.top = '-6px';
        fontSizeHandle.style.cursor = 'ns-resize';
        fontSizeHandle.style.zIndex = '10001';
        fontSizeHandle.style.background = '#fff';
        fontSizeHandle.style.border = '2px solid #16a34a';
        fontSizeHandle.style.borderRadius = '50%';
        fontSizeHandle.style.display = 'flex';
        fontSizeHandle.style.alignItems = 'center';
        fontSizeHandle.style.justifyContent = 'center';
        fontSizeHandle.title = 'Arraste para ajustar tamanho da fonte';
        fontSizeHandle.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1L6 11M3 3L6 1L9 3M3 9L6 11L9 9" stroke="#16a34a" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        
        let fontSizing = false, fontStartY, fontStartSize;
        const onFontSizeMouseDown = function (e) {
            e.stopPropagation();
            fontSizing = true;
            fontStartY = e.clientY;
            fontStartSize = parseInt(input.style.fontSize) || templateConfig.fields[idx]?.fontSize || 16;
            document.body.style.userSelect = 'none';
            
            function onFontSizeMouseMove(ev) {
                if (!fontSizing) return;
                const deltaY = fontStartY - ev.clientY; // Invertido: arrastar pra cima aumenta
                let newFontSize = Math.max(8, Math.min(72, fontStartSize + deltaY)); // Min 8px, Max 72px
                input.style.fontSize = newFontSize + 'px';
                // Salva no config (verifica se o índice ainda é válido)
                if (templateConfig.fields[idx]) {
                    templateConfig.fields[idx].fontSize = newFontSize;
                }
            }
            
            function onFontSizeMouseUp() {
                if (fontSizing) {
                    fontSizing = false;
                    document.body.style.userSelect = '';
                    document.removeEventListener('mousemove', onFontSizeMouseMove);
                    document.removeEventListener('mouseup', onFontSizeMouseUp);
                }
            }
            
            document.addEventListener('mousemove', onFontSizeMouseMove);
            document.addEventListener('mouseup', onFontSizeMouseUp);
            listeners.push({ target: document, type: 'mousemove', handler: onFontSizeMouseMove });
            listeners.push({ target: document, type: 'mouseup', handler: onFontSizeMouseUp });
        };
        
        fontSizeHandle.addEventListener('mousedown', onFontSizeMouseDown);
        listeners.push({ target: fontSizeHandle, type: 'mousedown', handler: onFontSizeMouseDown });

        const input = document.createElement("input");
        input.type = "text";
        input.value = value;
        input.className = 'border p-1 rounded text-sm bg-blue-100 border-blue-400 opacity-80';
        input.dataset.fieldName = name;
        input.placeholder = name;
        input.dataset.x = x;
        input.dataset.y = y;
        input.dataset.page = page;
        input.id = uniqueId + '-input';
        input.style.height = (templateConfig.fields[idx]?.height || 20) + 'px';
        input.style.width = (templateConfig.fields[idx]?.width || 120) + 'px';
        input.style.fontSize = (templateConfig.fields[idx]?.fontSize || 16) + 'px';

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "×";
        deleteBtn.className = "text-red-600 hover:text-red-800 font-bold absolute bg-white rounded-full border border-red-200 shadow group-hover:block flex items-center justify-center";
        deleteBtn.style.width = '16px';
        deleteBtn.style.height = '16px';
        deleteBtn.style.fontSize = '12px';
        deleteBtn.style.lineHeight = '14px';
        deleteBtn.style.padding = '0';
        deleteBtn.style.top = '-4px';
        deleteBtn.style.right = '-10px';
        deleteBtn.style.display = 'block';
        deleteBtn.style.zIndex = '9999';
        const onDelete = (e) => {
            e.stopPropagation();
            templateConfig.fields.splice(idx, 1);
            listeners.forEach(({ target, type, handler }) => {
                target.removeEventListener(type, handler);
            });
            if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        };
        deleteBtn.addEventListener('click', onDelete);
        listeners.push({ target: deleteBtn, type: 'click', handler: onDelete });

        wrapper.appendChild(deleteBtn);
        wrapper.appendChild(dragHandle);
        wrapper.appendChild(input);
        wrapper.appendChild(resizeHandle);
        wrapper.appendChild(fontSizeHandle);

        toggleFieldEditButtons(isEditorMode);
        createdFields.push({ wrapper, input, dragHandle, deleteBtn, resizeHandle, fontSizeHandle, listeners });
        
        return wrapper;
    }
}

downloadBtn.addEventListener("click", async () => {
    if (!currentPdfUrl) return;

    // 1. Pergunta o nome do arquivo ao usuário
    // Se é um arquivo gerado, sugere o mesmo nome (sem extensão)
    // Se é um template, sugere 'meu-formulario'
    let defaultName = 'meu-formulario';
    if (currentTemplate && templateConfig.derivedFrom) {
        // É um arquivo gerado, pega o nome sem a extensão .pdf
        defaultName = currentTemplate.replace(/\.pdf$/i, '');
    }
    
    let userFileName = prompt('Digite o nome do arquivo para salvar o PDF preenchido:', defaultName);
    if (!userFileName) return;
    
    // 2. Determina qual PDF usar como base
    // Se o arquivo atual tem derivedFrom, SEMPRE usa o template original limpo
    let basePdfUrl = currentPdfUrl;
    if (templateConfig.derivedFrom) {
        basePdfUrl = `/pdf-templates/${templateConfig.derivedFrom}`;
        console.log(`Usando template original como base: ${templateConfig.derivedFrom}`);
    }

    const existingPdfBytes = await fetch(basePdfUrl).then(res => res.arrayBuffer());
    const { PDFDocument, rgb } = PDFLib;

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const allInputs = pdfContainer.querySelectorAll('input[type="text"]');
    const yOffset = 5; // ajuste base
    const pageYOffset = 10; // offset adicional para páginas diferentes
    const firstPageExtraOffset = 15; // offset especial para página 1
    
    console.log(`Total de inputs encontrados: ${allInputs.length}`);
    
    allInputs.forEach((input, idx) => {
        const x = parseFloat(input.dataset.x);
        let y = parseFloat(input.dataset.y) + yOffset;
        const value = input.value;
        const page = parseInt(input.dataset.page, 10) || 1;
        const fontSize = parseInt(input.style.fontSize) || 16;

        console.log(`Input ${idx}: página=${page}, x=${x}, y=${y}, value="${value}"`);

        if (page === 1) {
            y += firstPageExtraOffset;
        } else if (page > 1) {
            y += pageYOffset * (page - 1);
        }

        // Seleciona a página correta
        const pdfPage = pages[page - 1] || firstPage;
        const pageHeight = pdfPage.getHeight();
        const finalY = pageHeight - y / 1.5;
        
        console.log(`  -> Renderizando na página ${page}: x=${x/1.5}, y=${finalY}, fontSize=${fontSize * 0.75}`);
        
        if (value) {
            try {
                pdfPage.drawText(value, {
                    x: x / 1.5,
                    y: finalY,
                    size: fontSize * 0.75, // Ajuste de escala para o PDF
                    color: rgb(0, 0, 0)
                });
                console.log(`  -> ✓ Texto "${value}" desenhado com sucesso`);
            } catch (err) {
                console.error(`  -> ✗ Erro ao desenhar texto:`, err);
            }
        } else {
            console.log(`  -> Ignorado (valor vazio)`);
        }
    });

    const pdfBytes = await pdfDoc.save();
    
    // Enviar PDF para o servidor em vez de fazer download
    try {
        const pdfDataArray = Array.from(new Uint8Array(pdfBytes));
        const fileName = `${userFileName}.pdf`;
        
        const saveResponse = await fetch("/save-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filename: fileName,
                pdfData: pdfDataArray
            })
        });
        const saveResult = await saveResponse.json();
        
        if (saveResult.success) {
            // 2. Cria uma cópia do JSON de configuração com o novo nome
            if (currentTemplate) {
                try {
                    // Se o arquivo atual tem derivedFrom, usa ele como origem
                    // Caso contrário, usa o currentTemplate
                    const originTemplate = templateConfig.derivedFrom || currentTemplate;
                    
                    const res = await fetch(`/create-config-file`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            from: originTemplate,
                            to: `${userFileName}.pdf.json`,
                            fields: templateConfig.fields
                        })
                    });
                    const createResult = await res.json();
                    console.log('Resposta:', createResult);
                    
                    if (createResult.success) {
                        alert(`PDF salvo no servidor como '${fileName}' e configuração salva como '${userFileName}.pdf.json'!\nCaminho: ${saveResult.path}`);
                        // Recarregar a lista de arquivos gerados
                        loadGeneratedFiles();
                    } else {
                        alert(`PDF salvo no servidor como '${fileName}', mas houve erro ao salvar configuração.\nCaminho: ${saveResult.path}`);
                        // Recarregar a lista de arquivos gerados
                        loadGeneratedFiles();
                    }
                } catch (err) {
                    console.error('Error copying config:', err);
                    alert(`PDF salvo no servidor como '${fileName}', mas houve erro ao criar configuração.\nCaminho: ${saveResult.path}`);
                    // Recarregar a lista de arquivos gerados
                    loadGeneratedFiles();
                }
            } else {
                alert(`PDF salvo no servidor como '${fileName}'!\nCaminho: ${saveResult.path}`);
                // Recarregar a lista de arquivos gerados
                loadGeneratedFiles();
            }
        } else {
            alert("Erro ao salvar PDF no servidor: " + saveResult.error);
        }
    } catch (err) {
        console.error("Erro ao salvar PDF:", err);
        alert("Erro ao salvar PDF no servidor.");
    }
});

function toggleFieldEditButtons(show) {
    createdFields.forEach(fieldObj => {
        if (fieldObj.dragHandle) fieldObj.dragHandle.style.display = show ? 'block' : 'none';
        if (fieldObj.deleteBtn) fieldObj.deleteBtn.style.display = show ? 'block' : 'none';
        if (fieldObj.resizeHandle) fieldObj.resizeHandle.style.display = show ? 'block' : 'none';
        if (fieldObj.fontSizeHandle) fieldObj.fontSizeHandle.style.display = show ? 'block' : 'none';
    });
}
