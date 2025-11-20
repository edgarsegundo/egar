# Query Parameters na URL

## 🔗 Visão Geral

O sistema agora suporta carregar templates e clones automaticamente através de parâmetros na URL. Isso permite criar links diretos para formulários específicos.

---

## 📋 Parâmetros Disponíveis

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `template` | string | Nome do template a carregar | `Formulário_Visto_Mexicano.pdf` |
| `clone` | string | Nome do clone/arquivo gerado a carregar | `meu-formulario-2024` |
| `mode` | string | Modo de abertura: `edit` ou `fill` | `edit` |
| `autofill` | boolean | Se `true`, abre automaticamente o modal de preenchimento | `true` |
| `autoclone` | boolean | Se `true`, clona o template automaticamente | `true` |
| `quickclone` | boolean | Se `true`, clona sem perguntar nome (requer `autoclone=true`) | `true` |

**⚠️ Importante:** Quando `autoclone=true`, a URL é automaticamente limpa após criar o clone para evitar duplicatas ao favoritar/recarregar a página.

---

## 🎯 Exemplos de Uso

### 1. Carregar Template Específico

```url
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf
```

**O que acontece:**
- ✅ Carrega o template do Visto Mexicano
- ✅ Modo visualização (padrão)
- ✅ Pronto para preencher

---

### 2. Carregar Template em Modo Edição

```url
http://localhost:3000/?template=Autorização_Viagem_Internacional.pdf&mode=edit
```

**O que acontece:**
- ✅ Carrega o template de Autorização de Viagem
- ✅ Ativa automaticamente o **Modo Edição**
- ✅ Permite editar posição dos campos

---

### 3. Carregar Template e Abrir Modal de Preenchimento

```url
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&autofill=true
```

**O que acontece:**
- ✅ Carrega o template
- ✅ Abre automaticamente o modal de preenchimento
- ✅ Usuário pode começar a preencher imediatamente

---

### 4. Clonar Template Automaticamente

```url
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&autoclone=true
```

**O que acontece:**
- ✅ Carrega o template
- ✅ Pede nome do clone ao usuário
- ✅ Cria clone automaticamente
- ✅ **Redireciona para URL limpa** (evita duplicatas ao favoritar)

---

### 5. Quick Clone (Clone Rápido sem Prompt)

```url
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&autoclone=true&quickclone=true
```

**⭐ Recomendado para compartilhar em fóruns/redes sociais**

**O que acontece:**
- ✅ Carrega o template
- ✅ Cria clone automaticamente com nome incremental ("Template - Cópia 1", "Cópia 2", etc.)
- ✅ Mostra toast notification discreta
- ✅ **Redireciona para URL limpa** (seguro para favoritar!)

---

### 6. Quick Clone + AutoFill (Experiência Mais Rápida!)

```url
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&autoclone=true&quickclone=true&autofill=true
```

**⭐ Melhor experiência do usuário: zero cliques!**

**O que acontece:**
- ✅ Carrega template
- ✅ Cria clone automaticamente
- ✅ Abre modal de preenchimento
- ✅ **Redireciona para URL limpa**
- 🎯 Usuário começa a preencher imediatamente

---

### 7. Carregar Clone/Arquivo Gerado

```url
http://localhost:3000/?clone=meu-formulario-preenchido
```

**O que acontece:**
- ✅ Carrega o clone do IndexedDB
- ✅ Mostra formulário previamente salvo
- ✅ Pronto para editar ou baixar

---

### 8. Carregar Clone em Modo Edição

```url
http://localhost:3000/?clone=meu-formulario-preenchido&mode=edit
```

**O que acontece:**
- ✅ Carrega o clone
- ✅ Ativa modo edição
- ✅ Permite ajustar campos

---

### 9. Combinar Múltiplos Parâmetros

```url
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&mode=edit&autofill=true
```

**O que acontece:**
- ✅ Carrega template em modo edição
- ✅ Abre modal de preenchimento

---

## 🔄 Prioridade de Parâmetros

Se múltiplos parâmetros forem fornecidos:

1. **`clone`** tem prioridade sobre `template`
2. Se `clone` existir, `template` é ignorado
3. `mode` e `autofill` funcionam com ambos

**Exemplo:**
```url
http://localhost:3000/?template=Template1.pdf&clone=MeuClone
```
→ Carrega **MeuClone** (ignora Template1.pdf)

---

## 💡 Casos de Uso Práticos

### 1. 🌐 Compartilhamento em Fóruns e Redes Sociais (Recomendado)

**Use `quickclone=true` para evitar duplicatas!**

```url
https://fastvistos.com.br/formularios/?template=Formulário_Visto_Mexicano.pdf&autoclone=true&quickclone=true&autofill=true
```

