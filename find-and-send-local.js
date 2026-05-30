/**
 * Script: Buscar empresas pequeñas/locales con alta probabilidad 
 * y enviarles correos via Resend inmediatamente
 * 
 * Nichos seleccionados estratégicamente:
 * - Negocios pequeños que NECESITAN web (peluquerías, talleres, cafés, clínicas estéticas)
 * - En ciudades medianas de México y Colombia (más pequeñas = más local)
 * - Que tengan sitio web malo o lento (oportunidad clara)
 */

const RESEND_API_KEY = 're_6FDNPXWp_BTCte5UrKDo2Uc6x4T3eAxr1';
const GEMINI_API_KEY = 'AIzaSyBb9CNDiKwe4o52JWzy9e-kofHmIFQz_Uc';
const SENDER_EMAIL = 'contacto@blinqoficial.com';
const SENDER_NAME = 'Blinq Oficial';

// Nichos de negocios pequeños y locales con ALTA probabilidad de necesitar web
const TARGETS = [
  // Negocios pequeños en ciudades medianas de México 🇲🇽
  { niche: 'peluquerías', city: 'Querétaro', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'cafeterías de especialidad', city: 'Puebla', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'clínicas estéticas', city: 'Guadalajara', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'talleres mecánicos', city: 'León', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'estudios de yoga', city: 'Mérida', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'veterinarias', city: 'Monterrey', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'escuelas de cocina', city: 'Oaxaca', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  { niche: 'floristerías', city: 'San Luis Potosí', country: 'MX', pricing: '$50 USD / $1,000 MXN' },
  
  // Negocios pequeños en Colombia 🇨🇴
  { niche: 'barberías', city: 'Medellín', country: 'CO', pricing: '$50 USD / 200,000 COP' },
  { niche: 'estudios de fotografía', city: 'Bogotá', country: 'CO', pricing: '$50 USD / 200,000 COP' },
  { niche: 'tiendas de ropa boutique', city: 'Cali', country: 'CO', pricing: '$50 USD / 200,000 COP' },
  { niche: 'restaurantes locales', city: 'Cartagena', country: 'CO', pricing: '$50 USD / 200,000 COP' },
  
  // Negocios hispanos en USA 🇺🇸
  { niche: 'taquerías mexicanas', city: 'Houston', country: 'US', pricing: '$50 USD' },
  { niche: 'auto detail shops', city: 'Miami', country: 'US', pricing: '$50 USD' },
  { niche: 'lavanderías', city: 'San Antonio', country: 'US', pricing: '$50 USD' },
];

const cheerio = require('cheerio');

// ──────────────────────────────────────────
// 1. Search DuckDuckGo for business websites
// ──────────────────────────────────────────
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
    
    if (!response.ok) throw new Error(`DDG ${response.status}`);
    
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
            'dentavacation', 'dentalia', 'wixpress'
          ];
          if (!blocklist.some(b => domain.includes(b)) && !urls.includes(rawUrl)) {
            urls.push(rawUrl);
          }
        } catch (e) {}
      }
    });
    
    return urls.slice(0, 8);
  } catch (e) {
    console.error(`   ❌ Search error: ${e.message}`);
    return [];
  }
}

