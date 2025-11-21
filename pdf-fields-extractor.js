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
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analise esta imagem de um formulário PDF e identifique TODOS os campos de entrada (caixas de texto onde o usuário pode digitar informações).

Para cada campo identificado, retorne um objeto JSON com:
- name: nome descritivo do campo (ex: "Nome Completo", "CPF", "Data de Nascimento")
- page: sempre 1 (primeira página)
- x: coordenada X do canto superior esquerdo do campo em pixels
- y: coordenada Y do canto superior esquerdo do campo em pixels
- width: largura estimada do campo em pixels
- height: altura estimada do campo em pixels (normalmente 20-30)
- fontSize: tamanho de fonte sugerido (use 16 como padrão)

IMPORTANTE:
- Retorne APENAS um array JSON válido, sem markdown, sem explicações
- Não inclua checkboxes, radio buttons ou botões
- Inclua apenas campos de texto onde o usuário pode digitar
- Use nomes descritivos em português para os campos

Exemplo do formato esperado:
[
  {
    "name": "Nome Completo",
    "page": 1,
    "x": 120,
    "y": 150,
    "width": 300,
    "height": 25,
    "fontSize": 16
  }
]`
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
