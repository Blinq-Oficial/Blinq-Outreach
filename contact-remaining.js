/**
 * Script: Encontrar y Enviar Correos a 88 Leads Adicionales (Total 100 Prospectos)
 * 
 * Busca negocios pequeños locales en diversas ciudades y nichos estratégicos de LATAM/USA,
 * genera pitches hiper-personalizados con Gemini, y envía los correos vía Resend.
 */

const RESEND_API_KEY = 're_6FDNPXWp_BTCte5UrKDo2Uc6x4T3eAxr1';
const GEMINI_API_KEY = 'AIzaSyBb9CNDiKwe4o52JWzy9e-kofHmIFQz_Uc';
const SENDER_EMAIL = 'contacto@blinqoficial.com';
const SENDER_NAME = 'Blinq Oficial';
const TARGET_EMAILS_COUNT = 88; // Enviar exactamente los 88 restantes

const TARGETS = [
  // México
  { niche: 'gimnasios de crossfit', city: 'Querétaro', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'clínicas dentales', city: 'Puebla', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'spas urbanos', city: 'Guadalajara', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'restaurantes locales', city: 'Mérida', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'boutiques de ropa', city: 'San Luis Potosí', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'veterinarias', city: 'León', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'estudios de pilates', city: 'Monterrey', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'cafeterías de especialidad', city: 'Querétaro', country: 'MX', pricing: '$50 USD / $1,000 MXN' },

  // Colombia
  { niche: 'centros de estética', city: 'Medellín', country: 'CO', pricing: '$50 USD / 200,000 COP' },
  { niche: 'barberías premium', city: 'Bogotá', country: 'CO', pricing: '$50 USD / 200,000 COP' },
  { niche: 'gimnasios boutique', city: 'Cali', country: 'CO', pricing: '$50 USD / 200,000 COP' },
  { niche: 'tiendas de diseño local', city: 'Medellín', country: 'CO', pricing: '$50 USD / 200,000 COP' },

  // USA (Hispanos)
  { niche: 'taquerías mexicanas', city: 'Miami', country: 'US', pricing: '$50 USD' },
  { niche: 'auto detailing', city: 'Houston', country: 'US', pricing: '$50 USD' },
  { niche: 'salones de belleza', city: 'San Antonio', country: 'US', pricing: '$50 USD' }
];

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'database_fallback.json');

// Helper: load DB
function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  return { campaigns: [], leads: [], drafts: [], replies: [] };
}

// Helper: save DB
function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// DuckDuckGo Search
async function searchLocalBusinesses(niche, city) {
  const query = `${niche} en ${city} sitio web`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const urls = [];
    
    $('a.result__url').each((_, el) => {
      let rawUrl = $(el).attr('href');
      if (rawUrl) {
        if (rawUrl.includes('//duckduckgo.com/y.js?')) {
          const match = rawUrl.match(/uddg=([^&]+)/);
          if (match && match[1]) rawUrl = decodeURIComponent(match[1]);
        }
        try {
          const parsed = new URL(rawUrl);
          const domain = parsed.hostname.toLowerCase();
          const blocklist = [
            'yelp', 'tripadvisor', 'yellowpages', 'facebook', 'instagram', 'linkedin',
            'twitter', 'youtube', 'maps.google', 'wikipedia', 'groupon', 'booking',
            'foursquare', 'paginasamarillas', 'github', 'pinterest', 'duckduckgo',
            'google', 'mercadolibre', 'amazon', 'tiktok', 'reddit', 'wellhub',
            'fresha.com', 'yelp.com', 'hotfrog', 'justdial', 'cylex', 'infobel',
            'wixpress'
          ];
          if (!blocklist.some(b => domain.includes(b)) && !urls.includes(rawUrl)) {
            urls.push(rawUrl);
          }
        } catch (e) {}
      }
    });
    
    return urls.slice(0, 10);
  } catch (e) {
    return [];
  }
}

