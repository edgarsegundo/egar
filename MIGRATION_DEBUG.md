# Debug da Migração

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
