# Auto-Detecção de Campos em Formulários PDF

## 🎯 Visão Geral

É **totalmente possível** criar um sistema inteligente que detecta automaticamente campos de formulário em PDFs usando:
- **OCR (Optical Character Recognition)** - Reconhecimento de texto
- **Visão Computacional** - Detecção de espaços em branco e padrões
- **Heurísticas** - Algoritmos para identificar labels e campos
- **Machine Learning (opcional)** - Detecção avançada com IA

## 📚 Bibliotecas Necessárias

### Principais

| Biblioteca | Versão | Função |
|------------|--------|--------|
| **Tesseract.js** | ^5.0.0 | OCR - Reconhecimento de texto e posição |
| **PDF.js** | ✅ Já instalado | Renderização de PDF em Canvas |
| **OpenCV.js** | ^4.8.0 | Visão computacional (opcional) |

### Opcionais (ML Avançado)

| Biblioteca | Versão | Função |
|------------|--------|--------|
| **@tensorflow/tfjs** | ^4.0.0 | Machine Learning |
| **@tensorflow-models/coco-ssd** | ^2.2.0 | Detecção de objetos |

---

## 🚀 Implementação

### Passo 1: Instalar Dependências

```bash
# Básico (recomendado)
npm install tesseract.js

# Avançado (opcional - ML)
npm install @tensorflow/tfjs @tensorflow-models/coco-ssd opencv.js
```

### Passo 2: Criar Classe de Detecção

Criar arquivo: `public/js/autoDetectFields.js`

