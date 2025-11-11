let uploadedFile = null;
let inputData = [];
let currentPdfUrl = null;
let currentTemplate = null;
let isEditorMode = false;
let templateConfig = { fields: [] };

const uploadForm = document.getElementById("uploadForm");
const pdfContainer = document.getElementById("pdfContainer");
const downloadBtn = document.getElementById("downloadBtn");
const sidebar = document.getElementById("sidebar");
const toggleSidebar = document.getElementById("toggleSidebar");
const showSidebar = document.getElementById("showSidebar");
const templatesList = document.getElementById("templatesList");
//   // Sempre recarrega os campos ao trocar de modo
//   if (currentTemplate) {
//     loadTemplate(currentTemplate, true);
//   }
const clearFieldsBtn = document.getElementById("clearFieldsBtn");
const modeDescription = document.getElementById("modeDescription");
// Modo começa sempre em preenchimento
function setMode(editor) {
  isEditorMode = editor;
  if (isEditorMode) {
    toggleModeBtn.textContent = 'Voltar Modo Preenchimento';
    // currentModeSpan.textContent = 'Editor';
    saveConfigBtn.classList.remove('hidden');
    clearFieldsBtn.classList.remove('hidden');
    modeDescription.textContent = 'Arraste, adicione ou exclua campos';
  } else {
    toggleModeBtn.textContent = 'Ativar Modo Edição';
    // currentModeSpan.textContent = 'Preenchimento';
    saveConfigBtn.classList.add('hidden');
    clearFieldsBtn.classList.add('hidden');
    modeDescription.textContent = 'Preencha os campos';
  }
//   // Sempre recarrega os campos ao trocar de modo
//   if (currentTemplate) {
//     loadTemplate(currentTemplate, true);
//   }
}

// toggleModeBtn.addEventListener('click', () => {
//   // Se estava em edição, salva antes de sair
//   if (isEditorMode) {
//     saveTemplateConfig();
//   }
//   setMode(!isEditorMode);
// });

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

    // Add click listeners to template buttons
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
  // Load template configuration
  try {
    const res = await fetch(`/template-config/${templateName}`);
    templateConfig = await res.json();
  } catch (error) {
    templateConfig = { fields: [] };
  }
  actionBar.classList.remove('hidden');
  renderPDF(url);
  // Se não for para manter o modo, sempre começa em preenchimento
  if (!keepMode) setMode(false);
}

// Sidebar toggle functionality
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
  inputData = []; // Clear previous inputs
  renderPDF(currentPdfUrl);
});

// Mode toggle
toggleModeBtn.addEventListener('click', (event) => {
    event.preventDefault();
    isEditorMode = !isEditorMode;

    setMode(isEditorMode);
    //   currentModeSpan.textContent = isEditorMode ? 'Editor' : 'Preenchimento';
    saveConfigBtn.classList.toggle('hidden', !isEditorMode);
    // clearFieldsBtn.classList.toggle('hidden', !isEditorMode);
    // modeDescription.textContent = isEditorMode 
    //     ? 'Clique para adicionar campos' 
    //     : 'Preencha os campos';
    
    // if (!isEditorMode && currentTemplate) {
    //     // Reload template to show configured fields
    //     loadTemplate(currentTemplate);
    // }
});

// Save configuration
saveConfigBtn.addEventListener('click', async () => {
  if (!currentTemplate) return;
  
  const config = {
    fields: templateConfig.fields
  };
  
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
  const scale = 1.5; // tamanho mais adequado para visualização
  pdfContainer.style.position = "relative";

  // Para mapear campos para a página correta no futuro (se necessário)
  let pageCanvases = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.display = 'block';
    canvas.style.marginBottom = '24px';
    canvas.dataset.pageNumber = pageNum;
    pdfContainer.appendChild(canvas);
    pageCanvases.push(canvas);
    await page.render({ canvasContext: ctx, viewport }).promise;
  // fim da função renderPDF

  // Adicionar campo novo só no modo edição (apenas na página clicada)
  pdfContainer.onclick = (e) => {
    if (!isEditorMode) return;
    // Verifica se clicou em algum canvas
    const canvas = e.target.closest('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let fieldName = `?`;
    // Salva também a página do campo
    templateConfig.fields.push({ x, y, name: fieldName, value: '', page: parseInt(canvas.dataset.pageNumber) });
    createInputField(x, y, fieldName, '', isEditorMode, templateConfig.fields.length - 1, parseInt(canvas.dataset.pageNumber));
  };

  downloadBtn.classList.remove("hidden");
  // Renderiza os campos existentes
  templateConfig.fields.forEach((field, idx) => {
    // Se não tiver page, assume 1 (retrocompatibilidade)
    createInputField(field.x, field.y, field.name, field.value, isEditorMode, idx, field.page || 1);
  });
}

function createInputField(x, y, name, value, editorMode, idx, page = 1) {
  // Seleciona o canvas da página correta
  const canvas = pdfContainer.querySelector(`canvas[data-page-number='${page}']`);
  if (!canvas) return;
  const wrapper = document.createElement("div");
  wrapper.className = "absolute group";
  wrapper.style.left = `${x}px`;
  wrapper.style.top = `${y}px`;
  wrapper.style.cursor = editorMode ? 'move' : 'text';
  wrapper.style.zIndex = 10;
  wrapper.style.pointerEvents = 'auto';

  // Posiciona o wrapper relativo ao canvas da página
  wrapper.style.position = 'absolute';
  canvas.parentElement.appendChild(wrapper);
  canvas.style.position = 'relative';

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
  dragHandle.onmousedown = function(e) {
    e.stopPropagation();
    dragging = true;
    const rect = wrapper.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
    dragHandle.style.cursor = 'grabbing';
  };
  document.onmouseup = function() {
    if (dragging) {
      dragging = false;
      document.body.style.userSelect = '';
      dragHandle.style.cursor = 'grab';
    }
  };
  document.onmousemove = function(e) {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    let newX = e.clientX - rect.left - offsetX;
    let newY = e.clientY - rect.top - offsetY;
    // Limitar dentro do canvas
    newX = Math.max(0, Math.min(newX, canvas.offsetWidth - wrapper.offsetWidth));
    newY = Math.max(0, Math.min(newY, canvas.offsetHeight - wrapper.offsetHeight));
    wrapper.style.left = `${newX}px`;
    wrapper.style.top = `${newY}px`;
    templateConfig.fields[idx].x = newX;
    templateConfig.fields[idx].y = newY;
  };

  // Input de texto
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.className = `border p-1 rounded text-sm ${editorMode ? 'bg-blue-100 border-blue-400' : 'bg-yellow-100'} ${editorMode ? 'opacity-80' : ''}`;
  input.dataset.fieldName = name;
  input.dataset.x = x;
  input.dataset.y = y;
  input.dataset.page = page;
  input.style.height = '20px';
  input.style.fontSize = '16px';

  // Botão de excluir
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
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    templateConfig.fields.splice(idx, 1);
    renderPDF(currentPdfUrl);
  };

  wrapper.appendChild(deleteBtn);
  wrapper.appendChild(dragHandle);
  wrapper.appendChild(input);
}
}

downloadBtn.addEventListener("click", async () => {
  if (!currentPdfUrl) return;

  const existingPdfBytes = await fetch(currentPdfUrl).then(res => res.arrayBuffer());
  const { PDFDocument, rgb } = PDFLib;

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  // Get all input values from the page
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
