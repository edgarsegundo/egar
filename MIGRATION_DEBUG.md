# Debug da Migração e Funcionalidades IndexedDB

## ✅ Funcionalidades Implementadas

### 1. Exclusão de Templates (NOVO)
- **Botão**: Ícone de lixeira vermelho na toolbar
- **Funciona para**:
  - ✅ Meus Templates (IndexedDB)
  - ✅ Arquivos Clonados (IndexedDB)
  - ❌ Templates do Servidor (não pode excluir)
  
- **Comportamento**:
  - Confirmação com SweetAlert2
  - Remove PDF e configuração do IndexedDB
  - Recarrega listas automaticamente
  - Limpa o estado atual

### 2. Auto-Save
- **Digitar em campos**: Salva automaticamente
- **Mover campos**: Salva ao soltar (drag handle)
- **Redimensionar**: Salva ao soltar (resize handle)
- **Ajustar fonte**: Salva ao soltar (fontSize handle)

### 3. Renomear Templates
- **Funciona para**: IndexedDB e Servidor
- **Preserva**: Todas as configurações e campos

### 4. Clonar Templates
- **Origem**: Templates do Servidor ou IndexedDB
- **Destino**: Sempre IndexedDB (como clone)
- **Preserva**: PDF, configuração, derivedFrom

---

## Limpar IndexedDB e LocalStorage

Execute no Console do navegador (F12):

```javascript
// Limpar flag de migração
localStorage.removeItem('indexeddb_migration_completed');

// Limpar todo o IndexedDB
indexedDB.deleteDatabase('PDFTemplatesDB');

// Recarregar página
location.reload();
```

## Ver dados no IndexedDB

```javascript
// Listar todos os templates
listIndexedDBTemplates().then(console.log);

// Listar todos os clones
listIndexedDBClones().then(console.log);

// Ver configuração de um template
loadTemplateConfigFromIndexedDB('nome-do-arquivo.pdf').then(console.log);
```

## Forçar nova migração

```javascript
localStorage.removeItem('indexeddb_migration_completed');
migrateGeneratedFilesToIndexedDB().then(result => {
    console.log('Resultado:', result);
    loadClonedFiles();
});
```

## Excluir um template manualmente

```javascript
// Excluir do IndexedDB
deleteTemplateFromIndexedDB('nome-do-arquivo.pdf').then(() => {
    console.log('Template excluído!');
    loadTemplates();
    loadClonedFiles();
});
```

## Verificar se há duplicatas

```javascript
// Verificar campos de um arquivo específico
fetch('/template-config/test-1.pdf')
    .then(r => r.json())
    .then(config => {
        console.log('Campos no servidor:', config.fields.length);
        console.log('Campos:', config.fields);
    });

// Comparar com IndexedDB
loadTemplateConfigFromIndexedDB('test-1.pdf').then(config => {
    console.log('Campos no IndexedDB:', config?.fields?.length);
    console.log('Campos:', config?.fields);
});
```

