import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  try {
    if (!genAI) {
      return NextResponse.json({ 
        error: 'El API Key de Gemini no está configurada.',
        fallback: true
      });
    }

    const { targetName, businessName, niche, city, website, channel } = await request.json();

    if (!businessName || !niche || !city) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Eres un redactor experto en prospección social para Blinq (www.blinqoficial.com), una agencia web de primer nivel.
Genera un mensaje de prospección hiper-personalizado, extremadamente humano y directo en español para contactar al dueño/fundador de un negocio en redes sociales.

INFORMACIÓN DEL NEGOCIO:
- Nombre del contacto (opcional): ${targetName || 'dueño del negocio'}
- Nombre del negocio: ${businessName}
- Giro/Nicho: ${niche}
- Ciudad: ${city}
- Sitio web actual: ${website || 'No tiene sitio web'}
- Canal de contacto: ${channel} (opciones: 'linkedin_connect' | 'linkedin_dm' | 'fb_comment' | 'fb_messenger')

REGLAS ESTRICTAS DE REDACCIÓN:
1. NUNCA menciones palabras de IA o automatización como: "Figma", "boceto Figma", "mockup", "Inteligencia Artificial", "IA", "algoritmo", "automatización", "SGE", o "ChatGPT".
2. Preséntate de forma natural como David de Blinq: "Hola, me presento: soy David de Blinq (www.blinqoficial.com)".
3. Dirígete de "tú" de forma profesional, amigable y sumamente conversacional.
4. Incluye siempre la mención a ver el portafolio de Blinq en www.blinqoficial.com como ejemplo de lo que hacen muy bien, bonito y barato.
5. Reglas específicas por canal:
   - 'linkedin_connect': Nota de invitación de conexión. Límite estricto de 140 caracteres. Debe ser conciso, elogiar su reputación en Maps y proponer conectar para compartir el portafolio.
   - 'linkedin_dm': Mensaje directo para LinkedIn una vez aceptada la invitación. Más detallado, buscando abrir conversación amigable y citando su excelente reputación.
   - 'fb_comment': Comentario útil para un post de Facebook Group. Debe ser educativo, de alto valor, mencionando un tip técnico rápido (velocidad en móvil) y guiándolos de forma indirecta a www.blinqoficial.com.
   - 'fb_messenger': Mensaje privado directo para Facebook Messenger. Muy cercano, conversacional y buscando romper el hielo de forma informal.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura (no agregues bloques de código markdown \`\`\`json):
{
  "message": "El mensaje de prospección generado para el canal correspondiente",
  "tip": "Un consejo rápido para este prospecto en este canal social"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean JSON response if wrapped in markdown code blocks
    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    }

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch (e) {
      console.error('Error parsing Gemini JSON response, returning text directly:', e);
      return NextResponse.json({ message: text, tip: 'Revisa y ajusta el tono antes de enviar.' });
    }

  } catch (error: any) {
    console.error('Error generating social pitch:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
