console.log('🚀 script.js carregado!');


// Contador global para ids únicos sequenciais dos campos
let inputFieldIdCount = 0;
let uploadedFile = null;
let inputData = [];
let currentPdfUrl = null;
let currentTemplate = null;
let currentTemplateSource = null; // 'indexeddb', 'templates', ou 'generated'
let isEditorMode = false;
let templateFields = [];
// Guarda referências dos campos criados
let createdFields = [];

// 🔒 Variável global para armazenar se está em modo produção
let isProductionMode = false;

// Referências aos elementos do DOM
const pdfContainer = document.getElementById('pdfContainer');
const downloadBtn = document.getElementById('downloadBtn');
const uploadForm = document.getElementById('uploadForm');
const toggleModeBtn = document.getElementById('toggleModeBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const clearFieldsBtn = document.getElementById('clearFieldsBtn');
const cloneFileBtn = document.getElementById('cloneFileBtn');
const syncToOriginBtn = document.getElementById('syncToOriginBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const actionBar = document.getElementById('actionBar');
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggleSidebar');
const showSidebar = document.getElementById('showSidebar');
const generatedFilesList = document.getElementById('generatedFilesList');
const currentFileLabel = document.getElementById('currentFileLabel');
const currentFileName = document.getElementById('currentFileName');

// Configuração do templateConfig
let templateConfig = { fields: [] };

// Referência ao botão "Preencher" no toolbar
const fillFormBtn = document.getElementById('fillFormBtn');

// Modal e overlay
const overlay = document.createElement('div');
overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 opacity-0 pointer-events-none backdrop-blur-sm';
overlay.style.display = 'none';
overlay.style.padding = '2rem 0';

const modal = document.createElement('div');
modal.className = 'bg-white rounded-xl shadow-2xl flex flex-col w-[800px] max-h-full p-0 overflow-y-auto relative transition-transform duration-300 scale-95';
modal.style.maxWidth = '100vw';
modal.style.margin = '0 auto';

// Header com botões
const modalHeader = document.createElement('div');
modalHeader.className = 'flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white sticky top-0 z-10';

const buttonsContainer = document.createElement('div');
buttonsContainer.className = 'flex gap-3';

const updateBtn = document.createElement('button');
updateBtn.textContent = 'Atualizar';
updateBtn.className = 'px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold transition';

const cancelBtn = document.createElement('button');
cancelBtn.textContent = 'Cancelar';
cancelBtn.className = 'px-5 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 font-semibold transition';

buttonsContainer.appendChild(updateBtn);
buttonsContainer.appendChild(cancelBtn);

const modalTitle = document.createElement('h2');
modalTitle.textContent = 'Preencher Formulário';
modalTitle.className = 'text-2xl font-bold text-gray-800';

modalHeader.appendChild(buttonsContainer);
modalHeader.appendChild(modalTitle);
modal.appendChild(modalHeader);

// Container para os campos
const modalFieldsContainer = document.createElement('div');
modalFieldsContainer.className = 'flex flex-col gap-4 px-8 py-8';
modal.appendChild(modalFieldsContainer);

overlay.appendChild(modal);
document.body.appendChild(overlay);


function setMode(editor) {
  isEditorMode = editor;
  console.log(`[setMode] Mudando para modo: ${isEditorMode ? 'EDIÇÃO' : 'PREENCHIMENTO'}`);
  
  const currentModeSpan = document.getElementById('currentMode');
  const modeIcon = document.getElementById('modeIcon');
  const toggleBtn = document.getElementById('toggleModeBtn');
  const editModeOverlay = document.getElementById('editModeOverlay');
  const pdfContainer = document.getElementById('pdfContainer');
  const editModeToast = document.getElementById('editModeToast');
  const pdfClickHint = document.getElementById('pdfClickHint');
  const editModeHelpBtn = document.getElementById('editModeHelpBtn');
  
  if (isEditorMode) {
    // Modo EDIÇÃO - Visual Verde sem ícone
    if (currentModeSpan) currentModeSpan.textContent = '✓ Modo Edição Ativo';
    
    // Remove o ícone no modo edição
    if (modeIcon) {
      modeIcon.innerHTML = '';
    }
    
    // Adiciona classe de modo ativo
    if (toggleBtn) {
      toggleBtn.classList.add('edit-mode-active');
    }
    
    // Ativa overlay verde
    if (editModeOverlay) {
      editModeOverlay.classList.add('active');
    }
    
    // Adiciona borda verde no PDF
    if (pdfContainer) {
      pdfContainer.classList.add('edit-mode');
    }
    
    // Mostra botão de ajuda
    if (editModeHelpBtn) {
      editModeHelpBtn.classList.remove('hidden');
    }
    
    // Mostra toast de instrução com auto-hide
    if (editModeToast) {
      editModeToast.classList.remove('hide');
      editModeToast.classList.add('show');
      editModeToast.setAttribute('data-auto-hide', 'true');
      
      // Auto-hide após 8 segundos (apenas se for auto-hide)
      setTimeout(() => {
        if (editModeToast.classList.contains('show') && editModeToast.hasAttribute('data-auto-hide')) {
          editModeToast.classList.remove('show');
          editModeToast.classList.add('hide');
        }
      }, 8000);
    }
    
    // Mostra dica flutuante no PDF se não houver campos ainda
    if (pdfClickHint && templateConfig.fields.length === 0) {
      setTimeout(() => {
        pdfClickHint.classList.add('show');
        
        // Remove após 5 segundos ou ao clicar
        setTimeout(() => {
          pdfClickHint.classList.remove('show');
        }, 5000);
      }, 1000);
    }
    
    if (saveConfigBtn) saveConfigBtn.classList.remove('hidden');
    if (clearFieldsBtn) clearFieldsBtn.classList.remove('hidden');
  } else {
    // Modo PREENCHIMENTO - Visual Roxo com ícone de editar
    if (currentModeSpan) currentModeSpan.textContent = 'Ativar Modo Edição';
    
    // Muda o ícone para "editar" (caneta)
    if (modeIcon) {
      modeIcon.innerHTML = `
        <svg class="w-5 h-5 edit-icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
        </svg>
      `;
    }
    
    // Remove classe de modo ativo
    if (toggleBtn) {
      toggleBtn.classList.remove('edit-mode-active');
    }
    
    // Desativa overlay
    if (editModeOverlay) {
      editModeOverlay.classList.remove('active');
    }
    
    // Remove borda verde do PDF
    if (pdfContainer) {
      pdfContainer.classList.remove('edit-mode');
    }
    
    // Esconde botão de ajuda
    if (editModeHelpBtn) {
      editModeHelpBtn.classList.add('hidden');
    }
    
    // Esconde toast
    if (editModeToast) {
      editModeToast.classList.remove('show');
      editModeToast.classList.add('hide');
      editModeToast.removeAttribute('data-auto-hide');
    }
    
    // Esconde dica do PDF
    if (pdfClickHint) {
      pdfClickHint.classList.remove('show');
    }
    
    if (saveConfigBtn) saveConfigBtn.classList.add('hidden');
    if (clearFieldsBtn) clearFieldsBtn.classList.add('hidden');
  }
  toggleFieldEditButtons(isEditorMode);
}

// Função para abrir o modal e preencher campos
async function openFillModal() {
    // Verifica se há um template carregado
    if (!currentTemplate) {
        await Swal.fire({
            icon: 'warning',
            title: 'Atenção',
            text: 'Nenhum template carregado.',
            confirmButtonText: 'OK'
        });
        return;
    }
    
    // 🔒 VALIDAÇÃO BACKEND: Verifica se pode preencher
    try {
        const response = await fetch(`/api/validate-fill/${currentTemplate}`, {
            method: 'POST'
        });
        
        const validation = await response.json();
        
        if (!validation.success) {
            await Swal.fire({
                icon: 'info',
                title: 'Clone o Template Primeiro',
                html: `
                    <p class="text-sm text-gray-600 mb-3">Templates do servidor não podem ser preenchidos diretamente.</p>
                    <p class="text-sm text-gray-700 mb-3"><strong>Por favor, clone este template primeiro</strong> usando o botão "Clonar" no toolbar acima.</p>
                    <p class="text-xs text-gray-500">Isso permite que você salve suas alterações no seu navegador.</p>
                `,
                confirmButtonText: 'Entendi'
            });
            return;
        }
    } catch (error) {
        console.error('Erro ao validar preenchimento:', error);
        // Se der erro, continua (pode ser template do IndexedDB)
    }
    
    // Antes de abrir o modal, sincroniza os valores dos inputs do containerpdf para o templateConfig
    const pdfInputs = document.querySelectorAll('#pdfContainer input[type="text"]');
    pdfInputs.forEach((input) => {
        const fieldName = input.dataset.fieldName;
        if (fieldName) {
            // Encontra o campo correspondente pelo nome
            const fieldIndex = templateConfig.fields.findIndex(f => f.name === fieldName);
            if (fieldIndex !== -1) {
                templateConfig.fields[fieldIndex].value = input.value;
            }
        }
    });

    // Limpa campos antigos
    modalFieldsContainer.innerHTML = '';
    
    // Coleta todos os inputs do PDF com seus tabindex
    const pdfInputsWithTabIndex = [];
    document.querySelectorAll('#pdfContainer input[type="text"]').forEach((input) => {
        const fieldName = input.dataset.fieldName;
        const tabIndex = parseInt(input.tabIndex) || 999;
        if (fieldName) {
            const fieldIndex = templateConfig.fields.findIndex(f => f.name === fieldName);
            if (fieldIndex !== -1) {
                pdfInputsWithTabIndex.push({
                    field: templateConfig.fields[fieldIndex],
                    fieldIndex: fieldIndex,
                    tabIndex: tabIndex
                });
            }
        }
    });
    
    // Ordena pelos tabindex
    pdfInputsWithTabIndex.sort((a, b) => a.tabIndex - b.tabIndex);
    
    // Cria um input para cada campo na ordem do tabindex
    pdfInputsWithTabIndex.forEach(({ field, fieldIndex }) => {
        // Wrapper para label animada
        const wrapper = document.createElement('div');
        wrapper.className = 'relative flex flex-col';

        // Label (sempre visível)
        const label = document.createElement('span');
        label.textContent = field.name || `Campo ${fieldIndex+1}`;
        label.className = 'absolute left-2 top-2 text-xs text-blue-700 font-semibold pointer-events-none';
        label.style.transform = 'translateY(-70%)';
        wrapper.appendChild(label);

        // Input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = field.value || '';
        input.className = 'w-full border border-blue-300 rounded px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition';
        input.dataset.idx = fieldIndex;
        input.placeholder = field.hint || '';

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
updateBtn.addEventListener('click', async () => {
    console.log('🔄 [ATUALIZAR] Iniciando atualização dos campos...');
    console.log('🔄 [ATUALIZAR] currentTemplate:', currentTemplate);
    console.log('🔄 [ATUALIZAR] currentTemplateSource:', currentTemplateSource);
    console.log('🔄 [ATUALIZAR] templateConfig antes:', JSON.parse(JSON.stringify(templateConfig)));
    
    // Atualiza os valores dos campos no templateConfig
    const inputs = modalFieldsContainer.querySelectorAll('input');
    console.log('🔄 [ATUALIZAR] Total de inputs no modal:', inputs.length);
    
    inputs.forEach((input, i) => {
        const idx = parseInt(input.dataset.idx, 10);
        const newValue = input.value;
        console.log(`  Input ${i}: idx=${idx}, valor="${newValue}"`);
        
        if (templateConfig.fields[idx]) {
            const oldValue = templateConfig.fields[idx].value;
            templateConfig.fields[idx].value = newValue;
            console.log(`  ✓ Campo "${templateConfig.fields[idx].name}": "${oldValue}" → "${newValue}"`);
        }
    });
    
    console.log('🔄 [ATUALIZAR] templateConfig depois:', JSON.parse(JSON.stringify(templateConfig)));
    
    // Atualiza os inputs visuais do PDF usando correspondência por nome
    document.querySelectorAll('#pdfContainer input[type="text"]').forEach((input) => {
        const fieldName = input.dataset.fieldName;
        if (fieldName) {
            const field = templateConfig.fields.find(f => f.name === fieldName);
            if (field) {
                input.value = field.value || '';
                console.log(`  ✓ Input visual "${fieldName}" atualizado: "${field.value}"`);
            }
        }
    });
    
    // 💾 SALVA AS ALTERAÇÕES automaticamente após atualizar
    if (currentTemplate) {
        try {
            console.log('💾 [SALVAR] Iniciando salvamento...');
            
            // Preserva o derivedFrom se existir
            const config = { 
                fields: templateConfig.fields.map(f => ({
                    name: f.name,
                    value: f.value,
                    x: f.x,
                    y: f.y,
                    page: f.page,
                    width: f.width,
                    height: f.height,
                    fontSize: f.fontSize,
                    hint: f.hint
                }))
            };
            
            if (templateConfig.derivedFrom) {
                config.derivedFrom = templateConfig.derivedFrom;
            }
            
            console.log('💾 [SALVAR] Config a salvar:', config);
            
            // Se o template é do IndexedDB ou clone, salva a config no IndexedDB
            if (currentTemplateSource === 'indexeddb' || currentTemplateSource === 'clone') {
                console.log(`💾 [SALVAR] Salvando no IndexedDB (source: ${currentTemplateSource})`);
                await saveTemplateConfigToIndexedDB(currentTemplate, config);
                console.log('✅ Configuração salva no IndexedDB');
            } else {
                // Se for template do servidor, salva no servidor
                console.log('💾 [SALVAR] Salvando no servidor');
                const response = await fetch('/api/save-template-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ templateName: currentTemplate, config })
                });
                
                if (response.ok) {
                    console.log('✅ Configuração salva no servidor');
                } else {
                    console.error('❌ Erro ao salvar no servidor:', response.status);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao salvar configuração:', error);
        }
    }
    
    closeFillModal();
});

// 🔒 Função para verificar se está em modo produção no servidor
async function checkProductionMode() {
    try {
        const response = await fetch('/api/is-production');
        const result = await response.json();
        isProductionMode = result.isProduction;
        console.log(`🔒 Modo produção: ${isProductionMode ? 'ATIVO' : 'INATIVO'}`);
        return isProductionMode;
    } catch (error) {
        console.error('Erro ao verificar modo produção:', error);
        isProductionMode = false;
        return false;
    }
}

// 🔒 Função para gerenciar estado dos botões baseado no modo produção e fonte do template
function updateButtonsState() {
    const addServerTemplateBtn = document.getElementById('addServerTemplateBtn');
    const deleteTemplateBtn = document.getElementById('deleteTemplateBtn');
    const renameTemplateBtn = document.getElementById('renameTemplateBtn');
    const fillFormBtn = document.getElementById('fillFormBtn');
    
    // Se está em modo produção E o template é do servidor
    const isServerTemplate = currentTemplateSource === 'templates';
    const shouldDisable = isProductionMode && isServerTemplate;
    
    console.log(`🔒 Atualizando botões - Produção: ${isProductionMode}, Template servidor: ${isServerTemplate}, Disable: ${shouldDisable}`);
    
    // Botão "+" de adicionar template ao servidor
    if (addServerTemplateBtn) {
        if (isProductionMode) {
            addServerTemplateBtn.disabled = true;
            addServerTemplateBtn.classList.add('opacity-50', 'cursor-not-allowed');
            addServerTemplateBtn.classList.remove('hover:bg-green-100');
            addServerTemplateBtn.title = 'Desabilitado em modo produção';
        } else {
            addServerTemplateBtn.disabled = false;
            addServerTemplateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            addServerTemplateBtn.classList.add('hover:bg-green-100');
            addServerTemplateBtn.title = 'Adicionar template ao servidor';
        }
    }
    
    // Botões de ação do template
    if (shouldDisable) {
        // Desabilita botões
        if (deleteTemplateBtn) {
            deleteTemplateBtn.disabled = true;
            deleteTemplateBtn.classList.add('opacity-50', 'cursor-not-allowed');
            deleteTemplateBtn.classList.remove('hover:bg-red-100');
            deleteTemplateBtn.title = 'Desabilitado para templates do servidor em produção';
        }
        
        if (renameTemplateBtn) {
            renameTemplateBtn.disabled = true;
            renameTemplateBtn.classList.add('opacity-50', 'cursor-not-allowed');
            renameTemplateBtn.classList.remove('hover:bg-blue-100');
            renameTemplateBtn.title = 'Desabilitado para templates do servidor em produção';
        }
        
        if (fillFormBtn) {
            fillFormBtn.disabled = true;
            fillFormBtn.classList.add('opacity-50', 'cursor-not-allowed');
            fillFormBtn.classList.remove('hover:bg-blue-100');
            fillFormBtn.title = 'Desabilitado para templates do servidor em produção';
        }
    } else {
        // Habilita botões
        if (deleteTemplateBtn) {
            deleteTemplateBtn.disabled = false;
            deleteTemplateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            deleteTemplateBtn.classList.add('hover:bg-red-100');
            deleteTemplateBtn.title = 'Excluir';
        }
        
        if (renameTemplateBtn) {
            renameTemplateBtn.disabled = false;
            renameTemplateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            renameTemplateBtn.classList.add('hover:bg-blue-100');
            renameTemplateBtn.title = 'Renomear';
        }
        
        if (fillFormBtn) {
            fillFormBtn.disabled = false;
            fillFormBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            fillFormBtn.classList.add('hover:bg-blue-100');
            fillFormBtn.title = 'Preencher formulário';
        }
    }
}

// Função auxiliar: Atualiza o nome de um template na lista (sem recarregar tudo)
function updateTemplateNameInList(oldName, newName, source) {
    let selector;
    
    if (source === 'indexeddb') {
        selector = `.template-btn[data-source="indexeddb"][data-template="${oldName}"]`;
    } else if (source === 'clone') {
        selector = `.template-btn[data-source="clone"][data-template="${oldName}"]`;
    } else if (source === 'templates') {
        selector = `.template-btn[data-source="templates"][data-template="${oldName}"]`;
    }
    
    const button = document.querySelector(selector);
    if (button) {
        // Atualiza o data-template
        button.dataset.template = newName;
        
        // Atualiza o texto exibido
        const textSpan = button.querySelector('span.truncate');
        if (textSpan) {
            textSpan.textContent = newName;
        }
        
        // Atualiza o event listener
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', async () => {
            loadTemplate(newName, source);
        });
        
        console.log(`✅ Nome atualizado na lista: ${oldName} → ${newName}`);
    }
}

// Função auxiliar: Remove um template da lista (sem recarregar tudo)
function removeTemplateFromList(templateName, source) {
    let selector;
    let parentListId;
    
    if (source === 'indexeddb') {
        selector = `.template-btn[data-source="indexeddb"][data-template="${templateName}"]`;
        parentListId = 'indexedDBTemplatesList';
    } else if (source === 'clone') {
        selector = `.template-btn[data-source="clone"][data-template="${templateName}"]`;
        parentListId = 'clonedFilesList';
    } else if (source === 'templates') {
        selector = `.template-btn[data-source="templates"][data-template="${templateName}"]`;
        parentListId = 'serverTemplatesList';
    }
    
    const button = document.querySelector(selector);
    if (button) {
        button.remove();
        console.log(`✅ Template removido da lista: ${templateName}`);
        
        // Verifica se a lista ficou vazia e adiciona mensagem
        const parentList = document.getElementById(parentListId);
        if (parentList && parentList.children.length === 0) {
            if (source === 'indexeddb') {
                parentList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum template salvo</p>';
            } else if (source === 'clone') {
                parentList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum clone criado</p>';
            } else if (source === 'templates') {
                parentList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum template encontrado</p>';
            }
        }
    }
}

// Load templates on page load
async function loadTemplates() {
    const serverTemplatesList = document.getElementById('serverTemplatesList');
    const indexedDBTemplatesList = document.getElementById('indexedDBTemplatesList');
    
    console.log('[loadTemplates] Iniciando carregamento de templates...');
    
    // Load server templates
    try {
        console.log('[loadTemplates] Buscando templates do servidor...');
        const res = await fetch("/api/pdf-templates/list");
        const templates = await res.json();
        
        console.log('[loadTemplates] Templates do servidor recebidos:', templates);

        if (templates.length === 0) {
            serverTemplatesList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum template encontrado</p>';
        } else {
            serverTemplatesList.innerHTML = templates.map(template => `
                <button 
                    class="template-btn w-full text-left px-3 py-2 rounded hover:bg-blue-50 border border-gray-200 text-sm transition-colors"
                    data-template="${template}"
                    data-source="templates"
                    title="Template do servidor: ${template}"
                >
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                        </svg>
                        <span class="truncate">${template}</span>
                    </div>
                </button>
            `).join('');
            
            console.log('[loadTemplates] Templates do servidor renderizados:', templates.length);

            document.querySelectorAll('.template-btn[data-source="templates"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const template = btn.dataset.template;
                    loadTemplate(template, 'templates');
                });
            });
        }
    } catch (error) {
        console.error("[loadTemplates] Erro ao carregar templates do servidor:", error);
        serverTemplatesList.innerHTML = '<p class="text-red-500 text-sm">Erro ao carregar templates</p>';
    }
    
    // Load IndexedDB templates
    try {
        const indexedDBTemplates = await listIndexedDBTemplates();
        
        if (indexedDBTemplates.length === 0) {
            indexedDBTemplatesList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum template salvo</p>';
        } else {
            indexedDBTemplatesList.innerHTML = indexedDBTemplates.map(template => `
                <button 
                    class="template-btn w-full text-left px-3 py-2 rounded hover:bg-green-50 border border-green-200 text-sm transition-colors"
                    data-template="${template.name}"
                    data-source="indexeddb"
                    title="Meu template: ${template.name} (${template.size}MB)"
                >
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                        </svg>
                        <span class="truncate">${template.name}</span>
                    </div>
                </button>
            `).join('');

            document.querySelectorAll('.template-btn[data-source="indexeddb"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const templateName = btn.dataset.template;
                    loadTemplate(templateName, 'indexeddb');
                });
            });
        }
    } catch (error) {
        console.error("Error loading IndexedDB templates:", error);
        indexedDBTemplatesList.innerHTML = '<p class="text-red-500 text-sm">Erro ao carregar templates</p>';
    }
}

