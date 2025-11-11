
// Contador global para ids únicos sequenciais dos campos
let inputFieldIdCount = 0;
let uploadedFile = null;
let inputData = [];
let currentPdfUrl = null;
let currentTemplate = null;
let isEditorMode = false;
let templateConfig = { fields: [] };
// Guarda referências dos campos criados
let createdFields = [];

const uploadForm = document.getElementById("uploadForm");
const pdfContainer = document.getElementById("pdfContainer");
const downloadBtn = document.getElementById("downloadBtn");
const sidebar = document.getElementById("sidebar");
const toggleSidebar = document.getElementById("toggleSidebar");
const showSidebar = document.getElementById("showSidebar");
const templatesList = document.getElementById("templatesList");
const clearFieldsBtn = document.getElementById("clearFieldsBtn");
const modeDescription = document.getElementById("modeDescription");

// Modo começa sempre em preenchimento
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

async function saveTemplateConfig() {
    if (!currentTemplate) return;
    const config = { fields: templateConfig.fields };
    try {
        await fetch(`/template-config/${currentTemplate}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
    } catch (error) {
        alert('Erro ao salvar configuração');
    }
}

// Load templates on page load
async function loadTemplates() {
    try {
        const res = await fetch("/pdf-templates/list");
        const templates = await res.json();

        if (templates.length === 0) {
            templatesList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum template encontrado</p>';
            return;
        }

        templatesList.innerHTML = templates.map(template => `
            <button 
                class="template-btn w-full text-left px-3 py-2 rounded hover:bg-blue-50 border border-gray-200 text-sm transition-colors"
                data-template="${template}"
            >
                <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                    </svg>
                    <span class="truncate">${template}</span>
                </div>
            </button>
        `).join('');

        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const template = btn.dataset.template;
                loadTemplate(template);
            });
        });
    } catch (error) {
        console.error("Error loading templates:", error);
        templatesList.innerHTML = '<p class="text-red-500 text-sm">Erro ao carregar templates</p>';
    }
}

async function loadTemplate(templateName, keepMode = false) {
    const url = `/pdf-templates/${templateName}`;
    currentPdfUrl = url;
    currentTemplate = templateName;
    inputData = [];
    try {
        const res = await fetch(`/template-config/${templateName}`);
        templateConfig = await res.json();
    } catch (error) {
        templateConfig = { fields: [] };
    }
    actionBar.classList.remove('hidden');
    renderPDF(url);
    if (!keepMode) setMode(false);
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

    const config = { fields: templateConfig.fields };

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

// Load templates when page loads
loadTemplates();

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
            let fieldName = `?`;
            templateConfig.fields.push({ x, y, name: fieldName, value: '', page: pageNum });
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

    templateConfig.fields.forEach((field, idx) => {
        createInputField(field.x, field.y, field.name, field.value, isEditorMode, idx, field.page || 1);
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
                templateConfig.fields[idx].x = newX;
                templateConfig.fields[idx].y = newY;
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
                // Salva no config
                templateConfig.fields[idx].width = newWidth;
                templateConfig.fields[idx].height = newHeight;
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

        const input = document.createElement("input");
        input.type = "text";
        input.value = value;
        input.className = 'border p-1 rounded text-sm bg-blue-100 border-blue-400 opacity-80';
        input.dataset.fieldName = name;
        input.dataset.x = x;
        input.dataset.y = y;
        input.dataset.page = page;
        input.id = uniqueId + '-input';
        input.style.height = (templateConfig.fields[idx]?.height || 20) + 'px';
        input.style.width = (templateConfig.fields[idx]?.width || 120) + 'px';
        input.style.fontSize = '16px';

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "×";
        deleteBtn.className = "text-red-600 hover:text-red-800 font-bold absolute bg-white rounded-full border border-red-200 shadow group-hover:block flex items-center justify-center";
        deleteBtn.style.width = '16px';
        deleteBtn.style.height = '16px';
        deleteBtn.style.fontSize = '12px';
        deleteBtn.style.lineHeight = '14px';
        deleteBtn.style.padding = '0';
        deleteBtn.style.top = '5px';
        deleteBtn.style.right = '-15px';
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

    toggleFieldEditButtons(isEditorMode);
    createdFields.push({ wrapper, input, dragHandle, deleteBtn, resizeHandle, listeners });
    }
}

downloadBtn.addEventListener("click", async () => {
    if (!currentPdfUrl) return;

    const existingPdfBytes = await fetch(currentPdfUrl).then(res => res.arrayBuffer());
    const { PDFDocument, rgb } = PDFLib;

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const allInputs = pdfContainer.querySelectorAll('input[type="text"]');
    allInputs.forEach(input => {
        const x = parseFloat(input.dataset.x);
        const y = parseFloat(input.dataset.y);
        const value = input.value;

        if (value) {
            firstPage.drawText(value, {
                x: x / 1.5,
                y: firstPage.getHeight() - y / 1.5,
                size: 12,
                color: rgb(0, 0, 0)
            });
        }
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `filled-${currentTemplate || 'document'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
});

function toggleFieldEditButtons(show) {
    document.querySelectorAll('.absolute.group').forEach(wrapper => {
        const drag = wrapper.querySelector('div');
        const del = wrapper.querySelector('button');
        if (drag) drag.style.display = show ? 'block' : 'none';
        if (del) del.style.display = show ? 'block' : 'none';
    });
}