**Por que usar quickclone?**
- ✅ Cada pessoa que clicar terá seu próprio clone (privado)
- ✅ Após criar o clone, a URL é limpa automaticamente
- ✅ Seguro para favoritar/bookmarkar
- ✅ **Não cria clones duplicados** ao recarregar a página
- ✅ Experiência zero-clique: abre direto no formulário de preenchimento

**O que acontece:**

1. **Primeiro clique** (ex: de um fórum):
   - URL original: `?template=Form.pdf&autoclone=true&quickclone=true&autofill=true`
   - Cria clone automaticamente: "Formulário_Visto_Mexicano - Cópia 1"
   - Abre modal de preenchimento
   - **Redireciona para:** `https://fastvistos.com.br/formularios/` (URL limpa)

2. **Ao favoritar/recarregar:**
   - URL agora é: `https://fastvistos.com.br/formularios/`
   - Mostra tela inicial com o clone já criado
   - **Não cria novos clones**

---

### 2. Link de Compartilhamento Simples

Envie um link para alguém preencher um formulário específico:

```url
https://seusite.com/?template=Formulário_Visto_Mexicano.pdf&autofill=true
```

---

### 3. Atalhos de Desktop

Crie atalhos no desktop para formulários frequentes:

```bash
# Windows
start chrome "http://localhost:3000/?template=Autorização_Viagem_Internacional.pdf"

# macOS
open -a "Google Chrome" "http://localhost:3000/?template=Autorização_Viagem_Internacional.pdf"

# Linux
xdg-open "http://localhost:3000/?template=Autorização_Viagem_Internacional.pdf"
```

---

### 4. Integração com Sistemas Externos

```javascript
// Sistema externo redireciona para formulário específico
const templateName = "Formulário_Visto_Mexicano.pdf";
const url = `https://seusite.com/?template=${encodeURIComponent(templateName)}&autofill=true`;
window.location.href = url;
```

---

### 5. Bookmarks Organizados

Salve favoritos no navegador:

- 📋 **Visto Mexicano**: `http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf`
- ✈️ **Autorização Viagem**: `http://localhost:3000/?template=Autorização_Viagem_Internacional.pdf`
- ✏️ **Editar Visto**: `http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&mode=edit`

---

## 🛠️ Implementação Técnica

### Função Principal: `loadTemplateFromURL()`

```javascript
async function loadTemplateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    const templateName = urlParams.get('template');
    const cloneName = urlParams.get('clone');
    const mode = urlParams.get('mode');
    const autoFill = urlParams.get('autofill');
    
    // Lógica de carregamento...
}
```

### Onde é Chamada

Executada automaticamente no carregamento da página:

```javascript
(async () => {
    await checkProductionMode();
    await loadTemplates();
    loadClonedFiles();
    
    // ✨ Carrega template da URL
    await loadTemplateFromURL();
    
    updateButtonsState();
})();
```

---

## ⚠️ Tratamento de Erros

### Template não encontrado

```url
http://localhost:3000/?template=NaoExiste.pdf
```

**Resposta:**
- 🚨 Alerta do SweetAlert2: "Template não encontrado"
- ⏱️ Auto-fecha em 3 segundos
- 📋 Carrega página normalmente (vazia)

### Clone não encontrado

```url
http://localhost:3000/?clone=arquivo-inexistente
```

**Resposta:**
- 🚨 Alerta: "Clone não encontrado"
- 📋 Não carrega nada

---

## 🔐 Segurança

### Validações Implementadas

1. ✅ **Verificação de existência**: Template/clone deve existir antes de carregar
2. ✅ **Sanitização**: Nomes são tratados pelo backend
3. ✅ **Path traversal**: Protegido pelo Express (não aceita `../`)

### Nomes Válidos

```javascript
// ✅ Válido
?template=Formulário_Visto_Mexicano.pdf
?clone=meu-arquivo-2024

// ❌ Inválido (será rejeitado pelo servidor)
?template=../../etc/passwd
?template=<script>alert('xss')</script>
```

---

## 📊 Encoding de URLs

### Caracteres Especiais

Sempre use `encodeURIComponent()` para nomes com caracteres especiais:

```javascript
// ❌ Errado
const url = `http://localhost:3000/?template=Formulário Visto.pdf`;

// ✅ Correto
const templateName = "Formulário Visto.pdf";
const url = `http://localhost:3000/?template=${encodeURIComponent(templateName)}`;
// Resultado: http://localhost:3000/?template=Formul%C3%A1rio%20Visto.pdf
```

### Exemplos de Encoding

| Original | Encoded |
|----------|---------|
| `Formulário_Visto_Mexicano.pdf` | `Formul%C3%A1rio_Visto_Mexicano.pdf` |
| `Autorização Viagem.pdf` | `Autoriza%C3%A7%C3%A3o%20Viagem.pdf` |
| `Documento & Anexo.pdf` | `Documento%20%26%20Anexo.pdf` |

---

## 🎨 Criar Links Dinamicamente

### HTML

```html
<a href="/?template=Formulário_Visto_Mexicano.pdf&autofill=true" 
   class="btn btn-primary">
   Preencher Visto Mexicano