async function loadClonedFiles() {
    const clonedFilesList = document.getElementById('clonedFilesList');
    if (!clonedFilesList) return;
    
    try {
        const clones = await listIndexedDBClones();

        if (clones.length === 0) {
            clonedFilesList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum clone criado</p>';
        } else {
            clonedFilesList.innerHTML = clones.map(clone => `
                <button 
                    class="template-btn w-full text-left px-3 py-2 rounded hover:bg-amber-50 border border-gray-200 text-sm transition-colors"
                    data-template="${clone.name}"
                    data-source="clone"
                    title="Clone: ${clone.name} (${clone.size}MB)"
                >
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                        </svg>
                        <span class="truncate">${clone.name}</span>
                    </div>
                </button>
            `).join('');

            document.querySelectorAll('.template-btn[data-source="clone"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const template = btn.dataset.template;
                    loadTemplate(template, 'clone');
                });
            });
        }
    } catch (error) {
        console.error("Error loading cloned files:", error);
        clonedFilesList.innerHTML = '<p class="text-red-500 text-sm">Erro ao carregar clones</p>';
    }
}

async function loadTemplate(templateName, source = 'templates', keepMode = false) {
    currentTemplate = templateName;
    currentTemplateSource = source; // Salva a fonte atual
    inputData = [];
    
    // Atualiza o label do arquivo atual
    currentFileName.textContent = templateName;
    currentFileLabel.classList.remove('hidden');
    
    // Mostra o toolbar de ações do arquivo
    const fileActionsToolbar = document.getElementById('fileActionsToolbar');
    if (fileActionsToolbar) {
        fileActionsToolbar.classList.remove('hidden');
    }
    
    try {
        // Se for do IndexedDB (template original ou clone), carrega de lá
        if (source === 'indexeddb' || source === 'clone') {
            console.log(`Carregando '${templateName}' do IndexedDB (${source})`);
            
            // Carrega o PDF do IndexedDB
            const result = await loadTemplateFromIndexedDB(templateName);
            if (!result || !result.url) {
                throw new Error(`Template '${templateName}' não encontrado no IndexedDB`);
            }
            currentPdfUrl = result.url;
            
            // Carrega a configuração do IndexedDB também
            templateConfig = await loadTemplateConfigFromIndexedDB(templateName);
            console.log(`Config carregada:`, templateConfig);
            
        } else {
            // Carrega do servidor (templates ou generated)
            const res = await fetch(`/api/template-config/${templateName}`);
            templateConfig = await res.json();
            
            // Se for um arquivo gerado e tiver derivedFrom, usa o PDF original
            if (source === 'generated' && templateConfig.derivedFrom) {
                const url = `/api/pdf-templates/${templateConfig.derivedFrom}`;
                currentPdfUrl = url;
                console.log(`Carregando arquivo gerado '${templateName}' usando template original '${templateConfig.derivedFrom}'`);
            } else {
                // Se for um template normal, usa o próprio arquivo
                const url = source === 'generated' 
                    ? `/api/generated-pdf-files/${templateName}` 
                    : `/api/pdf-templates/${templateName}`;
                currentPdfUrl = url;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        templateConfig = { fields: [] };
        
        // Fallback
        if (source === 'indexeddb' || source === 'clone') {
            // Já tentou carregar do IndexedDB e falhou
            throw error;
        } else {
            // Fallback para templates do servidor
            const url = source === 'generated' 
                ? `/api/generated-pdf-files/${templateName}` 
                : `/api/pdf-templates/${templateName}`;
            currentPdfUrl = url;
        }
    }

    if (actionBar) {
        actionBar.classList.remove('hidden');
    }

    // Mostra o botão de modo edição no canto superior direito
    if (toggleModeBtn) {
        toggleModeBtn.classList.remove('hidden');
    }

    await renderPDF(currentPdfUrl);
    if (!keepMode) setMode(false);
    
    // Mostra o botão de sincronização apenas se o arquivo tiver derivedFrom
    if (syncToOriginBtn) {
        if (templateConfig.derivedFrom) {
            syncToOriginBtn.classList.remove('hidden');
        } else {
            syncToOriginBtn.classList.add('hidden');
        }
    }

    // 🔒 Atualiza o estado dos botões baseado no modo produção e fonte do template
    updateButtonsState();
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

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    uploadedFile = data.filename;
    currentPdfUrl = `/api/pdf/${uploadedFile}`;
    inputData = [];
    renderPDF(currentPdfUrl);
});

// Mode toggle
toggleModeBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    
    // 🔒 VALIDAÇÃO BACKEND: Verifica se pode ativar modo de edição
    if (!isEditorMode && currentTemplate) {
        try {
            const response = await fetch(`/api/validate-edit-mode/${currentTemplate}`, {
                method: 'POST'
            });
            
            const validation = await response.json();
            
            if (!validation.success) {
                await Swal.fire({
                    icon: 'info',
                    title: 'Clone o Template Primeiro',
                    html: `
                        <p class="text-sm text-gray-600 mb-3">Templates do servidor não podem ser editados diretamente.</p>
                        <p class="text-sm text-gray-700 mb-3"><strong>Por favor, clone este template primeiro</strong> usando o botão "Clonar" no toolbar acima.</p>
                        <p class="text-xs text-gray-500">Isso permite que você edite e salve suas alterações no seu navegador.</p>
                    `,
                    confirmButtonText: 'Entendi'
                });
                return; // Cancela ativação do modo edição
            }
        } catch (error) {
            console.error('Erro ao validar modo de edição:', error);
            // Se der erro, continua (pode ser template do IndexedDB)
        }
    }
    
    // Efeito ripple ao clicar
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');
    
    const rect = toggleModeBtn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    toggleModeBtn.appendChild(ripple);
    
    // Remove o ripple após a animação
    setTimeout(() => {
        ripple.remove();
    }, 600);
    
    // Alterna o modo
    setMode(!isEditorMode);
});