// ──────────────────────────────────────────
// 2. Crawl a business website for contact info
// ──────────────────────────────────────────
async function scrapeWebsite(urlStr) {
  const issues = [];
  let email, instagram, whatsapp, phone, businessName = '';
  
  try {
    const parsedUrl = new URL(urlStr);
    businessName = parsedUrl.hostname.replace('www.', '').split('.')[0].replace(/-/g, ' ').replace(/_/g, ' ');
    businessName = businessName.replace(/\b\w/g, c => c.toUpperCase());
    
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    
    const response = await fetch(urlStr, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    const duration = Date.now() - startTime;
    if (duration > 3500) issues.push(`Tiempo de carga lento (${(duration/1000).toFixed(1)}s)`);
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const pageTitle = $('title').text().trim();
    if (pageTitle) {
      businessName = pageTitle.split('|')[0].split('-')[0].split('–')[0].trim();
      if (businessName.length > 60) businessName = businessName.substring(0, 60);
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
    
    // Try contact page
    if (!email) {
      const contactLinks = [];
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().toLowerCase();
        if (text.includes('contact') || text.includes('contacto')) {
          try { contactLinks.push(new URL(href, urlStr).toString()); } catch (e) {}
        }
      });
      
      if (contactLinks[0]) {
        try {
          const cr = await fetch(contactLinks[0], { signal: AbortSignal.timeout(4000) });
          const ch = await cr.text();
          const $c = cheerio.load(ch);
          const ce = $c('body').text().match(emailRegex);
          if (ce) email = ce[0].toLowerCase();
          $c('a[href^="mailto:"]').each((_, el) => {
            const m = ($c(el).attr('href') || '').replace('mailto:', '').split('?')[0].trim().toLowerCase();
            if (m.match(emailRegex)) email = m;
          });
        } catch (e) {}
      }
    }
    
    if (issues.length === 0) issues.push('Diseño web básico/anticuado');
    
    return { businessName, website: urlStr, email, phone, instagram, whatsapp, issues, hasWebsite: true };
  } catch (e) {
    return { businessName: businessName || urlStr, website: urlStr, issues: ['Sitio web no responde'], hasWebsite: false };
  }
}