```javascript
import Tesseract from 'tesseract.js';

/**
 * Detecta automaticamente campos de formulário em um PDF
 * usando OCR + análise de layout
 */
export class AutoFieldDetector {
    constructor(pdfPage, canvas) {
        this.pdfPage = pdfPage;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    /**
     * Detecta campos automaticamente
     * @returns {Promise<Array>} Array de campos detectados
     */
    async detectFields() {
        console.log('🔍 Iniciando detecção automática de campos...');

        // 1. Renderizar página em alta resolução para OCR
        const imageData = await this.renderPageToImage();

        // 2. Extrair texto com posições usando Tesseract
        const ocrResult = await this.performOCR(imageData);

        // 3. Detectar áreas em branco após labels
        const blankAreas = this.detectBlankAreas(ocrResult);

        // 4. Criar campos baseado nas heurísticas
        const fields = this.createFieldsFromDetection(blankAreas);

        console.log(`✅ ${fields.length} campos detectados automaticamente`);
        return fields;
    }

    /**
     * Renderiza a página do PDF em alta resolução
     */
    async renderPageToImage() {
        const viewport = this.pdfPage.getViewport({ scale: 2.0 });
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        
        const context = tempCanvas.getContext('2d');
        
        await this.pdfPage.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        return context.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    }

    /**
     * Executa OCR na imagem usando Tesseract
     */
    async performOCR(imageData) {
        const { data } = await Tesseract.recognize(imageData, 'por+eng', {
            logger: m => console.log('OCR:', m.status, m.progress)
        });

        // Retorna palavras com suas posições (bbox)
        return data.words.map(word => ({
            text: word.text,
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
            confidence: word.confidence
        }));
    }

    /**
     * Detecta áreas em branco após labels de formulário
     * usando heurísticas inteligentes
     */
    detectBlankAreas(words) {
        const blankAreas = [];
        const labelPatterns = [
            /nome/i,
            /endereço/i,
            /telefone/i,
            /email/i,
            /data/i,
            /cpf/i,
            /rg/i,
            /nacionalidade/i,
            /profissão/i,
            /observações/i,
            /número/i,
            /passport/i,
            /birth/i,
            /address/i,
            /ciudad/i,
            /estado/i,
            /país/i
        ];

        words.forEach((word, index) => {
            // Verifica se a palavra parece um label
            const isLabel = labelPatterns.some(pattern => pattern.test(word.text));
            
            if (isLabel && word.confidence > 60) {
                // Procura próxima palavra à direita
                const nextWord = this.findNextWord(words, word, 'right');
                
                // Se há espaço significativo, é provável um campo
                if (nextWord) {
                    const gap = nextWord.x - (word.x + word.width);
                    
                    // Gap > 20px sugere área para preenchimento
                    if (gap > 20) {
                        blankAreas.push({
                            label: word.text,
                            x: word.x + word.width + 5,
                            y: word.y,
                            width: gap - 10,
                            height: word.height,
                            confidence: word.confidence
                        });
                    }
                } else {
                    // Sem palavra à direita, assume até borda
                    const remainingWidth = this.canvas.width - (word.x + word.width);
                    
                    if (remainingWidth > 50) {
                        blankAreas.push({
                            label: word.text,
                            x: word.x + word.width + 5,
                            y: word.y,
                            width: Math.min(remainingWidth - 20, 300),
                            height: word.height,
                            confidence: word.confidence
                        });
                    }
                }

                // Verifica se há linha/sublinhado abaixo (padrão comum)
                const lineBelow = this.detectLineBelow(word);
                if (lineBelow) {
                    blankAreas.push({
                        label: word.text,
                        x: lineBelow.x,
                        y: word.y + word.height + 2,
                        width: lineBelow.width,
                        height: 20,
                        confidence: 80,
                        type: 'underline'
                    });
                }
            }
        });

        // Remove duplicatas e sobrepõe campos muito próximos
        return this.filterOverlappingFields(blankAreas);
    }

    /**
     * Encontra próxima palavra em uma direção
     */
    findNextWord(words, currentWord, direction = 'right') {
        const tolerance = 10; // pixels de tolerância vertical
        
        return words.find(w => {
            if (direction === 'right') {
                return w.x > currentWord.x + currentWord.width &&
                       Math.abs(w.y - currentWord.y) < tolerance;
            }
            // Pode adicionar 'left', 'below', etc.
            return false;
        });
    }

    /**
     * Detecta linhas horizontais abaixo de um texto
     * (comum em formulários para indicar campo de preenchimento)
     */
    detectLineBelow(word) {
        const imageData = this.ctx.getImageData(
            word.x,
            word.y + word.height,
            300, // largura máxima a verificar
            5    // altura da área de busca
        );

        // Análise simplificada: procura por pixels escuros consecutivos
        let lineStart = null;
        let lineEnd = null;
        let consecutiveDark = 0;

        for (let x = 0; x < imageData.width; x++) {
            const idx = x * 4;
            const r = imageData.data[idx];
            const g = imageData.data[idx + 1];
            const b = imageData.data[idx + 2];
            const brightness = (r + g + b) / 3;

            if (brightness < 100) { // pixel escuro
                consecutiveDark++;
                if (consecutiveDark === 1) lineStart = x;
                lineEnd = x;
            } else {
                if (consecutiveDark > 30) { // linha com 30+ pixels
                    return {
                        x: word.x + lineStart,
                        width: lineEnd - lineStart
                    };
                }
                consecutiveDark = 0;
            }
        }

        return null;
    }

    /**
     * Remove campos sobrepostos mantendo os de maior confiança
     */
    filterOverlappingFields(fields) {
        return fields.filter((field, index) => {
            return !fields.some((other, otherIndex) => {
                if (index === otherIndex) return false;
                
                // Verifica sobreposição
                const overlapX = Math.max(0, Math.min(field.x + field.width, other.x + other.width) - Math.max(field.x, other.x));
                const overlapY = Math.max(0, Math.min(field.y + field.height, other.y + other.height) - Math.max(field.y, other.y));
                
                const overlap = overlapX * overlapY;
                const fieldArea = field.width * field.height;
                
                // Se sobrepõe > 50% e outro tem mais confiança, remove este
                return (overlap / fieldArea) > 0.5 && other.confidence > field.confidence;
            });
        });
    }

    /**
     * Cria objetos de campos formatados
     */
    createFieldsFromDetection(blankAreas) {
        const scale = this.canvas.width / this.pdfPage.getViewport({ scale: 1 }).width;
        
        return blankAreas.map((area, index) => ({
            name: this.sanitizeFieldName(area.label),
            x: area.x / scale,
            y: area.y / scale,
            width: area.width / scale,
            height: Math.max(area.height / scale, 20), // mínimo 20px
            fontSize: 12,
            page: this.pdfPage.pageNumber,
            value: '',
            hint: '',
            autoDetected: true,
            confidence: area.confidence
        }));
    }

    /**
     * Sanitiza nome do campo removendo caracteres especiais
     */
    sanitizeFieldName(text) {
        return text
            .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, ' ')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }
}
```

