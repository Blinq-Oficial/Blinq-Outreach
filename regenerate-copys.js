const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0];
      const val = parts.slice(1).join('=');
      if (key && val) {
        process.env[key] = val;
      }
    }
  });
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateOutreachEmail(lead, niche, city) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  // Localized pricing logic based on lead's city
  const lowerCity = city.toLowerCase();
  const isColombia = lowerCity.includes('bogotá') || lowerCity.includes('bogota') || lowerCity.includes('medellín') || lowerCity.includes('medellin') || lowerCity.includes('co');
  
  let pricingString = 'Por solo $50 USD te entregamos una web móvil nueva, ultrarrápida y con código puro en solo 48 horas.';
  if (isColombia) {
    pricingString = 'Por solo $50 USD (o 200.000 COP) te entregamos una web móvil nueva, ultrarrápida y con código puro en solo 48 horas.';
  }

  const prompt = `
Eres un copywriter estrella para Blinq (blinqoficial.com), una agencia premium de diseño y desarrollo web profesional de alta conversión.
Nuestra oferta irresistible es:
- Plan PROTOCOL IGNITION (${pricingString} Con cero anticipo: pagas solo si estás 100% satisfecho con el resultado).
- Ofrecemos un boceto visual interactivo de diseño web móvil personalizado de su negocio y una verificación de optimización para Inteligencia Artificial (SGE de Google / ChatGPT) completamente gratis y sin compromiso.

Escribe un gancho de contacto sumamente directo, amigable y muy honesto en español de tú a tú para:
- Nombre del Negocio: ${lead.business_name}
- Sitio Web: ${lead.website}
- Nicho: ${niche}
- Ciudad: ${city}
- Problemas técnicos detectados: ${lead.website_issues.join(', ')}

Instrucciones exactas de Redacción de David:
1. DEBES comenzar el correo presentándote de forma cercana e informal:
   "Hola, me presento: soy David en el equipo de Blinq. Estábamos buscando [Nicho] y nos encontramos tu página web..."
2. NUNCA uses saludos robóticos o prefabricados como "Hola, Directo al grano: Estábamos auditando..." o frases similares.
3. Menciona el sitio web de forma orgánica en la oración sin ponerlo entre paréntesis, por ejemplo: "...nos encontramos con tu página web ${lead.website} y notamos que..."
4. Menciona que la página web no está optimizada para la nueva era de Inteligencia Artificial (SGE de Google / ChatGPT) y para celulares, lo que te hace perder visibilidad y visitas de potenciales pacientes/clientes.
5. Ofrece hacerles un boceto visual interactivo personalizado de su negocio en Figma totalmente gratis y sin compromiso para que vean el potencial de mejora.
6. Presenta con total transparencia el Plan Protocol Ignition con la siguiente oferta regional: "${pricingString} Lo mejor es que no pedimos anticipo: solo pagas si te encanta el resultado final".
7. Mantén el mensaje extremadamente corto (máximo 150 palabras), directo, educado y conversacional. No uses enlaces ni URLs adicionales entre paréntesis.
8. CTA: Haz una pregunta informal de bajísimo esfuerzo para abrir la conversación, ej: "¿Te gustaría ver la propuesta?" o "¿Te puedo mandar el boceto visual?".

Responde únicamente con un objeto JSON válido con la siguiente estructura:
{
  "subject": "Asunto de correo intrigante y conversacional (ej. 'idea visual gratis para Dra. María José', 'boceto web móvil para Clínica Dental Cumbres')",
  "body": "Cuerpo del correo en formato texto conversacional con saltos de línea (\\n)."
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error('Gemini pitch generation failed. Using default template.');
    const introText = `Hola, me presento: soy David en el equipo de Blinq. Estábamos buscando ${niche} y nos encontramos tu página web ${lead.website}. Notamos que no está optimizada para dispositivos móviles ni para la era de la Inteligencia Artificial (SGE / ChatGPT), lo que te puede estar restando visibilidad y clientes en ${city}.`;
    return {
      subject: `Boceto móvil gratis para ${lead.business_name} ⚡`,
      body: `${introText}\n\nHemos diseñado un boceto visual interactivo totalmente personalizado para tu marca, sin costo ni compromiso alguno. ${pricingString} No pedimos ningún tipo de anticipo, pagas únicamente cuando estés 100% satisfecho con el resultado.\n\n¿Te gustaría ver el enlace del boceto? Responde a este correo y te lo comparto de inmediato.\n\nSaludos,\nDavid`
    };
  }
}

async function regenerate() {
  const dbPath = path.join(__dirname, 'database_fallback.json');
  if (!fs.existsSync(dbPath)) return;

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  // The 5 target leads we just added
  const targetLeadIds = [
    'lead-live-jl0dsh', // Clínica Dental Cumbres Monterrey
    'lead-live-lnl9k',  // Spa Zen Urbano Bogotá
    'lead-live-zhkpf',  // Guadalajara Dental Group
    'lead-live-hb7cz',  // Dra. María José Silva Estética
    'lead-live-zm44wh'  // Cancún Luxury Boutique Hotel
  ];

  console.log('--- REGENERATING COPYWRITING PITCHES ---');

  for (const id of targetLeadIds) {
    const lead = db.leads.find(l => l.id === id);
    if (!lead) {
      console.log(`Lead not found: ${id}`);
      continue;
    }

    const niche = lead.campaign_id === 'camp-1' ? 'Clínicas/Servicios' : 'Negocios';
    const city = lead.address || 'Monterrey';
    
    console.log(`\nGenerating new copy for: "${lead.business_name}" (${city})...`);
    
    const pitch = await generateOutreachEmail(lead, niche, city);
    
    // Find or create draft
    let draftIdx = db.drafts.findIndex(d => d.lead_id === id);
    if (draftIdx >= 0) {
      db.drafts[draftIdx].subject = pitch.subject;
      db.drafts[draftIdx].pitch_email = pitch.body;
      db.drafts[draftIdx].pitch_dm = `¡Hola ${lead.business_name}! Notamos que su web móvil carga lento. Hacemos diseño premium por $50 USD en 48h sin anticipo. ¿Les hacemos un boceto visual gratis?`;
      console.log(`  Updated existing draft.`);
    } else {
      const draftId = `draft-live-${Math.random().toString(36).substring(7)}`;
      db.drafts.push({
        id: draftId,
        lead_id: id,
        subject: pitch.subject,
        pitch_email: pitch.body,
        pitch_dm: `¡Hola ${lead.business_name}! Notamos que su web móvil carga lento. Hacemos diseño premium por $50 USD en 48h sin anticipo. ¿Les hacemos un boceto visual gratis?`,
        status: 'pending_review',
        contact_channel: 'email',
        sent_at: null,
        created_at: new Date().toISOString()
      });
      console.log(`  Created new draft.`);
    }
  }

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log('\n✅ ALL PITCHES REGENERATED AND SAVED IN DATABASE FALLBACK!');
}

regenerate();
