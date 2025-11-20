# egar

PDF Form Editor - Editor de formulários PDF com preenchimento automático e templates configuráveis.

## 🚀 Quick Start

### Development

```bash
npm install
npm run watch:css  # Build CSS em modo watch
npm run dev        # Iniciar servidor de desenvolvimento
```

Acesse: `http://localhost:3000`

### Production

```bash
npm run build:css  # Build CSS otimizado
npm start          # Iniciar servidor em modo produção
```

---

## 📋 Funcionalidades

- ✅ Editor visual de formulários PDF
- ✅ Criação de templates reutilizáveis
- ✅ Preenchimento de formulários com validação
- ✅ Sistema de clonagem de templates
- ✅ Sincronização com origem (IndexedDB)
- ✅ Download de PDFs preenchidos
- ✅ **Carregamento automático via URL** (novo!)

---

## 🔗 Carregar Templates via URL

Você pode carregar templates automaticamente através de parâmetros na URL:

### Exemplos:

```bash
# Carregar template específico
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf

# Carregar em modo edição
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&mode=edit

# Abrir modal de preenchimento automaticamente
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&autofill=true

# Clonar template automaticamente
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&autoclone=true

# Clonar SEM PERGUNTAR nome (quick clone - nome automático)
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&autoclone=true&quickclone=true

# Clonar E preencher automaticamente
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&autoclone=true&autofill=true

# Quick clone + Preencher (experiência mais rápida!)
http://localhost:3000/?template=Formulário_Visto_Mexicano.pdf&autoclone=true&quickclone=true&autofill=true

# Carregar clone/arquivo salvo
http://localhost:3000/?clone=meu-formulario-preenchido
```

### Parâmetros disponíveis:

| Parâmetro | Descrição | Valores |
|-----------|-----------|---------|
| `template` | Nome do template a carregar | Nome do arquivo PDF |
| `clone` | Nome do clone a carregar | Nome do clone salvo |
| `mode` | Modo de abertura | `edit` ou `fill` |
| `autofill` | Abrir modal de preenchimento | `true` |
| `autoclone` | Clonar template automaticamente | `true` |
| `quickclone` | Clonar sem perguntar nome (requer `autoclone=true`) | `true` |

📖 **Documentação completa:** [docs/URL_QUERY_PARAMETERS.md](docs/URL_QUERY_PARAMETERS.md)

---

## 🛠️ PM2 Configuration

How to use `ecosystem.config.cjs`

```json
module.exports = {
  apps: [
    {
      name: "egar",
      script: "server.js",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}
```

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

> PM2 will print a command (with sudo).
> # Something like:
> sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u yourUser --hp /home/yourUser

---

## 📚 Documentação Adicional

- [Como Criar Seus Próprios Modelos](docs/COMO_CRIAR_SEUS_PROPRIOS_MODELOS.md)
- [Parâmetros de URL](docs/URL_QUERY_PARAMETERS.md)
- [Auto-Detecção de Campos (IA)](docs/AUTO_DETECT_FIELDS.md)
- [Migração Vue vs React](docs/MIGRACAO_PROJETO_VUE_VS_REACT.md)

---

## 🎨 Tailwind CSS

O projeto usa Tailwind CSS otimizado com build system:

```bash
# Desenvolvimento (watch mode)
npm run watch:css

# Produção (minificado)
npm run build:css
```

**Tamanho:** ~31KB (vs ~3.5MB do CDN) - redução de 99%!

---

## 🗂️ Estrutura do Projeto

```
egar/
├── docs/               # Documentação
├── public/             # Frontend
│   ├── css/           # Estilos (Tailwind)
│   ├── js/            # Scripts
│   └── index.html     # App principal
├── server.js          # Backend Express
├── template-configs/  # Configurações de templates
├── template-files/    # Arquivos PDF base
└── generated-pdf-files/ # PDFs gerados
```

---

## 🔒 Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
NODE_ENV=production
PORT=3000
PROD=true  # Modo produção (esconde botões de dev)
```

---

## 📝 Licença

ISC