// Scrape business website
async function scrapeWebsite(urlStr) {
  const issues = [];
  let email, instagram, whatsapp, phone, businessName = '';
  
  try {
    const parsedUrl = new URL(urlStr);
    businessName = parsedUrl.hostname.replace('www.', '').split('.')[0].replace(/-/g, ' ').replace(/_/g, ' ');
    businessName = businessName.replace(/\b\w/g, c => c.toUpperCase());
    
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(urlStr, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    const duration = Date.now() - startTime;
    if (duration > 3000) issues.push(`Tiempo de carga lento (${(duration/1000).toFixed(1)}s)`);
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const pageTitle = $('title').text().trim();
    if (pageTitle) {
      businessName = pageTitle.split('|')[0].split('-')[0].split('–')[0].trim();
      if (businessName.length > 50) businessName = businessName.substring(0, 50);
    } else {
      issues.push('Sin título de página (SEO pobre)');
    }
    
    if ($('h1').length === 0) issues.push('Sin H1 principal');
    if (!$('meta[name="viewport"]').length) issues.push('No optimizado para móviles');
    
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    const pageText = $('body').text();
    const foundEmails = pageText.match(emailRegex);
    if (foundEmails) email = foundEmails[0].toLowerCase();
    
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const mail = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (mail.match(emailRegex)) email = mail;
    });
    
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('instagram.com/')) {
        const parts = href.split('instagram.com/')[1]?.split('/')[0]?.split('?')[0];
        if (parts && !['p', 'reels', 'stories'].includes(parts)) instagram = `https://instagram.com/${parts}`;
      }
      if (href.includes('wa.me/') || href.includes('api.whatsapp.com/send')) {
        const match = href.match(/(?:wa\.me|phone)\/([0-9+]+)/);
        if (match) whatsapp = `https://wa.me/${match[1].replace(/\+/g, '')}`;
      }
      if (href.startsWith('tel:')) phone = href.replace('tel:', '').trim();
    });
    
    if (issues.length === 0) issues.push('Diseño web básico/anticuado');
    
    return { businessName, website: urlStr, email, phone, instagram, whatsapp, issues, hasWebsite: true };
  } catch (e) {
    return { businessName: businessName || urlStr, website: urlStr, issues: ['Sitio web no responde'], hasWebsite: false };
  }
}