// Botão de Ajuda do Modo Edição
const editModeHelpBtn = document.getElementById('editModeHelpBtn');
if (editModeHelpBtn) {
    editModeHelpBtn.addEventListener('click', () => {
        const editModeToast = document.getElementById('editModeToast');
        if (editModeToast) {
            // Remove classes anteriores
            editModeToast.classList.remove('hide');
            
            // Força reflow para reiniciar animação
            void editModeToast.offsetWidth;
            
            // Mostra o toast SEM timeout (usuário deve fechar manualmente)
            editModeToast.classList.add('show');
            
            // Remove o atributo data-auto-hide se existir
            editModeToast.removeAttribute('data-auto-hide');
        }
    });
}

// Save configuration
if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', async () => {
        if (!currentTemplate) return;

        // Preserva o derivedFrom se existir
        const config = { fields: templateConfig.fields };
        if (templateConfig.derivedFrom) {
            config.derivedFrom = templateConfig.derivedFrom;
        }

        console.log('Salvando configuração:', config);

        try {
            // Se o template é do IndexedDB, salva a config no IndexedDB também
            if (currentTemplateSource === 'indexeddb') {
                await saveTemplateConfigToIndexedDB(currentTemplate, config);
                
                await Swal.fire({
                    icon: 'success',
                    title: 'Configuração Salva!',
                    text: `A configuração foi salva no seu navegador.`,
                    confirmButtonText: 'OK'
                });
            } else {
                // Salva no servidor
                const response = await fetch(`/api/template-config/${currentTemplate}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                const result = await response.json();
                console.log('Resposta do servidor:', result);
                
                await Swal.fire({
                    icon: 'success',
                    title: 'Configuração Salva!',
                    text: 'A configuração foi salva no servidor.',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            console.error('Error saving config:', error);
            
            await Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: 'Erro ao salvar configuração',
                confirmButtonText: 'OK'
            });
        }
    });
}

// Clear fields
// clearFieldsBtn.addEventListener('click', () => {
//     if (confirm('Limpar todos os campos?')) {
//         templateConfig.fields = [];
//         if (currentTemplate) {
//             loadTemplate(currentTemplate);
//         }
//     }
// });

// Sync to origin
if (syncToOriginBtn)
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
            const response = await fetch('/api/sync-to-origin', {
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

// Fullscreen button
fullscreenBtn.addEventListener('click', () => {
    const container = pdfContainer;
    
    // Verifica se já está em fullscreen
    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
        
        // Entrar em fullscreen
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) { // Safari
            container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) { // Firefox
            container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) { // IE/Edge
            container.msRequestFullscreen();
        }
    } else {
        // Sair do fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
    }
});

// Opcional: Atualizar o ícone/título quando entrar/sair do fullscreen
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fullscreenBtn.title = 'Sair da Tela Cheia';
        console.log('Entrou em fullscreen');
    } else {
        fullscreenBtn.title = 'Tela Cheia';
        console.log('Saiu do fullscreen');
    }
});

// Clone file
cloneFileBtn.addEventListener('click', async () => {
    if (!currentTemplate) {
        await Swal.fire({
            icon: 'warning',
            title: 'Atenção',
            text: 'Nenhum arquivo carregado para clonar.',
            confirmButtonText: 'OK'
        });
        return;
    }
    
    // Sugere um nome baseado no arquivo atual
    const baseName = currentTemplate.replace(/\.pdf$/i, '');
    const defaultCloneName = `${baseName}-copia`;
    
    const { value: cloneName } = await Swal.fire({
        title: 'Clonar Template',
        html: `
            <p class="text-sm text-gray-600 mb-3">Template origem: <strong>${currentTemplate}</strong></p>
            <input id="swal-input-clone" class="swal2-input" placeholder="Nome do clone (sem .pdf)" value="${defaultCloneName}">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Clonar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const input = document.getElementById('swal-input-clone').value;
            if (!input || input.trim() === '') {
                Swal.showValidationMessage('Por favor, digite um nome válido');
                return false;
            }
            return input.trim();
        }
    });
    
    if (!cloneName) return;
    
    const finalCloneName = cloneName.endsWith('.pdf') ? cloneName : `${cloneName}.pdf`;
    
    try {
        // Detecta a fonte do template atual
        // Se for indexeddb ou clone, usa 'indexeddb' como fonte
        const sourceType = (currentTemplateSource === 'indexeddb' || currentTemplateSource === 'clone') ? 'indexeddb' : 'templates';
        
        // Mostra loading
        Swal.fire({
            title: 'Clonando...',
            text: 'Por favor aguarde',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Clona usando IndexedDB
        await cloneTemplateToIndexedDB(currentTemplate, finalCloneName, sourceType);
        
        // Recarrega a lista de clones
        await loadClonedFiles();
        
        // Carrega o arquivo clonado
        await loadTemplate(finalCloneName, 'clone');
        
        await Swal.fire({
            icon: 'success',
            title: 'Sucesso!',
            text: `Template clonado: ${finalCloneName}`,
            confirmButtonText: 'OK'
        });
    } catch (error) {
        console.error('Erro ao clonar arquivo:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: error.message || 'Erro ao clonar arquivo.',
            confirmButtonText: 'OK'
        });
    }
});

