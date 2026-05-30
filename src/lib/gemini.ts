import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

// Initialize the Google Generative AI SDK
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface GeneratedPitch {
  analysis: string;
  emailSubject: string;
  emailBody: string;
  dmScript: string;
}

/**
 * Generates a highly personalized, high-converting outreach pitch using Gemini.
 * Employs direct, casual, and value-first Spanish copy following "100M Dollar Leads" rules.
 */
export async function generateOutreachPitch(params: {
  businessName: string;
  niche: string;
  city: string;
  website?: string;
  hasWebsite: boolean;
  websiteIssues?: string[];
  googleRating?: number;
}): Promise<GeneratedPitch> {
  if (!genAI) {
    console.error('Error: GEMINI_API_KEY is not configured.');
    return getFallbackPitch(params.businessName, params.niche, params.city, params.hasWebsite);
  }

  try {
    // Use Gemini 2.5 Flash - ultra fast and perfect for high-scale free tiers
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    // Dynamic currency and price localization based on target city/country
    const cityLower = params.city.toLowerCase();
    let pricingText = '';

    // Comprehensive city lists for accurate region detection
    const mexicoCities = [
      'monterrey', 'cdmx', 'ciudad de méxico', 'ciudad de mexico', 'guadalajara',
      'queretaro', 'querétaro', 'puebla', 'tijuana', 'mérida', 'merida', 'cancún',
      'cancun', 'león', 'leon', 'oaxaca', 'playa del carmen', 'san luis potosí',
      'san luis potosi', 'aguascalientes', 'toluca', 'chihuahua', 'hermosillo',
      'saltillo', 'mexicali', 'culiacán', 'culiacan', 'morelia', 'veracruz',
      'villahermosa', 'tuxtla', 'tampico', 'mazatlán', 'mazatlan', 'pachuca',
      'cuernavaca', 'celaya', 'irapuato', 'durango', 'zacatecas', 'reynosa',
      'matamoros', 'nuevo laredo', 'juarez', 'juárez', 'nogales', 'ensenada'
    ];
    const colombiaCities = [
      'bogotá', 'bogota', 'medellín', 'medellin', 'cali', 'barranquilla',
      'cartagena', 'bucaramanga', 'pereira', 'manizales', 'santa marta',
      'ibagué', 'ibague', 'pasto', 'montería', 'monteria', 'neiva',
      'villavicencio', 'armenia', 'popayán', 'popayan', 'cúcuta', 'cucuta'
    ];
    const usaCities = [
      'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
      'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'miami',
      'seattle', 'denver', 'boston', 'las vegas', 'san francisco', 'portland',
      'atlanta', 'tampa', 'orlando', 'nashville', 'detroit', 'minneapolis'
    ];
    const canadaCities = [
      'toronto', 'montreal', 'vancouver', 'calgary', 'edmonton', 'ottawa',
      'winnipeg', 'quebec', 'hamilton', 'halifax', 'victoria'
    ];

    const isMexico = cityLower.includes('mexico') || cityLower.includes('méxico')
      || cityLower.includes(', mx') || mexicoCities.some(c => cityLower.includes(c));
    const isColombia = cityLower.includes('colombia')
      || cityLower.includes(', co') || colombiaCities.some(c => cityLower.includes(c));
    const isUSA = cityLower.includes('usa') || cityLower.includes('united states')
      || cityLower.includes(', us') || usaCities.some(c => cityLower.includes(c));
    const isCanada = cityLower.includes('canada') || cityLower.includes('canadá')
      || cityLower.includes(', ca') || canadaCities.some(c => cityLower.includes(c));

    if (isMexico) {
      pricingText = 'Plan PROTOCOL IGNITION ($50 USD / $1,000 MXN en 48 horas, $0 de anticipo, garantía total de satisfacción, velocidad de carga luz, código puro cero WordPress).';
    } else if (isColombia) {
      pricingText = 'Plan PROTOCOL IGNITION ($50 USD / 200,000 COP en 48 horas, $0 de anticipo, garantía total de satisfacción, velocidad de carga luz, código puro cero WordPress).';
    } else if (isUSA || isCanada) {
      pricingText = 'Plan PROTOCOL IGNITION ($50 USD in 48 hours, $0 upfront, full satisfaction guarantee, lightning-fast load speeds, pure code zero WordPress).';
    } else {
      pricingText = 'Plan PROTOCOL IGNITION ($50 USD en 48 horas, $0 de anticipo, garantía total de satisfacción, velocidad de carga luz, código puro cero WordPress).';
    }

    const websiteStatusText = params.hasWebsite 
      ? `Tienen un sitio web: ${params.website}. Problemas detectados: ${params.websiteIssues?.join(', ') || 'sitio web básico/desactualizado'}`
      : 'NO tienen un sitio web propio.';

    const ratingText = params.googleRating 
      ? `Su calificación en Google Maps es de ${params.googleRating}/5.`
      : '';

    const prompt = `
Eres un experto en ventas y copywriting para Blinq (blinqoficial.com), una agencia premium de diseño y desarrollo web profesional.
Tu objetivo es escribir un gancho de contacto (outreach) hiper-personalizado y directo en español para el siguiente negocio local:

- Nombre del Negocio: ${params.businessName}
- Nicho/Giro: ${params.niche}
- Ciudad: ${params.city}
- Estado Web: ${websiteStatusText}
- Calificación en Maps: ${ratingText}

PAUTAS DE PRODUCTO Y PRECIO DE BLINQ:
- ${pricingText}

INSTRUCCIONES DE COPYWRITING (Estilo "100M Dollar Leads" de Alex Hormozi):
1. NO uses saludos aburridos ni corporativos como "Espero que este correo te encuentre bien", "Estimado/a", ni presentarnos como "somos la empresa líder...". Esos correos van directo al SPAM.
2. Comienza DIRECTAMENTE con un gancho personalizado sobre su negocio.
   - Si no tienen sitio web: Habla de cómo los clientes que los buscan en Maps no pueden ver su menú/catálogo/portafolio profesional y eso les está costando ventas frente a sus competidores locales.
   - Si tienen sitio web básico/malo: Menciona con tacto pero con claridad que notaste algo en su web (ej. no carga bien en móviles, no tiene llamado a la acción claro, el diseño no refleja la calidad de su servicio real) y que te gustaría ayudarlos a verse profesionales.
3. OFERTA DE VALOR GRATUITA (Sin compromiso): Ofréceles crear un BOCETO (mockup) interactivo en Figma de cómo se vería su nuevo sitio web moderno completamente gratis y sin compromiso, para que vean el cambio antes de decidir nada. Adicionalmente, puedes ofrecerles una auditoría/verificación rápida sin coste de si su negocio está optimizado para la última tecnología de Inteligencia Artificial (motores de búsqueda SGE / ChatGPT).
4. LLAMADO A LA ACCIÓN (CTA) DIVERSO E INTELIGENTE:
   - Para Negocios Pequeños y Medianos (PyMEs Locales): Termina con un llamado de bajo riesgo orientado a una llamada telefónica muy corta (ej: "¿Te queda bien una llamada rápida de 2 minutos mañana para contarte la propuesta?", o "¿A qué número te puedo marcar mañana 3 minutos para ver si te interesa ver la idea?"). Los dueños de negocios locales responden mejor a llamadas directas que a correos largos.
   - Para Empresas Grandes/Coporativas: Enfoca el CTA en enviarles el boceto Figma para el equipo de marketing o agendar una breve sesión de 5 minutos por Meet/Zoom (ej: "¿Estarían abiertos a que les prepare una breve auditoría de SEO móvil y presentárselas en una sesión rápida de 5 minutos por Meet?").
5. Tono: Cercano, conversacional, profesional, honesto y directo. Español latinoamericano natural, amigable pero serio.
6. MENSAJE DM: Para Instagram/WhatsApp debe ser ultra corto (menos de 280 caracteres), directo al grano, amigable y buscando iniciar una conversación informal, no vender de golpe.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "analysis": "Un análisis de 2 frases del estado actual del negocio y su área de oportunidad web.",
  "emailSubject": "Un asunto de correo corto, intrigante y personalizado (ej. 'boceto web gratis para [Nombre]', 'idea rápida para tu negocio [Nombre]', etc.)",
  "emailBody": "El texto completo del correo electrónico en español, formateado con saltos de línea (\\n) para que sea limpio. Usa un tono de tú a tú.",
  "dmScript": "Un script ultra-corto para Instagram DM o WhatsApp en español (máx 280 caracteres) que sea conversacional."
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text) as GeneratedPitch;
  } catch (error) {
    console.error('Error generating pitch with Gemini:', error);
    return getFallbackPitch(params.businessName, params.niche, params.city, params.hasWebsite);
  }
}

function getFallbackPitch(
  businessName: string,
  niche: string,
  city: string,
  hasWebsite: boolean
): GeneratedPitch {
  const subject = hasWebsite 
    ? `Idea de diseño web para ${businessName}` 
    : `Boceto de página web gratis para ${businessName}`;
    
  const emailBody = `Hola,\n\nEstaba viendo tu negocio ${businessName} en ${city} y me di cuenta de que ${
    hasWebsite 
      ? 'tu sitio web podría beneficiarse de un diseño más moderno y rápido para captar más clientes en celulares.'
      : 'aún no tienen un sitio web propio para mostrar su portafolio profesional y horarios.'
  }\n\nEn Blinq nos dedicamos a hacer páginas web premium. Me gustaría diseñar un boceto visual rápido de cómo se vería tu negocio con un sitio web de primer nivel, totalmente gratis y sin ningún tipo de compromiso. Si te gusta, genial; si no, te lo puedes quedar como idea.\n\n¿Te puedo enviar el enlace de la propuesta visual por aquí cuando la termine?\n\nSaludos,\nEl equipo de Blinq\nblinqoficial.com`;

  const dmScript = `¡Hola! Estaba viendo tu perfil y el gran trabajo que hacen en ${businessName}. 🙌 Diseñamos páginas web profesionales y me gustaría prepararte un boceto visual gratuito y sin compromiso de cómo se vería una web moderna para tu negocio. ¿Te puedo mandar la idea por aquí?`;

  return {
    analysis: `El negocio ${businessName} en ${city} tiene alta presencia en redes pero carece de un canal web optimizado para retener leads locales.`,
    emailSubject: subject,
    emailBody,
    dmScript
  };
}