</a>
```

### JavaScript

```javascript
function createTemplateLink(templateName, mode = null, autofill = false) {
    const params = new URLSearchParams();
    params.set('template', templateName);
    if (mode) params.set('mode', mode);
    if (autofill) params.set('autofill', 'true');
    
    return `${window.location.origin}/?${params.toString()}`;
}

// Uso
const link = createTemplateLink('Formulário_Visto_Mexicano.pdf', null, true);
console.log(link);
// http://localhost:3000/?template=Formul%C3%A1rio_Visto_Mexicano.pdf&autofill=true
```

### React/Vue

```jsx
// React
function TemplateButton({ templateName }) {
    const handleClick = () => {
        const url = `/?template=${encodeURIComponent(templateName)}&autofill=true`;
        window.location.href = url;
    };
    
    return <button onClick={handleClick}>Preencher {templateName}</button>;
}

// Vue
<template>
    <button @click="openTemplate">Preencher {{ templateName }}</button>
</template>

<script>
export default {
    props: ['templateName'],
    methods: {
        openTemplate() {
            const url = `/?template=${encodeURIComponent(this.templateName)}&autofill=true`;
            window.location.href = url;
        }
    }
}
</script>
```

---

## 📱 Deep Links (Mobile)

Para aplicativos móveis/PWA:

```javascript
// Abrir aplicativo com template específico
const deepLink = `egar://template?name=${encodeURIComponent(templateName)}`;

// Fallback para web
if (!openedApp) {
    window.location.href = `https://seusite.com/?template=${encodeURIComponent(templateName)}`;
}
```

---

## 🧪 Testes

### Manual

```bash
# Teste 1: Template existente
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf

# Teste 2: Template inexistente
http://localhost:3000/?template=NaoExiste.pdf

# Teste 3: Modo edição
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&mode=edit

# Teste 4: Auto-fill
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&autofill=true

# Teste 5: Clone
http://localhost:3000/?clone=meu-clone

# Teste 6: Múltiplos parâmetros
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&mode=edit&autofill=true
```

### Automatizado (Futuramente)

```javascript
describe('URL Query Parameters', () => {
    test('should load template from URL', async () => {
        window.location.search = '?template=Formulário_Visto_Mexicano.pdf';
        await loadTemplateFromURL();
        expect(currentTemplate).toBe('Formulário_Visto_Mexicano.pdf');
    });
    
    test('should activate edit mode from URL', async () => {
        window.location.search = '?template=Formulário_Visto_Mexicano.pdf&mode=edit';
        await loadTemplateFromURL();
        expect(isEditorMode).toBe(true);
    });
});
```

---

## 🚀 Melhorias Futuras

### 1. Parâmetros Adicionais

- `page=2` - Abrir em página específica
- `zoom=150` - Definir zoom inicial
- `field=nome` - Focar em campo específico

### 2. Histórico de Navegação

```javascript
// Salvar histórico de templates acessados
localStorage.setItem('recentTemplates', JSON.stringify([
    { name: 'Template1.pdf', timestamp: Date.now() },
    { name: 'Template2.pdf', timestamp: Date.now() }
]));
```

### 3. Compartilhamento com Dados Pré-preenchidos

```url
http://localhost:3000/?template=Form.pdf&autofill=true&data=eyJub21lIjoiSm9hbyJ9
```

```javascript
// Decode base64 JSON
const dataParam = urlParams.get('data');
if (dataParam) {
    const prefillData = JSON.parse(atob(dataParam));
    // Preencher campos automaticamente
}
```

---

## 📚 Referências

- [URLSearchParams MDN](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- [encodeURIComponent MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
- [Query String RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986#section-3.4)

---

## ❓ FAQ

### Como obter o nome exato do template?

Veja na sidebar esquerda ou faça:

```javascript
// No console do navegador
console.log(currentTemplate);
```

### Posso usar espaços no nome?

Sim, mas use `encodeURIComponent()`:

```javascript
const url = `/?template=${encodeURIComponent('Meu Template.pdf')}`;
```

### E se o template tiver caracteres especiais?

O encoding automático resolve:

```javascript
'Formulário_Visto_Mexicano.pdf' → 'Formul%C3%A1rio_Visto_Mexicano.pdf'
```

### Como criar um link de compartilhamento?

```javascript
const shareLink = `${window.location.origin}/?template=${encodeURIComponent(templateName)}`;
navigator.clipboard.writeText(shareLink);
```

---

## 💬 Suporte

Para dúvidas ou problemas, verifique:

1. Console do navegador (F12 → Console)
2. Logs do servidor (`npm run dev`)
3. Documentação do projeto
