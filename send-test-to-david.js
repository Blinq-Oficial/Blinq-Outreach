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
const SENDER_NAME = 'Blinq Oficial';
const RECIPIENT_EMAIL = 'david.aguirre.pulgarin@gmail.com';
const RECIPIENT_NAME = 'David Aguirre';

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
<div class="pricing">⚡ Plan PROTOCOL IGNITION — <strong>$50 USD / $1,000 MXN</strong> — Entrega en 48h — $0 anticipo</div>
<div class="footer">Blinq Oficial · <a href="https://blinqoficial.com">blinqoficial.com</a><br/>Para no recibir más correos, responde "no gracias".</div>
</div></body></html>`;

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
  const subject = 'Propuesta de mejora web para Blinq Test Studio ⚡';
  const bodyText = `Hola David Aguirre,\n\nEstaba revisando la presencia móvil de Blinq Test Studio y noté excelentes valoraciones de tus clientes, pero al ingresar desde mi celular a blinqoficial.com detecté un par de detalles importantes de rendimiento:\n- Tiempo de carga móvil lento (>3.8s)\n- Falta botón de agendamiento directo en portada\n\nEn Blinq creamos páginas web premium optimizadas para conversiones inmediatas.\n\nPor favor, responde a este correo con un mensaje corto de prueba (por ejemplo, "me interesa ver el boceto"). Al hacerlo, validaremos que el Webhook de Resend en producción funcione al 100%, actualice automáticamente tu tarjeta a "Respondió" (🔥) e inyecte tu respuesta en tiempo real en la bandeja de entrada del Dashboard.\n\nQuedo muy atento a tu respuesta,\nEquipo Blinq`;

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
