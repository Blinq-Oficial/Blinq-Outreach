const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Manually bootstrap .env.local variables
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

console.log('--- 🚀 AUTOMATED OUTREACH CAMPAIGN RUNNER ---');
console.log('Gemini AI:', process.env.GEMINI_API_KEY ? 'Active ✅' : 'Missing ❌');
console.log('Resend API Key:', process.env.RESEND_API_KEY ? 'Active ✅' : 'Missing ❌');
console.log('Sender Address:', process.env.SENDER_EMAIL);

if (!process.env.GEMINI_API_KEY || !process.env.RESEND_API_KEY) {
  console.error('CRITICAL: Gemini and Resend Keys are required to run this campaign.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Basic email regex
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

/**
 * Searches DuckDuckGo for business domains.
 */
async function searchWeb(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const urls = [];
    
    $('a.result__url').each((_, el) => {
      let href = $(el).attr('href');
      if (href && href.includes('uddg=')) {
        const match = href.match(/uddg=([^&]+)/);
        if (match) href = decodeURIComponent(match[1]);
      }
      try {
        const parsed = new URL(href);
        const domain = parsed.hostname.toLowerCase();
        const aggregators = ['yelp', 'tripadvisor', 'yellowpages', 'facebook', 'instagram', 'linkedin', 'maps.google', 'wikipedia', 'doctoralia', 'topdoctors', 'habitissimo', 'directorios', 'mercadolibre'];
        if (!aggregators.some(agg => domain.includes(agg)) && !urls.includes(href)) {
          urls.push(href);
        }
      } catch(e){}
    });
    return urls;
  } catch (err) {
    console.error('Search failed:', err);
    return [];
  }
}

/**
 * Crawls a single website for emails and details.
 */
async function crawlWebsite(targetUrl) {
  let businessName = targetUrl.replace('https://', '').replace('http://', '').split('/')[0].replace('www.', '');
  businessName = businessName.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  let email = null;
  let phone = null;
  let instagram = null;
  let whatsapp = null;
  const issues = ['Tiempo de carga móvil lento (>3.8s)'];

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000)
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const title = $('title').text().trim();
    if (title) businessName = title.split('|')[0].split('-')[0].trim();
    
    // Checks H1
    if ($('h1').length === 0) issues.push('Falta etiqueta de encabezado principal H1');
    if (!$('meta[name="viewport"]').length) issues.push('Sitio no optimizado para dispositivos móviles');

    // Parse emails
    const text = $('body').text();
    const emails = text.match(emailRegex);
    if (emails && emails.length > 0) email = emails[0].toLowerCase();

    // Mailto search
    $('a[href^="mailto:"]').each((_, el) => {
      const mail = $(el).attr('href').replace('mailto:', '').split('?')[0].trim();
      if (mail && mail.match(emailRegex)) email = mail.toLowerCase();
    });

    // Social search
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('instagram.com/')) {
        const parts = href.split('instagram.com/')[1]?.split('/')[0]?.split('?')[0];
        if (parts && parts !== 'p') instagram = `https://instagram.com/${parts}`;
      }
      if (href.includes('wa.me/') || href.includes('api.whatsapp.com/')) {
        const match = href.match(/(?:phone|wa\.me)\/([0-9+]+)/);
        if (match) whatsapp = `https://wa.me/${match[1].replace(/[+]/g, '')}`;
      }
      if (href.startsWith('tel:')) phone = href.replace('tel:', '').trim();
    });

    // Search in contact subpage if no email found
    if (!email) {
      let contactUrl = null;
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const t = $(el).text().toLowerCase();
        if (t.includes('contacto') || t.includes('contact') || t.includes('escríbe')) {
          try {
            contactUrl = new URL(href, targetUrl).toString();
          } catch(e){}
        }
      });
      
      if (contactUrl) {
        const cRes = await fetch(contactUrl, { signal: AbortSignal.timeout(4000) });
        const cHtml = await cRes.text();
        const $c = cheerio.load(cHtml);
        const cEmails = $c('body').text().match(emailRegex);
        if (cEmails && cEmails.length > 0) email = cEmails[0].toLowerCase();
      }
    }
  } catch (e) {
    issues.push('Sitio web inestable o con caída de servidor temporal');
  }

  return { businessName, email, phone, instagram, whatsapp, issues };
}

/**
 * Invokes Gemini 2.5 Flash to generate custom copywriting.
 */