// ──────────────────────────────────────────
// 3. Generate pitch with Gemini
// ──────────────────────────────────────────
async function generatePitch(business, niche, city, pricing) {
  try {
    const prompt = `Eres un experto en copywriting de correos fríos para una agencia de diseño web premium llamada "Blinq" (blinqoficial.com). 

Genera un correo frío PERSONALIZADO y persuasivo para este negocio:
- Nombre del negocio: ${business.businessName}
- Nicho: ${niche}
- Ciudad: ${city}
- Su sitio web: ${business.website}
- Problemas detectados: ${business.issues.join(', ')}
- Precio del plan: ${pricing} (Plan PROTOCOL IGNITION, entrega en 48h, $0 anticipo, solo paga si está satisfecho)

REGLAS:
1. Empieza con "Hola" + nombre del negocio
2. Menciona algo ESPECÍFICO que observaste en su web (el problema real detectado)
3. Ofrece un boceto visual interactivo GRATIS en Figma sin compromiso
4. Ofrece verificación gratuita de optimización para IA (SGE de Google / ChatGPT)
5. Menciona el precio EXACTO: ${pricing}
6. El tono debe ser profesional pero amigable, como un vecino experto que quiere ayudar
7. Firma como "Equipo Blinq"
8. NO uses markdown ni asteriscos. Solo texto plano
9. Máximo 200 palabras

Responde en formato JSON:
{
  "subject": "asunto corto y atractivo (máx 60 chars)",
  "emailBody": "cuerpo del correo",
  "dmScript": "mensaje ultra corto para Instagram DM (máx 280 chars)"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 1024, responseMimeType: 'application/json' }
      })
    });
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(text);
  } catch (e) {
    return {
      subject: `Propuesta de diseño web para ${business.businessName}`,
      emailBody: `Hola ${business.businessName},\n\nNotamos que su sitio web tiene oportunidades de mejora. En Blinq creamos sitios web premium por ${pricing}, entrega en 48h, sin anticipo. ¿Le gustaría ver un boceto visual gratis?\n\nEquipo Blinq`,
      dmScript: `¡Hola ${business.businessName}! Hacemos diseño web premium por ${pricing} en 48h sin anticipo. ¿Les hacemos un boceto visual gratis?`
    };
  }
}

// ──────────────────────────────────────────
// 4. Send email via Resend
// ──────────────────────────────────────────
async function sendEmail(to, subject, body, businessName, pricing) {
  const htmlBody = body.replace(/\n/g, '<br />');
  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; line-height: 1.7; margin: 0; padding: 20px; background: #f8f8f8; }
.container { max-width: 580px; margin: 0 auto; background: #fff; border-radius: 10px; padding: 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.body-text { font-size: 15px; color: #333; }
.pricing { margin-top: 24px; padding: 14px 18px; background: linear-gradient(135deg, #0a0a0a, #1a1a2e); color: #fff; border-radius: 8px; font-size: 14px; text-align: center; }
.pricing strong { color: #4ade80; }
.footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
.footer a { color: #6366f1; text-decoration: none; }
</style></head><body>
<div class="container">
<div class="body-text">${htmlBody}</div>
<div class="pricing">⚡ Plan PROTOCOL IGNITION — <strong>${pricing}</strong> — Entrega en 48h — $0 anticipo</div>
<div class="footer"><a href="https://blinqoficial.com">blinqoficial.com</a> · Blinq Oficial<br/>Si no deseas recibir más correos, simplemente responde "no gracias".</div>
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

// ──────────────────────────────────────────
// 5. Main Pipeline
// ──────────────────────────────────────────
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  BLINQ OUTREACH — Búsqueda de Negocios Locales  ║');
  console.log('║  Enfocado en empresas pequeñas con alta prob.    ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  const allResults = [];
  let totalSent = 0;
  let totalErrors = 0;
  let totalFound = 0;
  
  for (const target of TARGETS) {
    console.log(`\n🔍 Buscando: "${target.niche}" en ${target.city} (${target.country})...`);
    
    const urls = await searchLocalBusinesses(target.niche, target.city);
    console.log(`   📋 ${urls.length} sitios web encontrados`);
    
    for (const url of urls) {
      console.log(`   🌐 Escaneando: ${url.substring(0, 60)}...`);
      const business = await scrapeWebsite(url);
      totalFound++;
      
      if (!business.email) {
        console.log(`   ⚠️  Sin email — saltando: ${business.businessName}`);
        continue;
      }
      
      // Filter out generic/sentry/internal emails
      if (business.email.includes('sentry') || business.email.includes('noreply') || 
          business.email.includes('wixpress') || business.email.includes('wordpress') ||
          business.email.includes('example.com')) {
        console.log(`   ⚠️  Email genérico/sentry — saltando: ${business.email}`);
        continue;
      }
      
      console.log(`   ✅ ${business.businessName} — ${business.email}`);
      console.log(`      Problemas: ${business.issues.join(', ')}`);
      
      // Generate personalized pitch
      console.log(`   🤖 Generando pitch con Gemini...`);
      const pitch = await generatePitch(business, target.niche, target.city, target.pricing);
      
      // Send email
      console.log(`   📧 Enviando correo a ${business.email}...`);
      try {
        const result = await sendEmail(
          business.email, 
          pitch.subject, 
          pitch.emailBody, 
          business.businessName, 
          target.pricing
        );
        totalSent++;
        allResults.push({
          business: business.businessName,
          email: business.email,
          niche: target.niche,
          city: target.city,
          subject: pitch.subject,
          status: '✅ ENVIADO',
          resendId: result.id
        });
        console.log(`   🎉 ENVIADO — ID: ${result.id}`);
      } catch (e) {
        totalErrors++;
        allResults.push({
          business: business.businessName,
          email: business.email,
          niche: target.niche,
          city: target.city,
          status: '❌ ERROR',
          error: e.message
        });
        console.log(`   ❌ Error: ${e.message}`);
      }
      
      // Rate limit — 1.2s between sends
      await new Promise(r => setTimeout(r, 1200));
    }
    
    // 2s between search queries
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // ──────────────────────────────────────────
  // Final Report
  // ──────────────────────────────────────────
  console.log('\n\n╔═══════════════════════════════════════════════════╗');
  console.log('║              REPORTE FINAL                        ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║ 🔍 Sitios web escaneados:  ${totalFound}`);
  console.log(`║ 📧 Correos enviados:       ${totalSent}`);
  console.log(`║ ❌ Errores:                ${totalErrors}`);
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  console.log('📋 Detalle de envíos:');
  console.table(allResults.map(r => ({
    Negocio: (r.business || '').substring(0, 30),
    Email: (r.email || '').substring(0, 30),
    Nicho: r.niche,
    Ciudad: r.city,
    Estado: r.status
  })));
  
  // Save results to file
  const fs = require('fs');
  const resultsFile = `outreach-results-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify({ 
    date: new Date().toISOString(),
    totalScanned: totalFound,
    totalSent, 
    totalErrors, 
    results: allResults 
  }, null, 2));
  console.log(`\n💾 Resultados guardados en: ${resultsFile}`);
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