// Adicionar template (upload PDF)
const addTemplateBtn = document.getElementById('addTemplateBtn');
if (addTemplateBtn) {
    addTemplateBtn.addEventListener('click', async () => {
        // Cria input file invisível
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/pdf';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        fileInput.click();
        fileInput.addEventListener('change', async () => {
            if (!fileInput.files.length) {
                document.body.removeChild(fileInput);
                return;
            }
            const pdfFile = fileInput.files[0];
            const fileSizeMB = (pdfFile.size / (1024 * 1024)).toFixed(2);
            let defaultName = pdfFile.name.replace(/\.pdf$/i, '');
            
            // Usar SweetAlert2 para pedir o nome
            const { value: templateName } = await Swal.fire({
                title: 'Nome do Template',
                input: 'text',
                inputLabel: 'Digite o nome do novo template (sem .pdf):',
                inputValue: defaultName,
                html: `<p class="text-sm text-gray-600 mt-2">Tamanho: ${fileSizeMB}MB</p>`,
                showCancelButton: true,
                confirmButtonText: 'Salvar no Navegador',
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    if (!value || !value.trim()) {
                        return 'Por favor, digite um nome válido!';
                    }
                }
            });
            
            if (!templateName || !templateName.trim()) {
                document.body.removeChild(fileInput);
                return;
            }
            
            // Remove .pdf se o usuário digitou, para evitar duplicação
            const cleanName = templateName.trim().replace(/\.pdf$/i, '');
            const finalName = cleanName + '.pdf';
            
            try {
                // Salva no IndexedDB
                const result = await saveTemplateToIndexedDB(pdfFile, finalName);
                
                if (result.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Template Salvo!',
                        html: `
                            <p>Template salvo no seu navegador</p>
                            <p class="text-sm text-gray-600 mt-2">
                                <strong>${finalName}</strong><br>
                                Tamanho: ${result.size}MB
                            </p>
                        `,
                        timer: 3000,
                        showConfirmButton: false
                    });
                    await loadTemplates();
                } else {
                    throw new Error('Erro ao salvar template');
                }
            } catch (err) {
                console.error('Erro ao salvar template:', err);
                await Swal.fire({
                    icon: 'error',
                    title: 'Erro ao Salvar',
                    text: err.message || 'Erro ao salvar template no navegador.'
                });
            }
            document.body.removeChild(fileInput);
        }, { once: true });
    });
}