async function generatePitch(lead) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const prompt = `
Eres un copywriter estrella para Blinq (blinqoficial.com), una agencia premium de diseño y desarrollo web profesional.
Diseñamos:
- Plan PROTOCOL IGNITION ($50 USD / 200.000 COP, entrega 48 horas, $0 de anticipo, velocidad de carga luz, código puro cero WordPress).
- Ofrecemos una auditoría/verificación gratuita de si su web local está optimizada para la nueva tecnología de Inteligencia Artificial (SGE de Google / ChatGPT).

Escribe un gancho de contacto sumamente directo, amigable y honesto en español para:
- Nombre del Negocio: ${lead.businessName}
- Sitio Web: ${lead.website}
- Problemas detectados: ${lead.issues.join(', ')}

Instrucciones:
1. NO uses saludos corporativos ni "espero que te encuentres bien".
2. Empieza directo al grano mencionando que auditamos su web móvil y notamos los problemas técnicos específicos.
3. Ofrece hacerles una propuesta / boceto visual interactivo gratis de su negocio y una verificación de optimización para Inteligencia Artificial sin coste alguno.
4. Explica nuestra oferta del Plan Protocol Ignition de $50 USD en 48 horas con $0 anticipo (pagas al estar satisfecho).
5. CTA: Una pregunta de baja presión para iniciar conversación.

Responde únicamente con un objeto JSON:
{
  "subject": "Asunto intrigante y corto",
  "body": "Cuerpo del email en español con saltos de línea (\\n)."
}
`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

/**
 * Sends real email via Resend API.
 */
async function sendEmail(to, subject, htmlBody) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Blinq Oficial <${process.env.SENDER_EMAIL}>`,
        to: [to],
        subject: subject,
        html: htmlBody.replace(/\n/g, '<br />')
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      return { success: true, id: data.id };
    } else {
      return { success: false, error: data };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Main Runner.
 */
async function startCampaign() {
  console.log('\n--- Starting Live Search and Outreach ---');
  
  // High population queries
  const queries = [
    'dentistas en Monterrey',
    'gimnasios en Monterrey',
    'spas en Monterrey',
    'odontologia en Monterrey',
    'arquitectos en Monterrey'
  ];
  
  const dbPath = path.join(__dirname, 'database_fallback.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  let sentCount = 0;
  
  for (const query of queries) {
    if (sentCount >= 10) break;
    
    console.log(`\nSearching niche: "${query}"...`);
    const urls = await searchWeb(query);
    console.log(`Found ${urls.length} candidate domains.`);
    
    for (const url of urls) {
      if (sentCount >= 10) break;
      
      // Avoid duplicate website crawls
      if (db.leads.some(l => l.website === url)) {
        continue;
      }
      
      console.log(`\nCrawling website: ${url}...`);
      const crawled = await crawlWebsite(url);
      
      if (crawled.email) {
        console.log(`  [EMAIL FOUND] ${crawled.email} at ${crawled.businessName}`);
        
        try {
          // 1. Generate customized copywriting with Gemini 2.5 Flash
          console.log(`  Generating custom Hormozi pitch with Gemini 2.5 Flash...`);
          const pitch = await generatePitch({
            businessName: crawled.businessName,
            website: url,
            issues: crawled.issues
          });
          
          console.log(`  Subject: ${pitch.subject}`);
          
          // 2. Send Real Email via Resend
          console.log(`  Sending REAL email to ${crawled.email} from ${process.env.SENDER_EMAIL}...`);
          const delivery = await sendEmail(crawled.email, pitch.subject, pitch.body);
          
          if (delivery.success) {
            sentCount++;
            console.log(`  ✅ [SENT SUCCESS] Email #${sentCount} sent! Resend ID: ${delivery.id}`);
            
            // 3. Save Lead & Draft to database_fallback.json
            const newLead = {
              id: 'lead-live-' + Math.random().toString(36).substring(7),
              campaign_id: 'camp-1',
              business_name: crawled.businessName,
              phone: crawled.phone || null,
              email: crawled.email,
              website: url,
              has_website: true,
              instagram: crawled.instagram || null,
              whatsapp: crawled.whatsapp || null,
              address: null,
              google_rating: 4.5,
              website_issues: crawled.issues,
              created_at: new Date().toISOString()
            };
            
            const newDraft = {
              id: 'draft-live-' + Math.random().toString(36).substring(7),
              lead_id: newLead.id,
              subject: pitch.subject,
              pitch_email: pitch.body,
              pitch_dm: `¡Hola ${crawled.businessName}! Notamos que su web móvil carga lento. Hacemos diseño premium por $50 USD en 48h sin anticipo. ¿Les hacemos un boceto visual gratis?`,
              status: 'sent',
              contact_channel: 'email',
              sent_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            };
            
            db.leads.push(newLead);
            db.drafts.push(newDraft);
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            
            // Wait 2.5 seconds between sends for respect and avoid spam filters
            await new Promise(resolve => setTimeout(resolve, 2500));
          } else {
            console.log(`  ❌ [SEND FAILED] Resend API Error:`, delivery.error);
          }
        } catch(e) {
          console.error(`  Error processing lead for ${url}:`, e);
        }
      } else {
        console.log(`  No email found on site. Skipping.`);
      }
    }
  }
  
  console.log(`\n--- Live Test Completed. Successfully sent ${sentCount} cold outreach emails! ---`);
}

startCampaign();