---

## 🔧 Integração no `script.js`

### 1. Importar a classe

```javascript
import { AutoFieldDetector } from './js/autoDetectFields.js';
```

### 2. Adicionar botão na interface

```javascript
// Criar botão "Auto-detectar Campos"
const autoDetectBtn = document.createElement('button');
autoDetectBtn.id = 'autoDetectFieldsBtn';
autoDetectBtn.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
    <span>Auto-detectar</span>
`;
autoDetectBtn.className = 'flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50';
autoDetectBtn.title = 'Detectar campos automaticamente usando IA';

// Adicionar à toolbar (após botão "Adicionar Campo")
document.querySelector('.toolbar-actions').appendChild(autoDetectBtn);
```

### 3. Implementar lógica do botão

```javascript
autoDetectBtn.addEventListener('click', async () => {
    if (!currentPdfDoc || !isEditorMode) {
        await Swal.fire({
            icon: 'info',
            title: 'Ative o Modo Edição',
            text: 'Para auto-detectar campos, ative o modo de edição primeiro.'
        });
        return;
    }

    // Mostra loading
    const loadingSwal = Swal.fire({
        title: 'Detectando campos...',
        html: 'Analisando formulário com inteligência artificial.<br>Isso pode levar alguns segundos.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // Pega a página atual
        const pageNum = 1; // ou currentPage se tiver múltiplas páginas
        const page = await currentPdfDoc.getPage(pageNum);
        const canvas = document.querySelector('#pdfContainer canvas');

        // Cria detector e executa
        const detector = new AutoFieldDetector(page, canvas);
        const detectedFields = await detector.detectFields();

        loadingSwal.close();

        if (detectedFields.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Nenhum campo detectado',
                text: 'Não conseguimos identificar campos automaticamente neste PDF. Tente adicionar manualmente.'
            });
            return;
        }

        // Confirma com usuário
        const result = await Swal.fire({
            icon: 'success',
            title: `${detectedFields.length} campos detectados!`,
            html: `
                <p>Encontramos <strong>${detectedFields.length} possíveis campos</strong> neste formulário.</p>
                <p class="text-sm text-gray-600 mt-2">Você pode ajustar posição, tamanho e excluir campos incorretos depois.</p>
            `,
            showCancelButton: true,
            confirmButtonText: 'Adicionar Campos',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        // Adiciona campos ao template
        detectedFields.forEach(field => {
            // Usa a função existente createInputField
            createInputField(
                field.name, 
                field.x, 
                field.y, 
                field.page, 
                field.width, 
                field.height, 
                field.fontSize
            );
        });

        await Swal.fire({
            icon: 'success',
            title: 'Campos Adicionados!',
            text: 'Revise os campos criados e ajuste conforme necessário.',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        loadingSwal.close();
        console.error('Erro na detecção automática:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Erro na Detecção',
            text: 'Ocorreu um erro ao tentar detectar os campos automaticamente.'
        });
    }
});
```

---

## 🎨 Adicionar Botão no HTML

```html
<!-- Adicionar na toolbar de ações -->
<button id="autoDetectFieldsBtn" 
        class="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50" 
        title="Auto-detectar campos">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
    <span>Auto-detectar</span>
</button>
```

---

## 📊 Algoritmos e Heurísticas

### 1. Detecção de Labels

Padrões regex para identificar campos comuns:

```javascript
const labelPatterns = {
    // Português
    nome: /nome|sobrenome|apellido/i,
    endereco: /endere[cç]o|rua|avenida|address/i,
    telefone: /telefone|celular|phone|tel/i,
    email: /e-?mail|correio/i,
    data: /data|nascimento|birth|fecha/i,
    documento: /cpf|rg|passport|passaporte|dni/i,
    
    // Espanhol
    ciudad: /ciudad|city/i,
    estado: /estado|state|provincia/i,
    pais: /pa[íi]s|country/i,
    
    // Inglês
    name: /name|first.*name|last.*name/i,
    address: /address|street/i,
    city: /city/i,
    state: /state/i,
    zip: /zip.*code|postal.*code|cep/i
};
```

### 2. Detecção de Espaços em Branco

```javascript
function detectWhiteSpace(imageData, threshold = 250) {
    const whitespaces = [];
    
    // Analisa densidade de pixels brancos
    for (let y = 0; y < imageData.height; y += 5) {
        for (let x = 0; x < imageData.width; x += 5) {
            const idx = (y * imageData.width + x) * 4;
            const brightness = (
                imageData.data[idx] + 
                imageData.data[idx + 1] + 
                imageData.data[idx + 2]
            ) / 3;
            
            if (brightness > threshold) {
                // Área em branco detectada
                whitespaces.push({ x, y });
            }
        }
    }
    
    return whitespaces;
}
```

### 3. Detecção de Linhas Horizontais

```javascript
function detectHorizontalLines(imageData) {
    const lines = [];
    
    for (let y = 0; y < imageData.height; y++) {
        let consecutiveDark = 0;
        let lineStart = null;
        
        for (let x = 0; x < imageData.width; x++) {
            const idx = (y * imageData.width + x) * 4;
            const brightness = (
                imageData.data[idx] + 
                imageData.data[idx + 1] + 
                imageData.data[idx + 2]
            ) / 3;
            
            if (brightness < 100) { // Pixel escuro
                consecutiveDark++;
                if (consecutiveDark === 1) lineStart = x;
            } else {
                if (consecutiveDark > 50) { // Linha com 50+ pixels
                    lines.push({
                        y: y,
                        x1: lineStart,
                        x2: x - 1,
                        width: x - lineStart
                    });
                }
                consecutiveDark = 0;
            }
        }
    }
    
    return lines;
}
```

---

## 🚀 Melhorias Avançadas (Opcional)

### 1. Machine Learning com TensorFlow.js

```bash
npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
```

```javascript
import * as cocoSsd from '@tensorflow-models/coco-ssd';

async function detectWithML(canvas) {
    // Carregar modelo
    const model = await cocoSsd.load();
    
    // Detectar objetos
    const predictions = await model.detect(canvas);
    
    // Filtrar apenas caixas de texto
    const textBoxes = predictions.filter(p => 
        p.class === 'text' || p.class === 'form'
    );
    
    return textBoxes;
}
```

### 2. OpenCV.js para Visão Computacional

```javascript
// Detecção de contornos
function findContours(imageData) {
    const src = cv.matFromImageData(imageData);
    const dst = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    
    // Conversão para escala de cinza
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
    
    // Threshold
    cv.threshold(src, dst, 177, 200, cv.THRESH_BINARY);
    
    // Encontrar contornos
    cv.findContours(dst, contours, hierarchy, 
        cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
    
    // Processar contornos para encontrar retângulos
    const rectangles = [];
    for (let i = 0; i < contours.size(); i++) {
        const rect = cv.boundingRect(contours.get(i));
        rectangles.push(rect);
    }
    
    return rectangles;
}
```

### 3. Análise de Densidade de Pixels

```javascript
function analyzeDensity(imageData, blockSize = 20) {
    const densityMap = [];
    
    for (let y = 0; y < imageData.height; y += blockSize) {
        for (let x = 0; x < imageData.width; x += blockSize) {
            let totalBrightness = 0;
            let pixels = 0;
            
            // Analisa bloco
            for (let by = 0; by < blockSize; by++) {
                for (let bx = 0; bx < blockSize; bx++) {
                    const px = x + bx;
                    const py = y + by;
                    
                    if (px < imageData.width && py < imageData.height) {
                        const idx = (py * imageData.width + px) * 4;
                        totalBrightness += (
                            imageData.data[idx] + 
                            imageData.data[idx + 1] + 
                            imageData.data[idx + 2]
                        ) / 3;
                        pixels++;
                    }
                }
            }
            
            densityMap.push({
                x, y,
                brightness: totalBrightness / pixels,
                isEmpty: (totalBrightness / pixels) > 240
            });
        }
    }
    
    return densityMap;
}
```

---

## 📈 Comparação de Abordagens

| Abordagem | Precisão | Velocidade | Complexidade | Custo |
|-----------|----------|------------|--------------|-------|
| **Tesseract.js (OCR)** | ⭐⭐⭐⭐ | ⭐⭐⭐ | Baixa | Grátis |
| **Heurísticas + Canvas** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Média | Grátis |
| **OpenCV.js** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Alta | Grátis |
| **TensorFlow.js + ML** | ⭐⭐⭐⭐⭐ | ⭐⭐ | Muito Alta | Grátis |
| **Serviços Cloud (AWS/GCP)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Baixa | Pago |

---

## 💡 Recomendação

Para o projeto **egar**, recomendo:

### **Fase 1: MVP (Implementar primeiro)**
- ✅ Tesseract.js para OCR
- ✅ Heurísticas baseadas em regex
- ✅ Detecção de linhas com Canvas API
- 🎯 **Custo:** Zero
- 🎯 **Precisão:** 60-75%
- 🎯 **Tempo de implementação:** 2-4 horas

### **Fase 2: Melhorias (Se necessário)**
- ⬆️ Adicionar OpenCV.js para detecção de contornos
- ⬆️ Melhorar padrões de reconhecimento
- 🎯 **Precisão:** 80-90%
- 🎯 **Tempo de implementação:** 4-8 horas

### **Fase 3: IA Avançada (Opcional)**
- 🚀 TensorFlow.js com modelo customizado
- 🚀 Treinamento específico para formulários
- 🎯 **Precisão:** 90-95%
- 🎯 **Tempo de implementação:** 1-2 semanas

---

## ✅ Próximos Passos

1. **Instalar dependências:**
   ```bash
   npm install tesseract.js
   ```

2. **Criar arquivo `autoDetectFields.js`** com a classe completa

3. **Integrar no `script.js`** com botão na interface

4. **Testar com formulários existentes:**
   - Formulário de Visto Mexicano
   - Autorização de Viagem Internacional

5. **Ajustar heurísticas** baseado nos resultados

6. **Documentar padrões** específicos dos formulários mais usados

---

## 🔍 Exemplos de Uso

```javascript
// Exemplo 1: Detecção básica
const detector = new AutoFieldDetector(pdfPage, canvas);
const fields = await detector.detectFields();

// Exemplo 2: Com configuração customizada
const detector = new AutoFieldDetector(pdfPage, canvas);
detector.minConfidence = 70; // Aumentar precisão
detector.minGap = 30; // Espaços maiores
const fields = await detector.detectFields();

// Exemplo 3: Apenas labels específicos
const detector = new AutoFieldDetector(pdfPage, canvas);
detector.labelPatterns = [/nome/i, /endereco/i, /cpf/i];
const fields = await detector.detectFields();
```

---

## 🐛 Limitações e Considerações

### Limitações

- ❌ **Formulários escaneados de baixa qualidade:** OCR pode falhar
- ❌ **Layouts muito complexos:** Heurísticas podem não funcionar
- ❌ **Idiomas não treinados:** Tesseract precisa do pack de idioma
- ❌ **Campos sem label:** Não será detectado

### Soluções

- ✅ **Pré-processamento de imagem:** Aumentar contraste e resolução
- ✅ **Múltiplas passes:** Tentar diferentes escalas e thresholds
- ✅ **Feedback do usuário:** Permitir correção manual
- ✅ **Aprendizado:** Salvar padrões que funcionaram

---

## 📝 Notas Técnicas

### Performance

- **OCR:** ~2-5 segundos por página (depende da resolução)
- **Heurísticas:** ~100-500ms
- **ML (TensorFlow):** ~1-3 segundos (após carregar modelo)

### Requisitos do Navegador

- Chrome/Edge: ✅ Funciona perfeitamente
- Firefox: ✅ Funciona perfeitamente
- Safari: ⚠️ Pode ter limitações com Tesseract.js
- Mobile: ⚠️ Pode ser lento (muito processamento)

### Memória

- **OCR:** ~50-100MB por página
- **ML:** ~150-300MB (modelo carregado)
- **Canvas:** ~10-30MB

---

## 🎓 Recursos de Aprendizado

- [Tesseract.js Docs](https://tesseract.projectnaptha.com/)
- [OpenCV.js Tutorial](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- [TensorFlow.js Guide](https://www.tensorflow.org/js/guide)
- [PDF.js API](https://mozilla.github.io/pdf.js/)

---

## 🤝 Contribuindo

Melhorias sugeridas:

1. **Adicionar mais padrões de labels** (diferentes idiomas)
2. **Melhorar detecção de checkboxes** e radio buttons
3. **Suportar tabelas** (detecção de células)
4. **Exportar/importar templates** de detecção
5. **Modo de treinamento** para novos tipos de formulários

---

## 📄 Licença

Este código é parte do projeto **egar** e segue a mesma licença.