// 🔒 Adicionar template ao servidor
const addServerTemplateBtn = document.getElementById('addServerTemplateBtn');
if (addServerTemplateBtn) {
    addServerTemplateBtn.addEventListener('click', async () => {
        // Cria input file invisível
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/pdf';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        fileInput.click();
        
        fileInput.addEventListener('change', async () => {
            if (!fileInput.files.length) {
                document.body.removeChild(fileInput);
                return;
            }
            
            const pdfFile = fileInput.files[0];
            const fileSizeMB = (pdfFile.size / (1024 * 1024)).toFixed(2);
            let defaultName = pdfFile.name.replace(/\.pdf$/i, '');
            
            // Pedir o nome do template
            const { value: templateName } = await Swal.fire({
                title: 'Nome do Template',
                input: 'text',
                inputLabel: 'Digite o nome do template (sem .pdf):',
                inputValue: defaultName,
                html: `<p class="text-sm text-gray-600 mt-2">Tamanho: ${fileSizeMB}MB</p>`,
                showCancelButton: true,
                confirmButtonText: 'Salvar no Servidor',
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    if (!value || !value.trim()) {
                        return 'Por favor, digite um nome válido!';
                    }
                }
            });
            
            if (!templateName || !templateName.trim()) {
                document.body.removeChild(fileInput);
                return;
            }
            
            // Remove .pdf se o usuário digitou
            const cleanName = templateName.trim().replace(/\.pdf$/i, '');
            const finalName = cleanName + '.pdf';
            
            // Mostra loading
            Swal.fire({
                title: 'Enviando...',
                text: 'Aguarde enquanto o template é enviado ao servidor',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            try {
                // Envia para o servidor
                const formData = new FormData();
                formData.append('pdf', pdfFile);
                formData.append('templateName', finalName);
                
                const response = await fetch('/api/create-template', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.status === 403) {
                    // Modo produção - não permitido
                    await Swal.fire({
                        icon: 'error',
                        title: 'Operação não permitida',
                        text: result.message || 'Não é permitido adicionar templates ao servidor em modo produção.',
                        confirmButtonText: 'Entendi'
                    });
                } else if (result.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Template Salvo no Servidor!',
                        html: `
                            <p>Template salvo em <strong>template-files/</strong></p>
                            <p class="text-sm text-gray-600 mt-2">
                                <strong>${finalName}</strong><br>
                                Tamanho: ${fileSizeMB}MB
                            </p>
                        `,
                        timer: 3000,
                        showConfirmButton: false
                    });
                    
                    // Recarrega a lista de templates do servidor
                    await loadTemplates();
                } else {
                    throw new Error(result.error || 'Erro ao salvar template');
                }
            } catch (err) {
                console.error('Erro ao salvar template no servidor:', err);
                await Swal.fire({
                    icon: 'error',
                    title: 'Erro ao Salvar',
                    text: err.message || 'Erro ao salvar template no servidor.'
                });
            }
            
            document.body.removeChild(fileInput);
        }, { once: true });
    });
}