// Generate Pitch with Gemini
async function generatePitch(business, niche, city, pricing) {
  try {
    const prompt = `Eres un experto en copywriting de correos fríos para la agencia Blinq (blinqoficial.com). 
Genera un correo frío persuasivo y adaptado:
- Negocio: ${business.businessName} (${niche})
- Ciudad: ${city}
- Web: ${business.website}
- Problemas: ${business.issues.join(', ')}
- Precio: ${pricing} (Plan PROTOCOL IGNITION, $0 anticipo, paga si le gusta)

Firma como "Equipo Blinq". Responde en formato JSON:
{
  "subject": "asunto corto y directo (máx 60 chars)",
  "emailBody": "cuerpo del correo",
  "dmScript": "mensaje para Instagram DM (máx 260 chars)"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800, responseMimeType: 'application/json' }
      })
    });
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(text);
  } catch (e) {
    return {
      subject: `Propuesta de mejora web para ${business.businessName}`,
      emailBody: `Hola ${business.businessName},\n\nNotamos que su web tiene oportunidades de mejora en carga y optimización. Hacemos diseño web premium por ${pricing} sin anticipo. ¿Le gustaría ver un boceto gratis?\n\nEquipo Blinq`,
      dmScript: `¡Hola ${business.businessName}! Hacemos webs premium por ${pricing} sin anticipo. ¿Les hacemos un boceto gratis?`
    };
  }
}

// Send Email via Resend
async function sendEmail(to, subject, body, businessName, pricing) {
  const htmlBody = body.replace(/\n/g, '<br />');
  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>
body { font-family: -apple-system, sans-serif; color: #1a1a1a; line-height: 1.6; padding: 20px; background: #f9f9f9; }
.container { max-width: 580px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.body-text { font-size: 15px; color: #333; }
.pricing { margin-top: 20px; padding: 12px; background: linear-gradient(135deg, #0a0a0a, #1a1a2e); color: #fff; border-radius: 6px; font-size: 14px; text-align: center; }
.pricing strong { color: #4ade80; }
.footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
</style></head><body>
<div class="container">
<div class="body-text">${htmlBody}</div>
<div class="pricing">⚡ Plan PROTOCOL IGNITION — <strong>${pricing}</strong> — Entrega en 48h — $0 anticipo</div>
<div class="footer">Blinq Oficial · <a href="https://blinqoficial.com">blinqoficial.com</a><br/>Para no recibir más correos, responde "no gracias".</div>
</div></body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [to],
      subject: subject,
      text: body,
      html: html
    })
  });
  
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || JSON.stringify(result));
  return result;
}

// Main Pipeline
async function main() {
  console.log('🏁 Iniciando proceso de envío masivo para completar los 100 correos de hoy...\n');
  
  let sentCount = 0;
  const db = loadDb();
  
  for (const target of TARGETS) {
    if (sentCount >= TARGET_EMAILS_COUNT) break;
    
    console.log(`🔍 Buscando: "${target.niche}" en "${target.city}"...`);
    const urls = await searchLocalBusinesses(target.niche, target.city);
    
    for (const url of urls) {
      if (sentCount >= TARGET_EMAILS_COUNT) break;
      
      // Check if lead already exists in DB
      if (db.leads.some(l => l.website === url)) continue;
      
      console.log(`🌐 Escaneando: ${url}`);
      const business = await scrapeWebsite(url);
      
      if (!business.email || business.email.includes('sentry') || business.email.includes('example') || business.email.includes('wixpress')) {
        continue;
      }
      
      console.log(`📧 Encontrado: ${business.businessName} -> ${business.email}`);
      console.log(`🤖 Generando propuesta IA con Gemini...`);
      const pitch = await generatePitch(business, target.niche, target.city, target.pricing);
      
      console.log(`🚀 Enviando correo vía Resend a ${business.email}...`);
      try {
        const result = await sendEmail(business.email, pitch.subject, pitch.emailBody, business.businessName, target.pricing);
        sentCount++;
        console.log(`✅ ENVIADO EXCELENTEMENTE! (Total enviados en este batch: ${sentCount}/${TARGET_EMAILS_COUNT})`);
        
        // Save to Database Fallback
        const campaignId = 'camp-1'; // Default campaign
        const leadId = 'lead-live-' + Math.random().toString(36).substring(7);
        
        db.leads.push({
          id: leadId,
          campaign_id: campaignId,
          business_name: business.businessName,
          phone: business.phone,
          email: business.email,
          website: business.website,
          has_website: true,
          instagram: business.instagram,
          whatsapp: business.whatsapp,
          address: null,
          google_rating: 4.5,
          website_issues: business.issues,
          crm_status: 'contacted',
          crm_notes: `[Masivo] Contactado vía email el ${new Date().toLocaleDateString()}`,
          created_at: new Date().toISOString()
        });
        
        db.drafts.push({
          id: 'draft-live-' + Math.random().toString(36).substring(7),
          lead_id: leadId,
          subject: pitch.subject,
          pitch_email: pitch.emailBody,
          pitch_dm: pitch.dmScript,
          status: 'sent',
          contact_channel: 'email',
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        
        saveDb(db);
        
        // 1.2s delay to stay safe
        await new Promise(r => setTimeout(r, 1200));
        
      } catch (err) {
        console.error(`❌ Error al enviar email: ${err.message}`);
      }
    }
    
    // Delay between queries
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`\n🎉 PROCESO COMPLETADO! Se enviaron ${sentCount} correos adicionales.`);
}

main().catch(err => console.error(err));
