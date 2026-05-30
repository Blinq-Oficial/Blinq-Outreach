/**
 * Script: Enviar Correo de Prueba a David para Testear Inbound Webhooks
 * 
 * Este script registra a David Aguirre como un lead activo en la base de datos local
 * y le envía un correo real de prospección a su email personal via Resend.
 * Al responder a este correo desde su cuenta personal, el webhook de Resend se disparará
 * a producción, lo que actualizará de forma automática su estado a "Respondió" (🔥).
 */

const RESEND_API_KEY = 're_6FDNPXWp_BTCte5UrKDo2Uc6x4T3eAxr1';
const SENDER_EMAIL = 'contacto@blinqoficial.com';
const SENDER_NAME = 'Blinq';
const RECIPIENT_EMAIL = 'david.aguirre.pulgarin@gmail.com';
const RECIPIENT_NAME = 'David';

const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'database_fallback.json');

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  return { campaigns: [], leads: [], drafts: [], replies: [] };
}

function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function sendOutreachEmail(to, subject, bodyText) {
  const htmlBody = bodyText.replace(/\n/g, '<br />');
  const html = `
<!DOCTYPE html><html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7; line-height: 1.6; padding: 40px 20px; background-color: #09090b; margin: 0; }
.container { max-width: 580px; margin: 0 auto; background: #121214; border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.06); }
.header { text-align: center; margin-bottom: 32px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 24px; }
.logo-img { width: 120px; height: auto; display: inline-block; }
.heading { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; margin-bottom: 20px; }
.body-text { font-size: 15px; color: #a1a1aa; margin-bottom: 24px; }
.bullet-list { list-style: none; padding-left: 0; margin: 20px 0; }
.bullet-item { display: flex; items-center: center; gap: 10px; margin-bottom: 12px; font-size: 14.5px; color: #d4d4d8; }
.bullet-icon { color: #ec4899; font-weight: bold; }
.mockup-showcase { margin: 28px 0; padding: 20px; background: rgba(168, 85, 247, 0.04); border: 1px dashed rgba(168, 85, 247, 0.3); border-radius: 12px; text-align: center; }
.mockup-title { font-size: 14px; font-weight: 700; color: #c084fc; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.mockup-desc { font-size: 13.5px; color: #a1a1aa; }
.pricing-block { margin-top: 32px; padding: 24px; background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); border-radius: 12px; border: 1px solid rgba(168, 85, 247, 0.2); text-align: center; box-shadow: 0 4px 20px rgba(168, 85, 247, 0.15); }
.pricing-title { font-size: 13px; font-weight: 800; color: #c084fc; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
.pricing-value { font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -0.03em; margin: 8px 0; }
.pricing-value span { font-size: 14px; color: #a1a1aa; font-weight: 500; }
.pricing-benefit { font-size: 13.5px; color: #34d399; font-weight: 600; margin-top: 8px; }
.footer { margin-top: 36px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11px; color: #71717a; text-align: center; }
.footer a { color: #c084fc; text-decoration: none; font-weight: 600; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <img src="https://blinq-outreach.vercel.app/logo.png" alt="Blinq" class="logo-img">
  </div>
  
  <h2 class="heading">Propuesta de Optimización Móvil y Presencia IA</h2>
  
  <div class="body-text">
    Hola David,<br/><br/>
    Estaba analizando la presencia móvil de <strong>Blinq Test Studio</strong> y noté excelentes valoraciones de tus clientes, pero al ingresar desde dispositivos móviles a su portal detectamos un par de detalles importantes de rendimiento:
    
    <ul class="bullet-list">
      <li class="bullet-item"><span class="bullet-icon">⚡</span> Tiempo de carga móvil lento (>3.8s), lo que causa pérdidas de visitas.</li>
      <li class="bullet-item"><span class="bullet-icon">📱</span> Diseño responsivo mejorable para facilitar la reserva directa de citas.</li>
      <li class="bullet-item"><span class="bullet-icon">🤖</span> Falta de optimización de código para búsquedas por Inteligencia Artificial (SGE / ChatGPT).</li>
    </ul>
  </div>
  
  <div class="mockup-showcase">
    <div class="mockup-title">🎁 Regalo de Pre-Operación</div>
    <div class="mockup-desc">
      Hemos diseñado un <strong>boceto visual interactivo en Figma</strong> totalmente personalizado para tu marca, sin costo ni compromiso alguno. ¿Te gustaría ver el enlace del boceto? Responde a este correo y te lo comparto de inmediato.
    </div>
  </div>

  <div class="pricing-block">
    <div class="pricing-title">PLAN PROTOCOL IGNITION</div>
    <div class="pricing-value">$50 <span>USD</span></div>
    <div class="pricing-benefit">✓ Entrega en 48 Horas · Código Puro (Sin WordPress) · $0 Pago Inicial</div>
  </div>
  
  <div class="footer">
    Enviado por Blinq · <a href="https://blinqoficial.com">blinqoficial.com</a><br/>
    Para dejar de recibir estas propuestas, responde "no gracias".
  </div>
</div>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [to],
      reply_to: 'reply@enteayon.resend.app',
      subject: subject,
      text: bodyText,
      html: html
    })
  });
  
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || JSON.stringify(result));
  return result;
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  BLINQ OUTREACH — ENVÍO DE TEST DE WEBHOOK        ║');
  console.log('║  Prueba real de Inbound con David Aguirre         ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const db = loadDb();
  
  // 1. Clean up duplicate mock/lalalala leads from local database to keep it extremely organized
  const originalCount = db.leads.length;
  db.leads = db.leads.filter(l => l.email && !l.email.includes('lalalala') && !l.business_name.includes('Lalalala'));
  const cleanedCount = originalCount - db.leads.length;
  if (cleanedCount > 0) {
    console.log(`🧹 Base de datos optimizada: se removieron ${cleanedCount} leads mock/de prueba de la base de datos local.`);
  }

  // 2. Register David as a lead if he doesn't exist
  let lead = db.leads.find(l => l.email === RECIPIENT_EMAIL);
  const leadId = lead ? lead.id : 'lead-david-test';

  if (!lead) {
    lead = {
      id: leadId,
      campaign_id: 'camp-1',
      business_name: 'Blinq Test Studio',
      phone: '+57 300 123 4567',
      email: RECIPIENT_EMAIL,
      website: 'https://blinqoficial.com',
      has_website: true,
      instagram: 'https://instagram.com/blinq_oficial',
      whatsapp: 'https://wa.me/573001234567',
      address: null,
      google_rating: 4.9,
      website_issues: ['Tiempo de carga lento móvil (>3.8s)', 'Falta botón de agendamiento directo', 'Falta etiqueta Meta Title'],
      crm_status: 'lead',
      crm_notes: '[Webhook Test] Creado para verificar la recepción de correos.',
      created_at: new Date().toISOString()
    };
    db.leads.push(lead);
    console.log(`📌 Registrado lead de prueba: ${RECIPIENT_NAME} <${RECIPIENT_EMAIL}>`);
  }

  // 3. Send real email via Resend
  const subject = 'Propuesta de optimización móvil para Blinq Test Studio ⚡';
  const bodyText = `Hola David,\n\nEstaba analizando la presencia móvil de Blinq Test Studio y noté excelentes valoraciones de tus clientes, pero al ingresar desde dispositivos móviles a su portal detectamos un par de detalles importantes de rendimiento:\n- Tiempo de carga móvil lento (>3.8s)\n- Diseño responsivo mejorable para facilitar la reserva directa de citas\n- Falta de optimización de código para búsquedas por Inteligencia Artificial (SGE / ChatGPT)\n\nHemos diseñado un boceto visual interactivo en Figma totalmente personalizado para tu marca, sin costo ni compromiso alguno. ¿Te gustaría ver el enlace del boceto? Responde a este correo y te lo comparto de inmediato.\n\nQuedo muy atento a tu respuesta,\nEquipo Blinq`;

  console.log(`📡 Enviando correo de prospección real a: ${RECIPIENT_EMAIL}...`);
  try {
    const resendRes = await sendOutreachEmail(RECIPIENT_EMAIL, subject, bodyText);
    console.log(`🎉 CORREO ENVIADO CON ÉXITO! Resend ID: ${resendRes.id}`);

    // Update lead status to contacted and save DB
    lead.crm_status = 'contacted';
    lead.crm_notes = `[Webhook Test] Correo enviado vía Resend el ${new Date().toLocaleDateString()}.\n` + lead.crm_notes;
    
    // Save draft
    db.drafts.push({
      id: 'draft-david-test',
      lead_id: leadId,
      subject: subject,
      pitch_email: bodyText,
      pitch_dm: '',
      status: 'sent',
      contact_channel: 'email',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    saveDb(db);
    console.log(`💾 Base de datos fallback actualizada con estatus 'contacted'.`);
    console.log(`\n👉 Revisa tu Gmail (${RECIPIENT_EMAIL}), responde al correo de prueba y observa cómo se actualiza tu Kanban!\n`);

  } catch (err) {
    console.error(`❌ Error al enviar correo de prueba: ${err.message}`);
  }
}

main().catch(err => console.error(err));