// Rename template
const renameTemplateBtn = document.getElementById('renameTemplateBtn');
if (renameTemplateBtn) {
    renameTemplateBtn.addEventListener('click', async () => {
        if (!currentTemplate) {
            await Swal.fire({
                icon: 'warning',
                title: 'Atenção',
                text: 'Nenhum template carregado para renomear.',
                confirmButtonText: 'OK'
            });
            return;
        }
        
        // 🔒 VALIDAÇÃO BACKEND: Verifica se pode renomear
        try {
            const response = await fetch('/api/rename-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    oldName: currentTemplate,
                    newName: currentTemplate // Só para validação
                })
            });
            
            const validation = await response.json();
            
            if (response.status === 403) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Renomeação não permitida',
                    text: validation.message,
                    confirmButtonText: 'OK'
                });
                return;
            }
        } catch (error) {
            // Se deu erro de rede ou validação, continua (pode ser template do IndexedDB)
            console.log('Validação de renomeação:', error);
        }
        
        // Remove a extensão .pdf para sugerir o nome
        const baseName = currentTemplate.replace(/\.pdf$/i, '');
        
        const { value: newName } = await Swal.fire({
            title: 'Renomear Template',
            html: `
                <p class="text-sm text-gray-600 mb-3">Template atual: <strong>${currentTemplate}</strong></p>
                <input id="swal-input-rename" class="swal2-input" placeholder="Novo nome (sem .pdf)" value="${baseName}">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Renomear',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const input = document.getElementById('swal-input-rename').value;
                if (!input || input.trim() === '') {
                    Swal.showValidationMessage('Por favor, digite um nome válido');
                    return false;
                }
                return input.trim();
            }
        });
        
        if (!newName) return;
        
        const finalNewName = newName.endsWith('.pdf') ? newName : `${newName}.pdf`;
        
        // Verifica se o nome é o mesmo
        if (finalNewName === currentTemplate) {
            await Swal.fire({
                icon: 'info',
                title: 'Mesmo Nome',
                text: 'O novo nome é igual ao nome atual.',
                confirmButtonText: 'OK'
            });
            return;
        }
        
        try {
            // Se for do servidor, renomeia no servidor
            if (currentTemplateSource === 'templates') {
                const renameResponse = await fetch('/api/rename-template', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        oldName: currentTemplate,
                        newName: finalNewName
                    })
                });
                
                const renameResult = await renameResponse.json();
                
                if (!renameResult.success) {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Erro ao Renomear',
                        text: renameResult.message || renameResult.error || 'Não foi possível renomear o template do servidor.',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
                
                console.log('✅ Template renomeado no servidor:', currentTemplate, '→', finalNewName);
                
                // Atualização CIRÚRGICA: só atualiza o nome na lista, sem recarregar tudo!
                updateTemplateNameInList(currentTemplate, finalNewName, currentTemplateSource);
                
                // Atualiza apenas as variáveis internas, SEM recarregar o PDF
                currentTemplate = finalNewName;
                currentFileName.textContent = finalNewName;
                
                await Swal.fire({
                    icon: 'success',
                    title: 'Renomeado!',
                    text: `Template renomeado para '${finalNewName}'`,
                    timer: 1500,
                    showConfirmButton: false
                });
                
            } else if (currentTemplateSource === 'indexeddb' || currentTemplateSource === 'clone') {
                // Se for do IndexedDB (template ou clone), renomeia no IndexedDB
                await renameTemplateInIndexedDB(currentTemplate, finalNewName);
                
                // Atualização CIRÚRGICA: só atualiza o nome na lista, sem recarregar tudo!
                updateTemplateNameInList(currentTemplate, finalNewName, currentTemplateSource);
                
                // Atualiza apenas as variáveis internas, SEM recarregar o PDF
                currentTemplate = finalNewName;
                currentFileName.textContent = finalNewName;
                
                await Swal.fire({
                    icon: 'success',
                    title: 'Renomeado!',
                    text: `Template renomeado para '${finalNewName}'`,
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Erro ao renomear template:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: 'Erro ao renomear template: ' + error.message,
                confirmButtonText: 'OK'
            });
        }
    });
}

// Delete template button
const deleteTemplateBtn = document.getElementById('deleteTemplateBtn');
if (deleteTemplateBtn) {
    deleteTemplateBtn.addEventListener('click', async () => {
        if (!currentTemplate) {
            await Swal.fire({
                icon: 'warning',
                title: 'Atenção',
                text: 'Nenhum template carregado para excluir.',
                confirmButtonText: 'OK'
            });
            return;
        }
        
        // 🔒 VALIDAÇÃO BACKEND: Verifica se pode excluir
        try {
            const response = await fetch(`/api/template/${currentTemplate}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (!result.success) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Exclusão não permitida',
                    text: result.message,
                    confirmButtonText: 'OK'
                });
                return;
            }
        } catch (error) {
            console.error('Erro ao validar exclusão:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Erro de validação',
                text: 'Não foi possível validar a exclusão do template.',
                confirmButtonText: 'OK'
            });
            return;
        }
        
        // Se passou na validação, pede confirmação
        const result = await Swal.fire({
            title: 'Confirmar Exclusão',
            html: `
                <p class="text-sm text-gray-600 mb-3">Tem certeza que deseja excluir?</p>
                <p class="text-base font-semibold text-red-600">${currentTemplate}</p>
                <p class="text-xs text-gray-500 mt-3">Esta ação não pode ser desfeita!</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        });
        
        if (!result.isConfirmed) return;
        
        try {
            // Mostra loading
            Swal.fire({
                title: 'Excluindo...',
                text: 'Por favor aguarde',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // Se for template do servidor, exclui no servidor
            if (currentTemplateSource === 'templates') {
                const deleteResponse = await fetch(`/api/template/${currentTemplate}`, {
                    method: 'DELETE'
                });
                
                const deleteResult = await deleteResponse.json();
                
                if (!deleteResult.success) {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Erro ao Excluir',
                        text: deleteResult.message || 'Não foi possível excluir o template do servidor.',
                        confirmButtonText: 'OK'
                    });
                    return;
                }
                
                console.log('✅ Template excluído do servidor:', currentTemplate);
            } else {
                // Se for do IndexedDB ou clone, deleta do IndexedDB
                await deleteTemplateFromIndexedDB(currentTemplate);
                console.log('✅ Template excluído do IndexedDB:', currentTemplate);
            }
            
            // Salva o source antes de limpar
            const deletedSource = currentTemplateSource;
            const deletedName = currentTemplate;
            
            // Limpa o estado atual
            currentTemplate = null;
            currentTemplateSource = null;
            templateConfig = { fields: [] };
            pdfContainer.innerHTML = '';
            
            // Esconde a toolbar e o label
            const fileActionsToolbar = document.getElementById('fileActionsToolbar');
            if (fileActionsToolbar) {
                fileActionsToolbar.classList.add('hidden');
            }
            currentFileLabel.classList.add('hidden');

            if (actionBar) {
                actionBar.classList.add('hidden');
            }

            // Esconde o botão de modo edição
            if (toggleModeBtn) {
                toggleModeBtn.classList.add('hidden');
            }
            
            await Swal.fire({
                icon: 'success',
                title: 'Excluído!',
                text: 'Template excluído com sucesso.',
                confirmButtonText: 'OK'
            });
            
            // Atualização CIRÚRGICA: remove apenas o item da lista, sem recarregar tudo!
            removeTemplateFromList(deletedName, deletedSource);
            
        } catch (error) {
            console.error('Erro ao excluir template:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: 'Erro ao excluir template: ' + error.message,
                confirmButtonText: 'OK'
            });
        }
    });
}

// 🔒 Verificar modo produção e carregar templates quando a página carrega
(async () => {
    await checkProductionMode();
    await loadTemplates();
    loadClonedFiles();
    
    // Atualiza o estado inicial dos botões
    updateButtonsState();
})();

// // Migrar arquivos gerados do servidor para IndexedDB (primeira vez)
// (async () => {
//     try {
//         const result = await migrateGeneratedFilesToIndexedDB();
//         if (result.count > 0) {
//             console.log(`🎉 ${result.count} arquivos migrados para IndexedDB`);
//             // Recarregar a lista de clones após migração
//             await loadClonedFiles();
//         }
//     } catch (error) {
//         console.error('Erro ao migrar arquivos:', error);
//     }
// })();

async function renderPDF(url) {
    console.log(`[renderPDF] INICIANDO - URL: ${url}`);
    console.log(`[renderPDF] Campos existentes em createdFields: ${createdFields.length}`);
    console.log(`[renderPDF] Campos em templateConfig.fields: ${templateConfig.fields?.length || 0}`);
    
    // Mostra o loader ANTES de limpar o container
    const pdfLoader = document.getElementById('pdfLoader');
    if (pdfLoader) {
        pdfLoader.classList.remove('hidden');
    }
    
    // Delay para visualizar o loader
    await new Promise(resolve => setTimeout(resolve, 50));
    
    pdfContainer.innerHTML = "";
    
    // Re-cria o loader (já que innerHTML apagou tudo)
    const loaderDiv = document.createElement('div');
    loaderDiv.id = 'pdfLoader';
    loaderDiv.className = 'absolute inset-0 flex items-center justify-center z-50';
    loaderDiv.innerHTML = '<div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>';
    pdfContainer.appendChild(loaderDiv);
    
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

        canvas.onclick = async (e) => {
            if (!isEditorMode) return;
            
            // Remove o toast imediatamente ao clicar no PDF
            const editModeToast = document.getElementById('editModeToast');
            if (editModeToast && editModeToast.classList.contains('show')) {
                editModeToast.classList.remove('show');
                editModeToast.classList.add('hide');
                editModeToast.removeAttribute('data-auto-hide');
            }
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const { value: fieldName } = await Swal.fire({
                title: 'Novo Campo',
                input: 'text',
                inputLabel: 'Digite o nome do campo:',
                inputPlaceholder: 'Nome do campo',
                showCancelButton: true,
                confirmButtonText: 'Criar',
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    if (!value || !value.trim()) {
                        return 'Por favor, digite um nome válido!';
                    }
                }
            });
            
            // Se o usuário cancelar ou não digitar nada, não cria o campo
            if (!fieldName || fieldName.trim() === '') return;
            
            // Sempre salva a página do campo
            templateConfig.fields.push({ x, y, name: fieldName.trim(), value: '', page: pageNum, fontSize: 16 });
            createInputField(x, y, fieldName.trim(), '', isEditorMode, templateConfig.fields.length - 1, pageNum);
            
            // Esconde a dica flutuante após criar o primeiro campo
            const pdfClickHint = document.getElementById('pdfClickHint');
            if (pdfClickHint) {
                pdfClickHint.classList.remove('show');
            }
            
            // Auto-save após criar o campo
            if (currentTemplate) {
                try {
                    const configToSave = { 
                        fields: templateConfig.fields,
                        derivedFrom: templateConfig.derivedFrom 
                    };
                    
                    if (currentTemplateSource === 'indexeddb' || currentTemplateSource === 'clone') {
                        await saveTemplateConfigToIndexedDB(currentTemplate, configToSave);
                        console.log(`Campo criado e salvo no IndexedDB: ${fieldName.trim()}`);
                    } else {
                        await fetch(`/api/template-config/${currentTemplate}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(configToSave)
                        });
                        console.log(`Campo criado e salvo no servidor: ${fieldName.trim()}`);
                    }
                } catch (err) {
                    console.error('Erro ao salvar novo campo:', err);
                }
            }
        };
    }
    
    // Remove o loader após renderizar todas as páginas
    loaderDiv.remove();

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
    
    console.log(`[renderPDF] Campos limpos. Iniciando criação de ${templateConfig.fields?.length || 0} campos`);

    // Normaliza campos para garantir que todos tenham fontSize
    templateConfig.fields.forEach(field => {
        if (!field.fontSize) field.fontSize = 16;
    });

    templateConfig.fields.forEach((field, idx) => {
        console.log(`[renderPDF] Criando campo ${idx}: ${field.name} na página ${field.page || 1}`);
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
                    
                    // Salva automaticamente no backend OU no IndexedDB
                    if (currentTemplate) {
                        try {
                            // Preserva o derivedFrom se existir
                            const configToSave = { fields: templateConfig.fields };
                            if (templateConfig.derivedFrom) {
                                configToSave.derivedFrom = templateConfig.derivedFrom;
                            }
                            
                            // Se for do IndexedDB ou clone, salva no IndexedDB
                            if (currentTemplateSource === 'indexeddb' || currentTemplateSource === 'clone') {
                                await saveTemplateConfigToIndexedDB(currentTemplate, configToSave);
                                console.log(`Config salva no IndexedDB para: ${currentTemplate}`);
                            } else {
                                // Salva no servidor
                                await fetch(`/api/template-config/${currentTemplate}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(configToSave)
                                });
                                console.log(`Config salva no servidor para: ${currentTemplate}`);
                            }
                        } catch (err) {
                            // Silencioso, mas pode logar se quiser
                            console.error('Erro ao salvar config automaticamente', err);
                        }
                    }
                });
            }
        }
    });

    // Atualiza a visibilidade dos handles após todos os campos serem criados
    console.log(`[renderPDF] FINALIZADO - Campos criados: ${createdFields.length}, isEditorMode: ${isEditorMode}`);
    console.log(`[renderPDF] templateConfig.fields tem ${templateConfig.fields.length} campos`);
    toggleFieldEditButtons(isEditorMode);

    // Função para recalcular e atribuir tabindex baseado na posição dos campos
    function recalculateTabIndex() {
        // Coletar todos os inputs com suas posições
        const allInputs = [];
        createdFields.forEach(field => {
            if (field.input && field.wrapper) {
                const page = parseInt(field.input.dataset.page) || 1;
                const x = parseFloat(field.wrapper.style.left) || 0;
                const y = parseFloat(field.wrapper.style.top) || 0;
                allInputs.push({ input: field.input, page, x, y });
            }
        });

        // Ordenar: primeiro por página, depois por Y (com tolerância), depois por X
        const LINE_TOLERANCE = 15; // pixels de tolerância para considerar "mesma linha"
        
        allInputs.sort((a, b) => {
            // 1. Ordenar por página
            if (a.page !== b.page) return a.page - b.page;
            
            // 2. Verificar se estão na mesma linha (tolerância de Y)
            const yDiff = Math.abs(a.y - b.y);
            if (yDiff <= LINE_TOLERANCE) {
                // Mesma linha: ordenar por X (esquerda para direita)
                return a.x - b.x;
            }
            
            // 3. Linhas diferentes: ordenar por Y (cima para baixo)
            return a.y - b.y;
        });

        // Atribuir tabindex sequencial começando do 1
        allInputs.forEach((item, index) => {
            item.input.tabIndex = index + 1;
        });

        console.log(`[TabIndex] Recalculado para ${allInputs.length} campos`);
    }

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
        dragHandle.style.width = '14px';
        dragHandle.style.height = '14px';
        dragHandle.style.background = '#fff';
        dragHandle.style.border = '2px solid #888';
        dragHandle.style.borderRadius = '50%';
        dragHandle.style.position = 'absolute';
        dragHandle.style.left = '50%';
        dragHandle.style.top = '-5px';
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
                    
                    // Auto-save após mover o campo
                    if (currentTemplate && templateConfig.fields[idx]) {
                        const configToSave = { 
                            fields: templateConfig.fields,
                            derivedFrom: templateConfig.derivedFrom 
                        };
                        
                        if (currentTemplateSource === 'indexeddb' || currentTemplateSource === 'clone') {
                            saveTemplateConfigToIndexedDB(currentTemplate, configToSave).catch(err => {
                                console.error('Erro ao salvar posição no IndexedDB:', err);
                            });
                        } else {
                            fetch(`/api/template-config/${currentTemplate}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(configToSave)
                            }).catch(err => {
                                console.error('Erro ao salvar posição no servidor:', err);
                            });
                        }
                    }
                    
                    // Recalcula tabindex após mover campo
                    recalculateTabIndex();
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
        resizeHandle.style.width = '12px';
        resizeHandle.style.height = '12px';
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.right = '-8px';
        resizeHandle.style.bottom = '-8px';
        resizeHandle.style.cursor = 'nwse-resize';
        resizeHandle.style.zIndex = '10001';
        resizeHandle.title = 'Arraste para redimensionar';
        resizeHandle.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16"><path d="M2 14L14 2M10 2h4v4" stroke="#1e40af" stroke-width="2" fill="none"/></svg>`;
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
                    
                    // Auto-save após redimensionar o campo
                    if (currentTemplate && templateConfig.fields[idx]) {
                        const configToSave = { 
                            fields: templateConfig.fields,
                            derivedFrom: templateConfig.derivedFrom 
                        };
                        
                        if (currentTemplateSource === 'indexeddb' || currentTemplateSource === 'clone') {
                            saveTemplateConfigToIndexedDB(currentTemplate, configToSave).catch(err => {
                                console.error('Erro ao salvar tamanho no IndexedDB:', err);
                            });
                        } else {
                            fetch(`/api/template-config/${currentTemplate}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(configToSave)
                            }).catch(err => {
                                console.error('Erro ao salvar tamanho no servidor:', err);
                            });
                        }
                    }
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
        fontSizeHandle.style.width = '14px';
        fontSizeHandle.style.height = '14px';
        fontSizeHandle.style.position = 'absolute';
        fontSizeHandle.style.left = '-8px';
        fontSizeHandle.style.top = '-5px';
        fontSizeHandle.style.cursor = 'ns-resize';
        fontSizeHandle.style.zIndex = '10001';
        fontSizeHandle.style.background = '#fff';
        fontSizeHandle.style.border = '2px solid #16a34a';
        fontSizeHandle.style.borderRadius = '50%';
        fontSizeHandle.style.display = 'flex';
        fontSizeHandle.style.alignItems = 'center';
        fontSizeHandle.style.justifyContent = 'center';
        fontSizeHandle.title = 'Arraste para ajustar tamanho da fonte';
        fontSizeHandle.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12"><path d="M6 1L6 11M3 3L6 1L9 3M3 9L6 11L9 9" stroke="#16a34a" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        
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
                    
                    // Auto-save após ajustar fonte
                    if (currentTemplate && templateConfig.fields[idx]) {
                        const configToSave = { 
                            fields: templateConfig.fields,
                            derivedFrom: templateConfig.derivedFrom 
                        };
                        
                        if (currentTemplateSource === 'indexeddb' || currentTemplateSource === 'clone') {
                            saveTemplateConfigToIndexedDB(currentTemplate, configToSave).catch(err => {
                                console.error('Erro ao salvar fontSize no IndexedDB:', err);
                            });
                        } else {
                            fetch(`/api/template-config/${currentTemplate}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(configToSave)
                            }).catch(err => {
                                console.error('Erro ao salvar fontSize no servidor:', err);
                            });
                        }
                    }
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
        input.placeholder = templateConfig.fields[idx]?.hint || name;
        input.dataset.x = x;
        input.dataset.y = y;
        input.dataset.page = page;
        input.id = uniqueId + '-input';
        input.style.height = (templateConfig.fields[idx]?.height || 20) + 'px';
        input.style.width = (templateConfig.fields[idx]?.width || 120) + 'px';
        input.style.fontSize = (templateConfig.fields[idx]?.fontSize || 16) + 'px';

        // Evento de clique para editar propriedades do campo (apenas em modo edição)
        const onInputClick = async (e) => {
            if (!isEditorMode) return; // Só permite edição em modo editor
            
            e.stopPropagation();
            
            // Pega valores atuais
            const currentName = input.dataset.fieldName || name;
            const currentHint = templateConfig.fields[idx]?.hint || '';
            const currentValue = input.value || '';
            
            const result = await Swal.fire({
                title: 'Configurar Campo',
                html: `
                    <div style="text-align: left;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                            Nome do campo:
                        </label>
                        <input id="fieldNameInput" class="swal2-input" placeholder="Ex: Nome completo" value="${currentName}" style="margin: 0 0 1rem 0; width: 100%;">
                        
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                            Dica de formato:
                        </label>
                        <input id="fieldHintInput" class="swal2-input" placeholder="Ex: dd/mm/yyyy" value="${currentHint}" style="margin: 0 0 0.25rem 0; width: 100%;">
                        <small style="color: #6b7280; display: block; margin-bottom: 1rem;">Esta dica aparecerá como placeholder do campo</small>
                        
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                            Conteúdo:
                        </label>
                        <input id="fieldValueInput" class="swal2-input" value="${currentValue}" style="margin: 0; width: 100%;">
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Salvar',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const newName = document.getElementById('fieldNameInput').value.trim();
                    const newHint = document.getElementById('fieldHintInput').value.trim();
                    const newValue = document.getElementById('fieldValueInput').value.trim();
                    
                    if (!newName) {
                        Swal.showValidationMessage('O nome do campo é obrigatório');
                        return false;
                    }
                    
                    return { name: newName, hint: newHint, value: newValue };
                }
            });
            
            if (result.isConfirmed && result.value) {
                const { name: newName, hint: newHint, value: newValue } = result.value;
                
                // Atualiza o campo
                input.dataset.fieldName = newName;
                input.placeholder = newHint || newName;
                input.value = newValue;
                
                // Atualiza no config
                if (templateConfig.fields[idx]) {
                    templateConfig.fields[idx].name = newName;
                    templateConfig.fields[idx].hint = newHint;
                    templateConfig.fields[idx].value = newValue;
                }
                
                // Auto-save
                if (currentTemplate) {
                    const configToSave = { 
                        fields: templateConfig.fields,
                        derivedFrom: templateConfig.derivedFrom 
                    };
                    
                    if (currentTemplateSource === 'indexeddb' || currentTemplateSource === 'clone') {
                        await saveTemplateConfigToIndexedDB(currentTemplate, configToSave).catch(err => {
                            console.error('Erro ao salvar propriedades do campo no IndexedDB:', err);
                        });
                    } else {
                        fetch(`/api/template-config/${currentTemplate}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(configToSave)
                        }).catch(err => {
                            console.error('Erro ao salvar propriedades do campo no servidor:', err);
                        });
                    }
                }
            }
        };
        
        input.addEventListener('click', onInputClick);
        listeners.push({ target: input, type: 'click', handler: onInputClick });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "×";
        deleteBtn.className = "text-red-600 hover:text-red-800 font-bold absolute bg-white rounded-full border border-red-200 shadow group-hover:block flex items-center justify-center";
        deleteBtn.style.width = '12px';
        deleteBtn.style.height = '12px';
        deleteBtn.style.fontSize = '10px';
        deleteBtn.style.lineHeight = '12px';
        deleteBtn.style.padding = '0';
        deleteBtn.style.top = '-3px';
        deleteBtn.style.right = '-8px';
        deleteBtn.style.display = 'block';
        deleteBtn.style.zIndex = '9999';
        const onDelete = async (e) => {
            e.stopPropagation();
            
            // Confirmação antes de excluir
            const result = await Swal.fire({
                title: 'Excluir campo?',
                text: `Deseja realmente excluir o campo "${name}"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Sim, excluir',
                cancelButtonText: 'Cancelar'
            });
            
            if (result.isConfirmed) {
                templateConfig.fields.splice(idx, 1);
                listeners.forEach(({ target, type, handler }) => {
                    target.removeEventListener(type, handler);
                });
                if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
                
                // Remove o campo do array createdFields
                const fieldIndex = createdFields.findIndex(f => f.wrapper === wrapper);
                if (fieldIndex !== -1) {
                    createdFields.splice(fieldIndex, 1);
                }
                
                // Auto-save após excluir o campo
                if (currentTemplate) {
                    const configToSave = { 
                        fields: templateConfig.fields,
                        derivedFrom: templateConfig.derivedFrom 
                    };
                    
                    if (currentTemplateSource === 'indexeddb' || currentTemplateSource === 'clone') {
                        await saveTemplateConfigToIndexedDB(currentTemplate, configToSave).catch(err => {
                            console.error('Erro ao salvar após exclusão no IndexedDB:', err);
                        });
                    } else {
                        fetch(`/api/template-config/${currentTemplate}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(configToSave)
                        }).catch(err => {
                            console.error('Erro ao salvar após exclusão no servidor:', err);
                        });
                    }
                }
                
                // Recalcula tabindex após excluir campo
                recalculateTabIndex();
            }
        };
        deleteBtn.addEventListener('click', onDelete);
        listeners.push({ target: deleteBtn, type: 'click', handler: onDelete });

        wrapper.appendChild(deleteBtn);
        wrapper.appendChild(dragHandle);
        wrapper.appendChild(input);
        wrapper.appendChild(resizeHandle);
        wrapper.appendChild(fontSizeHandle);

        createdFields.push({ wrapper, input, dragHandle, deleteBtn, resizeHandle, fontSizeHandle, listeners });
        
        // Recalcula tabindex após adicionar novo campo
        recalculateTabIndex();
        
        return wrapper;
    }
}

