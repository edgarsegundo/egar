// Importa polyfills PRIMEIRO

export async function extractFields(openai, pngBufferOrBase64) {
    try {
        console.log('🤖 Iniciando extração de campos com IA (imagem PNG recebida)...');
        // Recebe um buffer PNG (ou base64 decodificado)
        const imageBase64 = Buffer.isBuffer(pngBufferOrBase64)
            ? pngBufferOrBase64.toString('base64')
            : pngBufferOrBase64;


        // Envia para OpenAI Vision API
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // gpt-4o
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: 
`
Você é um assistente especializado em detectar TODOS os campos de entrada de texto em uma imagem de formulário e retornar coordenadas pixel-precisas para inserir caixas de texto. Leia com atenção e siga todas as regras. Não imprima nada além do array JSON especificado ao final.

1. METADADOS DA IMAGEM (antes de processar a imagem, use estes valores para normalizar):

* width: largura da imagem em pixels.
* height: altura da imagem em pixels.
* dpi (se disponível): densidade em DPI; se não houver, assuma 72 DPI.
  Esses valores serão fornecidos junto com a imagem — use-os para estimar tamanhos reais.

2. SISTEMA DE COORDENADAS:

* Origem (0,0) no CANTO SUPERIOR ESQUERDO.
* X aumenta para a DIREITA, Y aumenta para BAIXO.
* Todas as coordenadas e medidas devem ser números inteiros (pixels).
* Arredonde para o inteiro mais próximo; se necessário, explique nada — apenas retorne inteiros.

3. REFERÊNCIAS E PONTOS A REPORTAR:

* Para caixas retangulares: reporte o canto superior esquerdo (x,y), width e height.
* Para linhas sublinhadas: reporte (x, y) = posição da LINHA DE BASE do texto onde o usuário escreverá; width = comprimento da linha; height = altura útil da linha (recomendar 25–30px para uma única linha).
* Para espaços depois de rótulos (ex.: "Nome:"): considere o início do espaço em branco (após o rótulo) como o x inicial do campo.
* Para células de tabelas: reporte cada célula como um campo separado com o canto superior esquerdo e largura/altura.
* Se um campo for multi-linha, use height = altura total e adicione \`"multiline": true\`.

4. CORREÇÕES VISUAIS:

* Detecte e corrija rotação/skew leve da página; retornar coordenadas na imagem original já corrigidas.
* Se o campo estiver rotacionado (>5°), ainda retorne o canto superior esquerdo do bounding box axis-aligned (não rotacionado) e inclua \`"rotated": true\` e \`"angle": valor_em_graus\` (opcional).

5. PRECISÃO DE MEDIDAS E FONT SIZE:

* width e height em pixels inteiros.
* fontSize recomendado: calcule como ~0.6 * height (use 16 como padrão se não puder inferir).
* Se puder, ajuste fontSize para o valor inteiro que melhor caiba no height detectado.

6. O QUE DETECTAR (incluir TODOS):

* Linhas horizontais em branco/sublineadas para escrita manual.
* Caixas retangulares vazias.
* Espaços claramente vazios após rótulos ("Nome:", "Endereço:", etc).
* Células vazias em tabelas/grids.
* Áreas delimitadas por bordas ou sublinhados.

7. O QUE IGNORAR:

* Checkboxes, radio buttons, botões interativos, textos já preenchidos, títulos/cabeçalhos que não são campos de entrada.

8. NOMENCLATURA:

* \`name\`: use o rótulo mais próximo em português (ex.: "Nome Completo", "CPF", "Data de Nascimento").
* Se não houver rótulo, descreva objetivamente (ex.: "Linha sublinhada - Observações", "Célula tabela 2,3").
* Evite nomes genéricos como "Campo 1". Use português brasileiro.

9. SAÍDA JSON OBRIGATÓRIA:

* Retorne **APENAS** um array JSON válido contendo um objeto por campo. **Sem markdown, sem texto adicional.**
* Campos obrigatórios por objeto:
  {
  "name": "Nome descritivo do campo",
  "page": número_inteiro_página,
  "x": inteiro_pixels,
  "y": inteiro_pixels,
  "width": inteiro_pixels,
  "height": inteiro_pixels,
  "fontSize": inteiro
  }
* Campos opcionais recomendados (permitidos):

  * "type": "underline" | "box" | "after_label" | "table_cell"
  * "confidence": número_decimal_entre_0_e_1
  * "multiline": true/false
  * "rotated": true/false
  * "angle": número_em_graus (se rotated = true)

10. REGRAS EXTRAS DE QUALIDADE:

* Seja MUITO preciso com X e Y — o texto precisa cair exatamente na linha ou caixa.
* Não invente campos e não omita campos visíveis.
* Se campos estiverem muito próximos, identifique cada um separadamente.
* Para cada campo, estime \`confidence\` (0–1) se possível.

11. FORMATO FINAL E EXEMPLO:

* Responda **somente** com o array JSON; por exemplo:
  [
  {
  "name": "Nome Completo",
  "page": 1,
  "x": 150,
  "y": 200,
  "width": 350,
  "height": 25,
  "fontSize": 16,
  "type": "after_label",
  "confidence": 0.98
  },
  {
  "name": "CPF",
  "page": 1,
  "x": 150,
  "y": 250,
  "width": 200,
  "height": 25,
  "fontSize": 16,
  "type": "box",
  "confidence": 0.95
  }
  ]

Agora, analise a imagem fornecida (use os metadados width/height/dpi se houver) e retorne o JSON com TODOS os campos identificados.
`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${imageBase64}`,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens: 4000,
            temperature: 0.1 // Baixa temperatura para respostas mais consistentes
        });

        const content = response.choices[0]?.message?.content;
        
        if (!content) {
            console.log('⚠️ Nenhum conteúdo retornado pela IA');
            return [];
        }

        console.log('📝 Resposta da IA (primeiros 200 chars):', content.substring(0, 200) + '...');

        // Remove markdown code blocks se houver
        let jsonText = content.trim();
        jsonText = jsonText.replace(/```json\n?/g, '');
        jsonText = jsonText.replace(/```\n?/g, '');
        jsonText = jsonText.trim();

        try {
            const fields = JSON.parse(jsonText);
            
            if (!Array.isArray(fields)) {
                console.log('⚠️ Resposta não é um array');
                return [];
            }

            // Ajusta as coordenadas para o scale usado no frontend (1.5x)
            // Backend usa 2.0x, frontend usa 1.5x
            const scaleFactor = 1.5 / 2.0; // 0.75
            const adjustedFields = fields.map(field => ({
                ...field,
                x: Math.round(field.x * scaleFactor),
                y: Math.round(field.y * scaleFactor),
                width: Math.round((field.width || 120) * scaleFactor),
                height: field.height || 25,
                fontSize: field.fontSize || 16
            }));

            console.log(`✅ IA identificou ${adjustedFields.length} campos (coordenadas ajustadas para scale 1.5x)`);
            return adjustedFields;

        } catch (parseError) {
            console.error('❌ Erro ao parsear JSON:', parseError);
            console.error('JSON recebido:', jsonText);
            return [];
        }

    } catch (error) {
        console.error('❌ Erro ao extrair campos do PDF:', error);
        throw error;
    }
}