downloadBtn.addEventListener("click", async () => {
    if (!currentPdfUrl) return;

    // 1. Determina o nome padrão do arquivo atual (sem extensão .pdf)
    let defaultName = 'meu-formulario';
    if (currentTemplate) {
        // Remove a extensão .pdf do nome atual
        defaultName = currentTemplate.replace(/\.pdf$/i, '');
    }
    
    // 2. Pergunta o nome do arquivo ao usuário usando SweetAlert2
    const { value: userFileName } = await Swal.fire({
        title: 'Salvar PDF Preenchido',
        input: 'text',
        inputLabel: 'Digite o nome do arquivo:',
        inputValue: defaultName,
        showCancelButton: true,
        confirmButtonText: 'Baixar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        inputValidator: (value) => {
            if (!value) {
                return 'Por favor, digite um nome para o arquivo!';
            }
        }
    });
    
    if (!userFileName) return;
    
    // 3. Determina qual PDF usar como base
    // Se o arquivo atual tem derivedFrom, SEMPRE usa o template original limpo
    let basePdfUrl = currentPdfUrl;
    if (templateConfig.derivedFrom) {
        basePdfUrl = `/api/pdf-templates/${templateConfig.derivedFrom}`;
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
    
    // Download direto no navegador (client-side)
    try {
        const fileName = `${userFileName}.pdf`;
        
        // Criar um Blob com os bytes do PDF
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        // Criar um link temporário para download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        
        // Adicionar ao DOM, clicar e remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Liberar o objeto URL
        URL.revokeObjectURL(link.href);
        
        console.log(`PDF "${fileName}" baixado com sucesso!`);
        
        // Mostrar mensagem de sucesso com SweetAlert2
        Swal.fire({
            icon: 'success',
            title: 'PDF Baixado!',
            text: `O arquivo "${fileName}" foi baixado com sucesso!`,
            confirmButtonColor: '#3085d6',
            timer: 3000,
            timerProgressBar: true
        });
        
    } catch (err) {
        console.error("Erro ao fazer download do PDF:", err);
        
        // Mostrar erro com SweetAlert2
        Swal.fire({
            icon: 'error',
            title: 'Erro ao Baixar',
            text: 'Ocorreu um erro ao fazer o download do PDF.',
            confirmButtonColor: '#d33'
        });
    }
});

function toggleFieldEditButtons(show) {
    console.log(`[toggleFieldEditButtons] show=${show}, createdFields.length=${createdFields.length}`);
    createdFields.forEach((fieldObj, idx) => {
        console.log(`  Campo ${idx}:`, {
            hasDragHandle: !!fieldObj.dragHandle,
            hasDeleteBtn: !!fieldObj.deleteBtn,
            hasResizeHandle: !!fieldObj.resizeHandle,
            hasFontSizeHandle: !!fieldObj.fontSizeHandle
        });
        if (fieldObj.dragHandle) fieldObj.dragHandle.style.display = show ? 'block' : 'none';
        if (fieldObj.deleteBtn) fieldObj.deleteBtn.style.display = show ? 'block' : 'none';
        if (fieldObj.resizeHandle) fieldObj.resizeHandle.style.display = show ? 'block' : 'none';
        if (fieldObj.fontSizeHandle) fieldObj.fontSizeHandle.style.display = show ? 'block' : 'none';
    });
}
